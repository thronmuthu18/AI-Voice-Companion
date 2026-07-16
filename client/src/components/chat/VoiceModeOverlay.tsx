import { useState, useEffect, useRef } from "react";
import { useMessageStore } from "../../stores/message.store";
import { useChatStore } from "../../stores/chat.store";
import AiPresence from "../ui/AiPresence";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  VolumeX,
  X,
  PhoneOff,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { voiceService } from "../../services/voice.service";

interface VoiceModeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

type VoiceState =
  | "IDLE"
  | "CONNECTING"
  | "REQUESTING_MICROPHONE"
  | "LISTENING"
  | "USER_SPEAKING"
  | "PROCESSING_SPEECH"
  | "THINKING"
  | "AI_SPEAKING"
  | "INTERRUPTED"
  | "MUTED"
  | "ERROR";

// Helper to split text into complete sentences, avoiding breaking technical terms
function extractSentences(text: string, isLast = false, isTamil = false, textBufferRef?: React.MutableRefObject<string>): string[] {
  const sanitized = text
    .replace(/Node\.js/gi, "Node_js_marker")
    .replace(/Express\.js/gi, "Express_js_marker")
    .replace(/React\.js/gi, "React_js_marker");

  // Split on standard punctuation followed by whitespace
  const parts = sanitized.split(/(?<=[.?!。！？\n])\s+/);

  const sentences: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    let part = parts[i].trim();
    if (!part) continue;

    part = part
      .replace(/Node_js_marker/g, "Node.js")
      .replace(/Express_js_marker/g, "Express.js")
      .replace(/React_js_marker/g, "React.js");

    // If it's the last part and we're not finishing the stream, wait for standard punctuation
    if (!isLast && i === parts.length - 1) {
      const endsWithPunct = /[.?!。！？\n]$/.test(part);
      
      // Tamil specific chunking optimization: if no punctuation but buffer gets long
      if (!endsWithPunct && isTamil && part.length > 65) {
        const words = part.split(/\s+/);
        if (words.length > 3) {
          const lastWord = words.pop() || "";
          const completePhrase = words.join(" ");
          sentences.push(completePhrase);
          
          // Re-update current text buffer with the trailing incomplete word
          if (textBufferRef) {
            textBufferRef.current = lastWord;
          }
          break;
        }
      }

      if (!endsWithPunct) {
        break;
      }
    }
    sentences.push(part);
  }
  return sentences;
}

