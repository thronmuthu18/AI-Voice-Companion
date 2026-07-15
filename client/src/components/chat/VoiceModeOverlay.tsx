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
function extractSentences(text: string, isLast = false): string[] {
  let sanitized = text
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
    .replace(/[👇👉👋🤖🎨]/g, "")  // remove layout emojis
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
  const [speechLang] = useState(() => {
    return localStorage.getItem("champai_speech_lang") || "en-US";
  });

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

  // Keep refs of values needed in async callbacks to prevent closures on stale state
  const stateRef = useRef<VoiceState>(state);
  const isMutedRef = useRef<boolean>(isMuted);
  const chatRef = useRef<any>(currentChat);
  const finalTranscriptRef = useRef(finalTranscript);
  const interimTranscriptRef = useRef(interimTranscript);

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
  }, [isOpen]);

  const startVoiceSession = async () => {
    setState("CONNECTING");
    setErrorMessage("");
    setFinalTranscript("");
    setInterimTranscript("");
    setFullAssistantText("");

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setState("ERROR");
      setErrorMessage(
        "Live speech recognition is not supported in this browser. Please use a supported browser (Chrome, Edge) or continue in text mode."
      );
      return;
    }

    setState("REQUESTING_MICROPHONE");

    try {
      // Prompt microphone permissions explicitly
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localStreamRef.current = stream;

      // Initialize speech recognition
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = speechLang;

      rec.onstart = () => {
        if (stateRef.current === "REQUESTING_MICROPHONE" || stateRef.current === "CONNECTING") {
          setState("LISTENING");
          logTelemetry("speech_start_timestamp");
        }
      };

      rec.onresult = (event: any) => {
        // Ignore speech inputs if thinking or the AI is speaking (prevents echo loopback)
        if (stateRef.current === "THINKING" || stateRef.current === "AI_SPEAKING" || stateRef.current === "PROCESSING_SPEECH" || isMutedRef.current) {
          return;
        }

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

        logTelemetry("last_speech_result_timestamp", { accumulatedFinal, currentInterim });

        if (accumulatedFinal) {
          setFinalTranscript((prev) => prev + accumulatedFinal);
        }
        setInterimTranscript(currentInterim);
        setState("USER_SPEAKING");

        // Reset existing silence detection timer
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }

        // Adaptive end-of-turn detection
        const combinedText = (finalTranscriptRef.current + accumulatedFinal + currentInterim).trim();
        // Check if the current phrase ends in incomplete connectives or question structures
        const isIncomplete = /\b(and|but|or|so|because|if|when|how|what|why|who|help|create|செய்|எப்படி|என்ன|ஏன்|ஆனா|மற்றும்)\s*$/i.test(combinedText);
        const timeoutDelay = isIncomplete ? 2200 : 1400; // longer timeout for natural pauses / incomplete thoughts

        silenceTimeoutRef.current = setTimeout(() => {
          const finalSpeech = (finalTranscriptRef.current + interimTranscriptRef.current).trim();
          if (finalSpeech && (stateRef.current === "USER_SPEAKING" || stateRef.current === "LISTENING")) {
            logTelemetry("end_of_turn_detected_timestamp", { text: finalSpeech });
            handleSubmitUserSpeech(finalSpeech);
          }
        }, timeoutDelay);
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition service error:", e.error);
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setState("ERROR");
          setErrorMessage("Microphone access was denied. Please check your system/browser settings.");
        }
      };

      rec.onend = () => {
        // Microphone auto-restarts ONLY when actively in LISTENING or USER_SPEAKING modes
        // Never auto-start recognition while AI is speaking (prevents audio ducking/playback cancellation)
        const current = stateRef.current;
        if (!isMutedRef.current && (current === "LISTENING" || current === "USER_SPEAKING")) {
          try {
            recognitionRef.current?.start();
          } catch (err) {
            // SpeechRecognition is already running
          }
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      console.error("Microphone capture failed:", err);
      setState("ERROR");
      setErrorMessage("Microphone permission denied. Access is required for Voice Mode.");
    }
  };

  const endVoiceSession = () => {
    setState("IDLE");

    // Cancel speech synthesis
    cancelSpeechPlaybacks("SESSION_ENDED");

    // Clear active timeouts
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    if (aiSpeakingSafetyTimeoutRef.current) clearTimeout(aiSpeakingSafetyTimeoutRef.current);

    // Stop mic stream tracks completely
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Stop recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
  };

  const cancelSpeechPlaybacks = (reason: string) => {
    logTelemetry("speech_cancel_reason", { reason });
    window.speechSynthesis.cancel();
    currentSpeechUtteranceRef.current = null;
  };

  const handleSubmitUserSpeech = async (speechText: string) => {
    if (!speechText) {
      setState("LISTENING");
      return;
    }

    // Allocate a unique response ID for this conversation turn
    const responseId = crypto.randomUUID();
    activeResponseIdRef.current = responseId;

    // Start timing telemetry
    requestStartTimeRef.current = Date.now();
    firstTokenTimeRef.current = 0;
    firstAudioTimeRef.current = 0;
    logTelemetry("backend_request_timestamp", { responseId });

    // Reset sentence queue parameters
    currentStreamTextRef.current = "";
    sentenceQueueRef.current = [];
    spokenSentenceIndicesRef.current.clear();
    activeUtteranceIndexRef.current = -1;
    isStreamFinishedRef.current = false;
    
    // Clear transcripts and update display states
    setFinalTranscript("");
    setInterimTranscript("");
    setFullAssistantText("");

    setState("THINKING");

    // Stop speech recognition immediately to prevent OS level audio ducking
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    try {
      let chatId = chatRef.current?._id;

      // Auto-create chat if none selected
      if (!chatId) {
        const newChat = await createChat("Voice Chat");
        chatId = newChat._id;
        await fetchChats();
      }

      // Stream response token-by-token directly using custom onToken callback
      await sendMessage(chatId, speechText, undefined, (token) => {
        // Discard tokens if the user has interrupted or moved to a new turn
        if (activeResponseIdRef.current !== responseId) return;
        handleStreamToken(token, responseId);
      });

      if (activeResponseIdRef.current !== responseId) return;

      isStreamFinishedRef.current = true;
      logTelemetry("assistant_stream_completed", { responseId });
      
      // Flush out any remaining trailing text in stream buffer
      const finalSentences = extractSentences(currentStreamTextRef.current, true);
      for (const sent of finalSentences) {
        if (!sentenceQueueRef.current.includes(sent)) {
          sentenceQueueRef.current.push(sent);
          logTelemetry("tts_chunk_enqueued", { text: sent, index: sentenceQueueRef.current.length - 1 });
        }
      }

      // Check if queue has finished playing
      checkQueueFinished(responseId);

    } catch (err: any) {
      console.error("Error generating voice response:", err);
      // Discard errors if the user has interrupted or moved to a new turn
      if (activeResponseIdRef.current !== responseId) return;

      setState("ERROR");
      if (err.code === "APP_DAILY_QUOTA_EXCEEDED") {
        setErrorMessage("You have reached your daily text/chat limits. Please upgrade to Pro.");
      } else {
        setErrorMessage("Connection lost. Voice Mode is temporarily unavailable.");
      }
    }
  };

  const handleStreamToken = (token: string, responseId: string) => {
    // Record time to first token
    if (firstTokenTimeRef.current === 0) {
      firstTokenTimeRef.current = Date.now();
      logTelemetry("first_ai_token_timestamp", { latencyMs: firstTokenTimeRef.current - requestStartTimeRef.current });
    }

    // Append to authoritative progressive text
    setFullAssistantText((prev) => prev + token);
    currentStreamTextRef.current += token;

    // Extract newly completed sentences from stream
    const sentences = extractSentences(currentStreamTextRef.current, false);
    
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
    // Discard playbacks if the session response has changed
    if (activeResponseIdRef.current !== responseId) return;

    // If currently speaking, wait for active sentence onend trigger
    if (currentSpeechUtteranceRef.current) {
      return;
    }

    // Find the next index to play
    const nextIndex = activeUtteranceIndexRef.current + 1;
    logTelemetry("tts_queue_length", { length: sentenceQueueRef.current.length, nextIndex });
    
    // Check if next sentence exists in queue
    if (nextIndex >= sentenceQueueRef.current.length) {
      checkQueueFinished(responseId);
      return;
    }

    const nextSentence = sentenceQueueRef.current[nextIndex];
    activeUtteranceIndexRef.current = nextIndex;

    const cleanText = cleanSentenceText(nextSentence);
    if (!cleanText) {
      // Discard empty chunk and go next
      spokenSentenceIndicesRef.current.add(nextIndex);
      playNextSentenceInQueue(responseId);
      return;
    }

    // Mark active state
    setState("AI_SPEAKING");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = detectDominantLanguage(cleanText);

    const voices = window.speechSynthesis.getVoices();
    const matchingVoices = voices.filter(
      (v) =>
        v.lang.startsWith(utterance.lang) ||
        v.lang.startsWith(utterance.lang.substring(0, 2))
    );

    const bestVoice =
      matchingVoices.find((v) => v.name.toLowerCase().includes("google")) ||
      matchingVoices.find((v) => v.name.toLowerCase().includes("microsoft")) ||
      matchingVoices.find((v) => v.name.toLowerCase().includes("natural")) ||
      matchingVoices[0];

    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    // Measure time to first audio output
    utterance.onstart = () => {
      if (activeResponseIdRef.current !== responseId) return;
      
      logTelemetry("tts_chunk_started", { text: cleanText, index: nextIndex });

      if (firstAudioTimeRef.current === 0) {
        firstAudioTimeRef.current = Date.now();
        logTelemetry("first_tts_start_timestamp", { latencyMs: firstAudioTimeRef.current - requestStartTimeRef.current });
        
        // Calculate latency metrics
        const speechEndToRequest = requestStartTimeRef.current - speechEndTimeRef.current;
        const requestToFirstToken = firstTokenTimeRef.current - requestStartTimeRef.current;
        const firstTokenToFirstAudio = firstAudioTimeRef.current - firstTokenTimeRef.current;
        const totalLatency = firstAudioTimeRef.current - speechEndTimeRef.current;

        console.log(
          `%c[Voice Mode Latency Report]\n` +
          `  - speech_end_to_request_ms: ${speechEndToRequest}ms\n` +
          `  - request_to_first_token_ms: ${requestToFirstToken}ms\n` +
          `  - first_token_to_first_audio_ms: ${firstTokenToFirstAudio}ms\n` +
          `  - total_voice_response_latency_ms: ${totalLatency}ms`,
          "color: #3b82f6; font-weight: bold; font-size: 11px;"
        );
      }
    };

    utterance.onend = () => {
      if (activeResponseIdRef.current !== responseId) return;

      logTelemetry("tts_chunk_completed", { index: nextIndex });
      spokenSentenceIndicesRef.current.add(nextIndex);
      currentSpeechUtteranceRef.current = null;
      if (aiSpeakingSafetyTimeoutRef.current) clearTimeout(aiSpeakingSafetyTimeoutRef.current);
      
      // Play next sentence chunk
      playNextSentenceInQueue(responseId);
    };

    utterance.onerror = (e) => {
      if (activeResponseIdRef.current !== responseId) return;

      console.warn("Utterance playback error:", e);
      spokenSentenceIndicesRef.current.add(nextIndex);
      currentSpeechUtteranceRef.current = null;
      if (aiSpeakingSafetyTimeoutRef.current) clearTimeout(aiSpeakingSafetyTimeoutRef.current);
      
      // Proceed next
      playNextSentenceInQueue(responseId);
    };

    currentSpeechUtteranceRef.current = utterance;

    // Safety timeout: prevent synthesis locking on mobile
    const estimatedDuration = cleanText.length * 150 + 5000; // 150ms per character + 5s buffer
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
        logTelemetry("assistant_character_count", { length: currentStreamTextRef.current.length });
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
    
    // Clear display transcripts for next turn
    setFinalTranscript("");
    setInterimTranscript("");

    // Restart speech recognition safely
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // already running
      }
    }
  };

  // Safe barge-in interruption logic
  const handleInterrupt = (source = "MANUAL_STOP") => {
    if (stateRef.current === "AI_SPEAKING" || stateRef.current === "THINKING") {
      setState("INTERRUPTED");
      logTelemetry("interruption_source", { source });
      
      // Stop speech synthesis immediately with explicit reason logged
      cancelSpeechPlaybacks(source);
      
      if (aiSpeakingSafetyTimeoutRef.current) clearTimeout(aiSpeakingSafetyTimeoutRef.current);

      // Invalidate current response completely
      activeResponseIdRef.current = "";
      sentenceQueueRef.current = [];
      activeUtteranceIndexRef.current = -1;
      
      resumeListening();
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (nextMuted) {
      setState("MUTED");
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    } else {
      setState("LISTENING");
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }
    }
  };

  // Convert current state into user-friendly description
  const getStatusText = () => {
    switch (state) {
      case "CONNECTING":
        return "Connecting...";
      case "REQUESTING_MICROPHONE":
        return "Requesting microphone access...";
      case "LISTENING":
        return speechLang === "ta-IN" ? "Listening in Tamil..." : "Listening in English...";
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

  // Map state to 3D morphing sphere animator states
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

  // Filter out system prompts and show conversation transcript
  const visibleMessages = messages.filter(
    (m) => m.role === "user" || m.role === "assistant"
  );

  // Form display transcription dynamically
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

            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-900 hover:text-white transition"
              title="Close Voice Mode"
            >
              <X size={20} />
            </button>
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
              <p className="mt-3 text-sm text-slate-450 font-medium italic min-h-[20px] px-4 truncate max-w-full">
                {interimTranscript || (state === "LISTENING" ? "champ, suggest a movie..." : "")}
              </p>
            </div>

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