// Clean formatting tags, markdown symbols, emoji names, URLs for natural pronunciation
function cleanSentenceText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "") // remove code blocks
    .replace(/`[^`]*`/g, "")       // remove inline code
    .replace(/[*_#~]/g, "")        // remove markdown tags
    .replace(/\[\d+\]/g, "")       // remove reference brackets e.g. [1]
    .replace(/\bhttps?:\/\/\S+/gi, "") // remove URLs
    .replace(/[👇👉👋🤖🎨]/gu, "")  // remove layout emojis
    .replace(/\s+/g, " ")          // normalize spaces
    .trim();
}

// Detect dominant language for chunk speech synthesis
function detectDominantLanguage(text: string): "ta-IN" | "en-US" {
  const tamilChars = text.match(/[\u0B80-\u0BFF]/g);
  const tamilCount = tamilChars ? tamilChars.length : 0;
  return tamilCount > 2 ? "ta-IN" : "en-US";
}

export default function VoiceModeOverlay({ isOpen, onClose }: VoiceModeOverlayProps) {
  const { currentChat, createChat, fetchChats } = useChatStore();
  const { messages, sendMessage } = useMessageStore();

  const [state, setState] = useState<VoiceState>("IDLE");
  const [errorMessage, setErrorMessage] = useState("");
  
  // Authoritative transcript registers
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  
  const [isMuted, setIsMuted] = useState(false);
  
  // Voice Engine settings: Realtime (OpenAI WebRTC), Standard (Browser synthesis)
  const [voiceModeType, setVoiceModeType] = useState<"Standard" | "Realtime">((() => {
    return (localStorage.getItem("champai_voice_mode_type") as "Standard" | "Realtime") || "Standard";
  })());

  // Voice Language Preference settings: Auto, Tamil, English
  const [voiceLang, setVoiceLang] = useState(() => {
    return localStorage.getItem("champai_voice_lang") || "Auto";
  });
  
  // Device voice quality notice message state
  const [voiceNotice, setVoiceNotice] = useState("");

  // Refs for standard fallback
  const recognitionRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const silenceTimeoutRef = useRef<any>(null);
  const aiSpeakingSafetyTimeoutRef = useRef<any>(null);
  const currentSpeechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Latency metrics tracking
  const speechEndTimeRef = useRef<number>(0);
  const requestStartTimeRef = useRef<number>(0);
  const firstTokenTimeRef = useRef<number>(0);
  const firstAudioTimeRef = useRef<number>(0);

  // Authoritative session control variables
  const activeResponseIdRef = useRef<string>("");
  const currentStreamTextRef = useRef<string>("");
  const sentenceQueueRef = useRef<string[]>([]);
  const spokenSentenceIndicesRef = useRef<Set<number>>(new Set());
  const activeUtteranceIndexRef = useRef<number>(-1);
  const isStreamFinishedRef = useRef<boolean>(false);
  const recognitionSessionIdRef = useRef<string>("");

  // WebRTC Native Realtime refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastUserTranscriptRef = useRef<string>("");
  const lastAssistantTranscriptRef = useRef<string>("");

  // Keep refs of values needed in async callbacks to prevent closures on stale state
  const stateRef = useRef<VoiceState>(state);
  const isMutedRef = useRef<boolean>(isMuted);
  const chatRef = useRef<any>(currentChat);
  const finalTranscriptRef = useRef(finalTranscript);
  const interimTranscriptRef = useRef(interimTranscript);
  const voiceLangRef = useRef(voiceLang);
  const voiceModeTypeRef = useRef(voiceModeType);

  // Progressive assistant text state shown in Voice Modal during stream
  const [fullAssistantText, setFullAssistantText] = useState("");

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    chatRef.current = currentChat;
  }, [currentChat]);

  useEffect(() => {
    finalTranscriptRef.current = finalTranscript;
  }, [finalTranscript]);

  useEffect(() => {
    interimTranscriptRef.current = interimTranscript;
  }, [interimTranscript]);

  useEffect(() => {
    voiceLangRef.current = voiceLang;
  }, [voiceLang]);

  useEffect(() => {
    voiceModeTypeRef.current = voiceModeType;
  }, [voiceModeType]);

  // Audio element setup for WebRTC playout
  useEffect(() => {
    const audio = document.createElement("audio");
    audio.autoplay = true;
    remoteAudioRef.current = audio;
    return () => {
      audio.srcObject = null;
      audio.remove();
      remoteAudioRef.current = null;
    };
  }, []);

  // Telemetry logger
  const logTelemetry = (event: string, details?: any) => {
    const timestamp = new Date().toISOString();
    console.log(
      `%c[Voice Telemetry] %c${event}%c: ${JSON.stringify(details || "")} at ${timestamp}`,
      "color: #10b981; font-weight: bold;",
      "color: #f59e0b; font-weight: bold;",
      "color: #94a3b8;"
    );
  };

  // Main voice conversation state machine triggers on open/close
  useEffect(() => {
    if (isOpen) {
      startVoiceSession();
    } else {
      endVoiceSession();
    }

    return () => {
      endVoiceSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Detect platform device layout
  const isDesktop = !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  const cancelSpeechPlaybacks = (reason: string) => {
    logTelemetry("speech_cancel_reason", { reason });
    window.speechSynthesis.cancel();
    currentSpeechUtteranceRef.current = null;
  };

  const startVoiceSession = async () => {
    logTelemetry("start_voice_session", { isDesktop });
    if (voiceModeTypeRef.current === "Realtime") {
      await startRealtimeVoiceSession();
    } else {
      await startStandardVoiceSession();
    }
  };

  // ----------------------------------------------------
  // NATIVE REALTIME VOICE SESSION (WebRTC Flow)
  // ----------------------------------------------------
  const startRealtimeVoiceSession = async () => {
    setState("CONNECTING");
    setErrorMessage("");
    setFinalTranscript("");
    setInterimTranscript("");
    setFullAssistantText("");
    setVoiceNotice("");
    lastUserTranscriptRef.current = "";
    lastAssistantTranscriptRef.current = "";

    try {
      // 1. Fetch ephemeral connection credentials from backend
      const config = await voiceService.getRealtimeSession();
      if (!config.enabled || !config.clientSecret) {
        logTelemetry("realtime_session_disabled_fallback");
        setVoiceNotice("Standard Voice Mode active. Realtime engine is offline.");
        setVoiceModeType("Standard");
        localStorage.setItem("champai_voice_mode_type", "Standard");
        await startStandardVoiceSession();
        return;
      }

      // 2. Configure PeerConnection
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // Subscribe to remote audio track playout
      pc.ontrack = (e) => {
        logTelemetry("webrtc_track_received");
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = e.streams[0];
        }
      };

      // 3. Prompt mic access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStreamRef.current = stream;
      pc.addTrack(stream.getTracks()[0]);

      // 4. Create WebRTC data channel
      const dc = pc.createDataChannel("oai-events");
      dataChannelRef.current = dc;

      dc.onopen = () => {
        logTelemetry("webrtc_datachannel_opened");
        setState("LISTENING");

        // Send model instructions and turn detection rules
        const instructions =
          "You are Champ.ai, a helpful AI voice companion. Always respond in the dominant language used by the user (Tamil, Tanglish, or English). Keep your responses natural, friendly, and concise (1-3 sentences maximum). Avoid overly formal textbook Tamil. Do not translate tech terms (Node.js, React, MongoDB, JWT).";

        const sessionUpdate = {
          type: "session.update",
          session: {
            modalities: ["audio", "text"],
            instructions,
            voice: "alloy",
            input_audio_transcription: {
              model: "whisper-1",
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 1200,
            },
          },
        };
        dc.send(JSON.stringify(sessionUpdate));
      };

      dc.onmessage = (e) => {
        const serverEvent = JSON.parse(e.data);
        handleRealtimeEvent(serverEvent);
      };

      // 5. Initiate WebRTC offer exchange
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-mini-realtime-preview-2024-12-17";
      const response = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${config.clientSecret}`,
          "Content-Type": "application/sdp",
        },
      });

      if (!response.ok) {
        throw new Error("WebRTC offer handshake failed");
      }

      const sdpAnswer = await response.text();
      const answer = {
        type: "answer",
        sdp: sdpAnswer,
      };
      await pc.setRemoteDescription(answer as any);
      logTelemetry("webrtc_session_handshake_complete");

    } catch (err: any) {
      console.error("WebRTC session initialization failed:", err);
      logTelemetry("webrtc_connection_failed", { error: err.message });
      setVoiceNotice("Realtime voice failed. Falling back to Standard voice.");
      setVoiceModeType("Standard");
      localStorage.setItem("champai_voice_mode_type", "Standard");
      await startStandardVoiceSession();
    }
  };

  const handleRealtimeEvent = (event: any) => {
    switch (event.type) {
      case "session.created":
        logTelemetry("webrtc_session_created", { id: event.session?.id });
        break;

      case "input_audio_buffer.speech_started":
        logTelemetry("webrtc_speech_started");
        // True automatic barge-in: cancel AI output instantly if user interrupts
        if (stateRef.current === "AI_SPEAKING" || stateRef.current === "THINKING") {
          handleRealtimeInterrupt("CONFIRMED_USER_SPEECH");
        }
        setState("USER_SPEAKING");
        break;

      case "conversation.item.input_audio_transcription.completed":
        // Whisper user input transcript completed
        logTelemetry("webrtc_user_transcript", { transcript: event.transcript });
        lastUserTranscriptRef.current = event.transcript?.trim() || "";
        setFinalTranscript(event.transcript?.trim() || "");
        break;

      case "response.created":
        setState("THINKING");
        break;

      case "response.output_item.added":
        // Reset assistant transcript block
        lastAssistantTranscriptRef.current = "";
        setFullAssistantText("");
        break;

      case "response.audio_transcript.delta":
        // AI progressive text streams
        setState("AI_SPEAKING");
        lastAssistantTranscriptRef.current += event.delta;
        setFullAssistantText((prev) => prev + event.delta);
        break;

      case "response.done": {
        logTelemetry("webrtc_response_done");
        setState("LISTENING");

        // Save turns dynamically in database
        const userContent = lastUserTranscriptRef.current;
        const assistantContent = lastAssistantTranscriptRef.current;
        if (userContent && assistantContent) {
          saveRealtimeTurn(userContent, assistantContent);
        }
        break;
      }

      case "error":
        console.error("Realtime WebRTC socket error:", event.error);
        logTelemetry("webrtc_error", { error: event.error });
        break;
    }
  };

  const handleRealtimeInterrupt = (reason = "MANUAL_STOP") => {
    logTelemetry("webrtc_interrupted", { reason });

    // 1. Send session cancel to OpenAI WebRTC gateway
    if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
      dataChannelRef.current.send(
        JSON.stringify({
          type: "response.cancel",
        })
      );
    }

    // 2. Stop playout audio instantly
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }

    setState("LISTENING");
  };

  const saveRealtimeTurn = async (userText: string, assistantText: string) => {
    try {
      const chatId = chatRef.current?._id;
      if (!chatId) return;

      logTelemetry("save_realtime_turn", { userText, assistantText });
      await voiceService.saveRealtimeMessages(chatId, userText, assistantText);

      // Reset turn references
      lastUserTranscriptRef.current = "";
      lastAssistantTranscriptRef.current = "";

      // Refresh messages store state
      const { fetchMessages } = useMessageStore.getState();
      await fetchMessages(chatId);
    } catch (err) {
      console.error("Failed to persist WebRTC voice turn:", err);
    }
  };

  // ----------------------------------------------------
  // COMPATIBILITY FALLBACK (Standard Voice Mode)
  // ----------------------------------------------------
  const startStandardVoiceSession = async () => {
    setState("CONNECTING");
    setErrorMessage("");
    setFinalTranscript("");
    setInterimTranscript("");
    setFullAssistantText("");
    setVoiceNotice("");

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setState("ERROR");
      setErrorMessage(
        "Live speech recognition is not supported in this browser. Please use standard chat."
      );
      return;
    }

    setState("REQUESTING_MICROPHONE");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localStreamRef.current = stream;

      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;

      let targetLang = "en-US";
      if (voiceLangRef.current === "Tamil") {
        targetLang = "ta-IN";
      } else if (voiceLangRef.current === "English") {
        targetLang = "en-US";
      } else {
        targetLang = localStorage.getItem("champai_speech_lang") || "en-US";
      }

      rec.lang = targetLang;
      logTelemetry("recognition_language", { lang: targetLang });

      if (voiceLangRef.current === "Auto" && targetLang === "en-US") {
        setVoiceNotice("தமிழில் பேசுகிறீர்களா? தமிழ் mode தேர்வு செய்தால் recognition accuracy மேம்படலாம்.");
      }

      rec.onstart = () => {
        logTelemetry("recognition_started", { sessionId: recognitionSessionIdRef.current });
        if (stateRef.current === "REQUESTING_MICROPHONE" || stateRef.current === "CONNECTING") {
          setState("LISTENING");
          logTelemetry("speech_started");
        }
      };

      rec.onresult = (event: any) => {
        let accumulatedFinal = "";
        let currentInterim = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            accumulatedFinal += result[0].transcript + " ";
          } else {
            currentInterim += result[0].transcript;
          }
        }

        if (stateRef.current === "THINKING" || stateRef.current === "AI_SPEAKING" || stateRef.current === "PROCESSING_SPEECH" || isMutedRef.current) {
          return;
        }

        logTelemetry("last_tamil_result_timestamp", { timestamp: Date.now() });
        logTelemetry("interim_tamil_transcript", { currentInterim });
        if (accumulatedFinal) {
          logTelemetry("final_tamil_segment", { segment: accumulatedFinal });
          logTelemetry("accumulated_tamil_transcript", { transcript: finalTranscriptRef.current + accumulatedFinal });
          setFinalTranscript((prev) => prev + accumulatedFinal);
        }
        setInterimTranscript(currentInterim);
        setState("USER_SPEAKING");

        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          logTelemetry("silence_timer_reset");
        }

        const combinedText = (finalTranscriptRef.current + accumulatedFinal + currentInterim).trim();
        const isTamilSpeech = rec.lang.startsWith("ta");
        
        let timeoutDelay = 1400;
        if (isTamilSpeech) {
          const isTamilIncomplete = /(மற்றும்|ஆனால்|அப்புறம்|அதுக்கப்புறம்|அதனால்|எனக்கு|எப்படி|என்ன|எதுக்கு|ஏன்னா|பற்றி|வந்து|அப்படின்னா|அதாவது|இல்லாட்டி|இருந்தா|சொல்லி|சொல்லிட்டு|பண்ணி|பண்ணிட்டு|வேண்டும் என்று|என்று|ன்னு)\s*$/.test(combinedText);
          timeoutDelay = isTamilIncomplete ? 3000 : 2200;
        } else {
          const isIncomplete = /\b(and|but|or|so|because|if|when|how|what|why|who|help|create)\s*$/i.test(combinedText);
          timeoutDelay = isIncomplete ? 2200 : 1400;
        }

        silenceTimeoutRef.current = setTimeout(() => {
          const finalSpeech = (finalTranscriptRef.current + interimTranscriptRef.current).trim();
          if (finalSpeech && (stateRef.current === "USER_SPEAKING" || stateRef.current === "LISTENING")) {
            logTelemetry("turn_submission_reason", { text: finalSpeech, reason: "SILENCE_TIMEOUT" });
            handleSubmitUserSpeech(finalSpeech);
          }
        }, timeoutDelay);
        logTelemetry("silence_timer_started", { delay: timeoutDelay });
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e.error);
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setState("ERROR");
          setErrorMessage("Microphone access denied.");
        }
      };

      rec.onend = () => {
        const current = stateRef.current;
        if (!isMutedRef.current && (current === "LISTENING" || current === "USER_SPEAKING")) {
          try {
            recognitionRef.current?.start();
          } catch (err) {
            // ignore running
          }
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      setState("ERROR");
      setErrorMessage("Microphone connection failed.");
    }
  };

  const handleSubmitUserSpeech = async (speechText: string) => {
    if (!speechText) {
      setState("LISTENING");
      return;
    }

    const responseId = crypto.randomUUID();
    activeResponseIdRef.current = responseId;

    speechEndTimeRef.current = Date.now();
    requestStartTimeRef.current = Date.now();
    firstTokenTimeRef.current = 0;
    firstAudioTimeRef.current = 0;
    logTelemetry("submitted_tamil_transcript", { text: speechText, responseId });

    currentStreamTextRef.current = "";
    sentenceQueueRef.current = [];
    spokenSentenceIndicesRef.current.clear();
    activeUtteranceIndexRef.current = -1;
    isStreamFinishedRef.current = false;
    
    setFinalTranscript("");
    setInterimTranscript("");
    setFullAssistantText("");
    setVoiceNotice("");

    setState("THINKING");

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // already stopped
      }
    }

    try {
      let chatId = chatRef.current?._id;

      if (!chatId) {
        const newChat = await createChat("Voice Chat");
        chatId = newChat._id;
        await fetchChats();
      }

      await sendMessage(chatId, speechText, undefined, (token) => {
        if (activeResponseIdRef.current !== responseId) return;
        handleStreamToken(token, responseId);
      });

      if (activeResponseIdRef.current !== responseId) return;

      isStreamFinishedRef.current = true;
      logTelemetry("assistant_stream_completed", { responseId });
      
      const isTamil = recognitionRef.current?.lang?.startsWith("ta");
      const finalSentences = extractSentences(currentStreamTextRef.current, true, isTamil, currentStreamTextRef);
      for (const sent of finalSentences) {
        if (!sentenceQueueRef.current.includes(sent)) {
          sentenceQueueRef.current.push(sent);
          logTelemetry("tts_chunk_enqueued", { text: sent, index: sentenceQueueRef.current.length - 1 });
        }
      }

      checkQueueFinished(responseId);

    } catch (err: any) {
      if (activeResponseIdRef.current !== responseId) return;
      setState("ERROR");
      setErrorMessage("Service is temporarily offline.");
    }
  };

  const handleStreamToken = (token: string, responseId: string) => {
    if (firstTokenTimeRef.current === 0) {
      firstTokenTimeRef.current = Date.now();
    }

    setFullAssistantText((prev) => prev + token);
    currentStreamTextRef.current += token;

    const isTamil = recognitionRef.current?.lang?.startsWith("ta");
    const sentences = extractSentences(currentStreamTextRef.current, false, isTamil, currentStreamTextRef);
    
    let added = false;
    for (const sent of sentences) {
      if (!sentenceQueueRef.current.includes(sent)) {
        sentenceQueueRef.current.push(sent);
        logTelemetry("tts_chunk_enqueued", { text: sent, index: sentenceQueueRef.current.length - 1 });
        added = true;
      }
    }

    if (added) {
      playNextSentenceInQueue(responseId);
    }
  };

  const playNextSentenceInQueue = (responseId: string) => {
    if (activeResponseIdRef.current !== responseId) return;
    if (currentSpeechUtteranceRef.current) return;

    const nextIndex = activeUtteranceIndexRef.current + 1;
    if (nextIndex >= sentenceQueueRef.current.length) {
      checkQueueFinished(responseId);
      return;
    }

    const nextSentence = sentenceQueueRef.current[nextIndex];
    activeUtteranceIndexRef.current = nextIndex;

    const cleanText = cleanSentenceText(nextSentence);
    if (!cleanText) {
      spokenSentenceIndicesRef.current.add(nextIndex);
      playNextSentenceInQueue(responseId);
      return;
    }

    setState("AI_SPEAKING");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = detectDominantLanguage(cleanText);

    const voices = window.speechSynthesis.getVoices();
    const matchingVoices = voices.filter(
      (v) =>
        v.lang.startsWith(utterance.lang) ||
        v.lang.startsWith(utterance.lang.substring(0, 2))
    );

    if (utterance.lang.startsWith("ta") && matchingVoices.length === 0) {
      setVoiceNotice("இந்த device-ல் high-quality Tamil voice கிடைக்கவில்லை. Tamil pronunciation device-ஐ பொறுத்து மாறலாம்.");
    }

    const bestVoice =
      matchingVoices.find((v) => v.name.toLowerCase().includes("google")) ||
      matchingVoices.find((v) => v.name.toLowerCase().includes("microsoft")) ||
      matchingVoices.find((v) => v.name.toLowerCase().includes("natural")) ||
      matchingVoices[0];

    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    utterance.onstart = () => {
      if (activeResponseIdRef.current !== responseId) return;
      logTelemetry("tts_chunk_started", { text: cleanText, index: nextIndex });
    };

    utterance.onend = () => {
      if (activeResponseIdRef.current !== responseId) return;
      spokenSentenceIndicesRef.current.add(nextIndex);
      currentSpeechUtteranceRef.current = null;
      if (aiSpeakingSafetyTimeoutRef.current) clearTimeout(aiSpeakingSafetyTimeoutRef.current);
      playNextSentenceInQueue(responseId);
    };

    utterance.onerror = () => {
      if (activeResponseIdRef.current !== responseId) return;
      spokenSentenceIndicesRef.current.add(nextIndex);
      currentSpeechUtteranceRef.current = null;
      if (aiSpeakingSafetyTimeoutRef.current) clearTimeout(aiSpeakingSafetyTimeoutRef.current);
      playNextSentenceInQueue(responseId);
    };

    currentSpeechUtteranceRef.current = utterance;

    const estimatedDuration = cleanText.length * 150 + 5000;
    if (aiSpeakingSafetyTimeoutRef.current) clearTimeout(aiSpeakingSafetyTimeoutRef.current);
    aiSpeakingSafetyTimeoutRef.current = setTimeout(() => {
      if (stateRef.current === "AI_SPEAKING" && activeUtteranceIndexRef.current === nextIndex && activeResponseIdRef.current === responseId) {
        cancelSpeechPlaybacks("TTS_SAFETY_TIMEOUT");
        playNextSentenceInQueue(responseId);
      }
    }, estimatedDuration);

    window.speechSynthesis.speak(utterance);
  };

  const checkQueueFinished = (responseId: string) => {
    if (activeResponseIdRef.current !== responseId) return;

    if (isStreamFinishedRef.current && activeUtteranceIndexRef.current >= sentenceQueueRef.current.length - 1) {
      if (!currentSpeechUtteranceRef.current) {
        resumeListening();
      }
    }
  };

  const resumeListening = () => {
    if (isMutedRef.current) {
      setState("MUTED");
      return;
    }

    setState("LISTENING");
    setFinalTranscript("");
    setInterimTranscript("");

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // ignore running
      }
    }
  };

  const handleStandardInterrupt = (source = "MANUAL_STOP") => {
    if (stateRef.current === "AI_SPEAKING" || stateRef.current === "THINKING") {
      setState("INTERRUPTED");
      cancelSpeechPlaybacks(source);
      
      if (aiSpeakingSafetyTimeoutRef.current) clearTimeout(aiSpeakingSafetyTimeoutRef.current);

      activeResponseIdRef.current = "";
      sentenceQueueRef.current = [];
      activeUtteranceIndexRef.current = -1;
      
      resumeListening();
    }
  };

  // ----------------------------------------------------
  // GENERAL CONTROLS AND CLEANUPS
  // ----------------------------------------------------
  const handleInterrupt = (source = "MANUAL_STOP") => {
    if (voiceModeType === "Realtime") {
      handleRealtimeInterrupt(source);
    } else {
      handleStandardInterrupt(source);
    }
  };

  const endVoiceSession = () => {
    setState("IDLE");

    // Close WebRTC active traces
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    // Deregister concurrent active session from backend database tracker
    if (voiceModeType === "Realtime") {
      voiceService.closeRealtimeSession().catch(() => {});
    }

    // Standard cleans
    cancelSpeechPlaybacks("SESSION_ENDED");
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    if (aiSpeakingSafetyTimeoutRef.current) clearTimeout(aiSpeakingSafetyTimeoutRef.current);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // already stopped
      }
      recognitionRef.current = null;
    }
  };

  const handleModeChange = (mode: "Standard" | "Realtime") => {
    setVoiceModeType(mode);
    localStorage.setItem("champai_voice_mode_type", mode);
    logTelemetry("voice_mode_changed", { mode });

    // Restart active voice session using new settings config
    endVoiceSession();
    setTimeout(() => {
      startVoiceSession();
    }, 300);
  };

  const handleLanguageChange = (lang: string) => {
    setVoiceLang(lang);
    localStorage.setItem("champai_voice_lang", lang);
    logTelemetry("language_changed", { language: lang });

    // Restart session using new voice settings
    endVoiceSession();
    setTimeout(() => {
      startVoiceSession();
    }, 250);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (nextMuted) {
      setState("MUTED");
      if (voiceModeType === "Realtime") {
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks()[0].enabled = false;
        }
      } else {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {
            // already stopped
          }
        }
      }
    } else {
      setState("LISTENING");
      if (voiceModeType === "Realtime") {
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks()[0].enabled = true;
        }
      } else {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            // already started
          }
        }
      }
    }
  };

  const getStatusText = () => {
    switch (state) {
      case "CONNECTING":
        return "Connecting...";
      case "REQUESTING_MICROPHONE":
        return "Requesting microphone access...";
      case "LISTENING":
        return voiceModeType === "Realtime"
          ? "Realtime Mode Online..."
          : voiceLang === "Tamil" || (voiceLang === "Auto" && localStorage.getItem("champai_speech_lang") === "ta-IN")
          ? "Listening in Tamil..."
          : "Listening in English...";
      case "USER_SPEAKING":
        return "Listening...";
      case "THINKING":
        return "Champ.ai is thinking...";
      case "PROCESSING_SPEECH":
        return "Understanding...";
      case "AI_SPEAKING":
        return "Champ.ai is speaking...";
      case "INTERRUPTED":
        return "Interrupted";
      case "MUTED":
        return "Microphone muted";
      case "ERROR":
        return "Session error";
      default:
        return "Idle";
    }
  };

  const getOrbState = (): "idle" | "thinking" | "streaming" | "listening" | "error" => {
    switch (state) {
      case "LISTENING":
      case "USER_SPEAKING":
        return "listening";
      case "THINKING":
      case "PROCESSING_SPEECH":
        return "thinking";
      case "AI_SPEAKING":
        return "streaming";
      case "ERROR":
        return "error";
      default:
        return "idle";
    }
  };

  const visibleMessages = messages.filter(
    (m) => m.role === "user" || m.role === "assistant"
  );

  const displayTranscript = (finalTranscript + " " + interimTranscript).trim();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 dark:bg-slate-950/98 backdrop-blur-2xl px-6 py-8"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between max-w-4xl w-full mx-auto mb-6">
            <div className="flex items-center gap-2 text-blue-500">
              <Sparkles size={20} className="animate-pulse" />
              <span className="text-sm font-black tracking-widest uppercase">Champ.ai Voice</span>
            </div>

            {/* Language and Engine Selector Dropdowns */}
            <div className="flex items-center gap-4">
              {/* Engine Toggle */}
              <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-xl px-2.5 py-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Engine:</span>
                <select
                  value={voiceModeType}
                  onChange={(e) => handleModeChange(e.target.value as any)}
                  className="bg-transparent text-xs text-blue-400 font-bold outline-none cursor-pointer"
                >
                  <option value="Realtime" className="bg-slate-950 text-white">Realtime</option>
                  <option value="Standard" className="bg-slate-950 text-white">Standard</option>
                </select>
              </div>

              {/* Language Toggle (only active in Standard mode) */}
              {voiceModeType === "Standard" && (
                <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-xl px-2.5 py-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lang:</span>
                  <select
                    value={voiceLang}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="bg-transparent text-xs text-blue-400 font-bold outline-none cursor-pointer"
                  >
                    <option value="Auto" className="bg-slate-950 text-white">Auto</option>
                    <option value="Tamil" className="bg-slate-950 text-white">தமிழ்</option>
                    <option value="English" className="bg-slate-950 text-white">English</option>
                  </select>
                </div>
              )}

              <button
                onClick={onClose}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-900 hover:text-white transition"
                title="Close Voice Mode"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Core Content Layout */}
          <div className="flex-1 flex flex-col items-center justify-center max-w-2xl w-full mx-auto space-y-8 select-none">
            {/* Animated Morphing 3D Sphere Orb container */}
            <div
              className="relative cursor-pointer group flex items-center justify-center"
              onClick={() => handleInterrupt("ORB_TAP")}
              title={state === "AI_SPEAKING" ? "Tap to interrupt" : undefined}
            >
              {/* Backlight pulsing glow */}
              <div
                className={`absolute inset-0 rounded-full blur-3xl transition duration-500 scale-90 group-hover:scale-100 ${
                  state === "ERROR"
                    ? "bg-red-500/20"
                    : state === "THINKING"
                    ? "bg-purple-600/25"
                    : state === "AI_SPEAKING"
                    ? "bg-indigo-600/35"
                    : state === "LISTENING" || state === "USER_SPEAKING"
                    ? "bg-blue-600/30"
                    : "bg-blue-500/10"
                }`}
              />

              {/* Three.js Morphing Sphere */}
              <div className="relative z-10 transition duration-300 transform group-hover:scale-105 active:scale-95">
                <AiPresence state={getOrbState()} size={160} />
              </div>
            </div>

            {/* Status & Live Transcription block */}
            <div className="text-center w-full max-w-lg min-h-[64px]">
              <p
                className={`text-xs font-semibold uppercase tracking-wider ${
                  state === "ERROR"
                    ? "text-red-500"
                    : state === "AI_SPEAKING"
                    ? "text-indigo-400"
                    : "text-blue-500"
                }`}
              >
                {getStatusText()}
              </p>

              {/* Live Preview text */}
              <p className="mt-3 text-sm text-slate-400 font-medium italic min-h-[20px] px-4 truncate max-w-full">
                {interimTranscript || (state === "LISTENING" ? "champ, suggest a movie..." : "")}
              </p>
            </div>

            {/* Non-blocking Device Voice Notice Banner */}
            {voiceNotice && (
              <div className="rounded-2xl border border-blue-900/30 bg-blue-950/10 p-3 max-w-md w-full flex items-start gap-2.5">
                <Sparkles className="text-blue-400 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-slate-400 leading-relaxed text-left">{voiceNotice}</p>
              </div>
            )}

            {/* Safe feedback alert banner */}
            {state === "ERROR" && errorMessage && (
              <div className="rounded-2xl border border-red-900/35 bg-red-950/20 p-4 max-w-md w-full flex items-start gap-3">
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                <div className="text-left">
                  <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider">Voice Error</h4>
                  <p className="text-sm text-slate-350 mt-1 leading-relaxed">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Scrollable Conversation Transcript panel */}
            <div className="w-full max-w-lg bg-slate-900/40 border border-slate-900 rounded-2xl p-4 h-48 overflow-y-auto space-y-3.5 backdrop-blur-sm select-text">
              {visibleMessages.length === 0 && !displayTranscript && !fullAssistantText ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs font-semibold">
                  Transcripts will appear here
                </div>
              ) : (
                <>
                  {visibleMessages.map((msg, i) => (
                    <div
                      key={`msg-${i}`}
                      className={`flex flex-col ${
                        msg.role === "user" ? "items-end" : "items-start"
                      }`}
                    >
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {msg.role === "user" ? "You" : "Champ.ai"}
                      </span>
                      <span
                        className={`mt-1 text-sm rounded-xl px-3 py-1.5 leading-relaxed max-w-[85%] ${
                          msg.role === "user"
                            ? "bg-blue-600/10 text-blue-400 border border-blue-600/20"
                            : "bg-slate-900 text-slate-300 border border-slate-800/80"
                        }`}
                      >
                        {msg.content}
                      </span>
                    </div>
                  ))}

                  {/* Show live dictation if user is currently speaking */}
                  {displayTranscript && (state === "LISTENING" || state === "USER_SPEAKING") && (
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        You (Speaking...)
                      </span>
                      <span className="mt-1 text-sm rounded-xl px-3 py-1.5 leading-relaxed max-w-[85%] bg-blue-600/10 text-blue-400 border border-blue-600/20 opacity-70">
                        {displayTranscript}
                      </span>
                    </div>
                  )}

                  {/* Show live stream response if assistant is generating/speaking */}
                  {fullAssistantText && (state === "THINKING" || state === "AI_SPEAKING") && (
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Champ.ai
                      </span>
                      <span className="mt-1 text-sm rounded-xl px-3 py-1.5 leading-relaxed max-w-[85%] bg-slate-900 text-slate-300 border border-slate-800/80">
                        {fullAssistantText}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Bottom Call Controls bar */}
          <div className="max-w-md w-full mx-auto flex items-center justify-center gap-6 mt-6">
            {/* Toggle Mute Button */}
            <button
              onClick={toggleMute}
              className={`rounded-full p-4 border transition duration-200 hover:scale-105 active:scale-95 ${
                isMuted
                  ? "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
              }`}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            {/* End Call / Return to Chat Button */}
            <button
              onClick={onClose}
              className="rounded-full p-4 bg-red-600 text-white hover:bg-red-500 hover:scale-105 active:scale-95 shadow-lg transition duration-200"
              title="End Voice Conversation"
            >
              <PhoneOff size={22} />
            </button>

            {/* Stop Speaking / Interruption button */}
            <button
              onClick={() => handleInterrupt("STOP_BUTTON")}
              disabled={state !== "AI_SPEAKING"}
              className={`rounded-full p-4 border transition duration-200 hover:scale-105 active:scale-95 ${
                state === "AI_SPEAKING"
                  ? "bg-slate-900 border-slate-800 text-white hover:border-slate-700"
                  : "bg-slate-950 border-slate-900 text-slate-700 cursor-not-allowed opacity-40"
              }`}
              title="Stop Speaking"
            >
              <VolumeX size={22} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
