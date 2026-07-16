import { useState, useEffect, useRef } from "react";
import { useMessageStore } from "../../stores/message.store";
import { useChatStore } from "../../stores/chat.store";
import AiPresence from "../ui/AiPresence";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Square,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { normalizeTamilSpeech, analyzeSemanticTurn, detectSpeechLanguage } from "../../utils/semanticDetector";

interface VoiceModeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

type VoiceState =
  | "IDLE"
  | "CONNECTING"
  | "LISTENING"
  | "USER_SPEAKING"
  | "PROCESSING"
  | "AI_THINKING"
  | "AI_SPEAKING"
  | "INTERRUPTED"
  | "ERROR";

import {
  splitSentences,
  cleanSpeechText,
  detectDominantLanguage,
  selectBestSystemVoice,
  calculateAdaptivePause
} from "../../utils/speechSynthesisHelper";

export default function VoiceModeOverlay({ isOpen, onClose }: VoiceModeOverlayProps) {
  const { currentChat, createChat, fetchChats } = useChatStore();
  const { messages, sendMessage } = useMessageStore();

  const [state, setState] = useState<VoiceState>("IDLE");
  const [errorMessage, setErrorMessage] = useState("");
  
  // Authoritative transcript registers
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  
  // Voice Language Preference settings: Auto, Tamil, English
  const [voiceLang, setVoiceLang] = useState(() => {
    return localStorage.getItem("champai_voice_lang") || "Auto";
  });
  
  // Device voice quality notice message state
  const [voiceNotice, setVoiceNotice] = useState("");

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

  // Keep refs of values needed in async callbacks to prevent closures on stale state
  const stateRef = useRef<VoiceState>(state);
  const isMicEnabledRef = useRef<boolean>(isMicEnabled);
  const isAudioMutedRef = useRef<boolean>(isAudioMuted);
  const chatRef = useRef<any>(currentChat);
  const finalTranscriptRef = useRef(finalTranscript);
  const interimTranscriptRef = useRef(interimTranscript);
  const voiceLangRef = useRef(voiceLang);

  // Progressive assistant text state shown in Voice Modal during stream
  const [fullAssistantText, setFullAssistantText] = useState("");

  // Session Duration Timer state
  const [sessionDuration, setSessionDuration] = useState(0);

  useEffect(() => {
    let timerId: any = null;
    if (isOpen && state !== "IDLE" && state !== "CONNECTING" && state !== "ERROR") {
      timerId = setInterval(() => {
        setSessionDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setSessionDuration(0);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isOpen, state]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Keyboard accessibility shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        toggleMic();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      } else if (e.key === "s" || e.key === "S" || e.key === "Enter") {
        e.preventDefault();
        handleInterrupt("KEYBOARD_SHORTCUT");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isMicEnabled, isAudioMuted, state]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    isMicEnabledRef.current = isMicEnabled;
  }, [isMicEnabled]);

  useEffect(() => {
    isAudioMutedRef.current = isAudioMuted;
  }, [isAudioMuted]);

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

  const startVoiceSession = async () => {
    logTelemetry("Voice session started");
    setState("CONNECTING");
    const sessionId = crypto.randomUUID();
    recognitionSessionIdRef.current = sessionId;
    logTelemetry("recognition_session_id", { sessionId });
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
        "Live speech recognition is not supported in this browser. Please use a supported browser (Chrome, Edge) or continue in text mode."
      );
      return;
    }

    logTelemetry("Voice session started");
    setState("CONNECTING");

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

      // Set target speech capture lang based on settings
      let targetLang = "en-US";
      if (voiceLangRef.current === "Tamil") {
        targetLang = "ta-IN";
      } else if (voiceLangRef.current === "English") {
        targetLang = "en-US";
      } else {
        // Auto: defaults to user's last selected language or en-US
        targetLang = localStorage.getItem("champai_speech_lang") || "en-US";
      }

      rec.lang = targetLang;
      logTelemetry("recognition_language", { lang: targetLang });

      // If user is speaking Tamil and Chrome isn't explicitly set to Tamil, prompt user
      if (voiceLangRef.current === "Auto" && targetLang === "en-US") {
        setVoiceNotice("தமிழில் பேசுகிறீர்களா? தமிழ் mode தேர்வு செய்தால் recognition accuracy மேம்படலாம்.");
      }

      rec.onstart = () => {
        logTelemetry("Recognition started");
        logTelemetry("recognition_started", { sessionId: recognitionSessionIdRef.current });
        if (stateRef.current === "CONNECTING") {
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

        // Automatic voice-triggered interruption (barge-in) ONLY on desktop browsers
        const cleanInterim = (currentInterim || accumulatedFinal).trim();
        if (stateRef.current === "AI_SPEAKING" && isDesktop && cleanInterim.length > 2) {
          const userWords = cleanInterim.toLowerCase().split(/\s+/);

          // Trigger if at least 2 words are spoken or 1 word >= 5 chars
          const longWords = userWords.filter(w => w.length > 2);
          if (longWords.length >= 2 || (longWords.length === 1 && longWords[0].length >= 5)) {
            const aiWords = (currentStreamTextRef.current || "").toLowerCase().split(/\s+/);
            const recentAiWords = aiWords.slice(-15);
            const isLeakage = longWords.every(word => recentAiWords.includes(word));

            if (!isLeakage) {
              logTelemetry("User interruption detected", { userInterim: cleanInterim });
              handleInterruptionBargeIn();

              if (accumulatedFinal) {
                finalTranscriptRef.current = accumulatedFinal;
                setFinalTranscript(accumulatedFinal);
              }
              setInterimTranscript(currentInterim);
              return;
            }
          }
        }

        // Ignore standard speech inputs if thinking or AI is speaking
        if (stateRef.current === "AI_THINKING" || stateRef.current === "AI_SPEAKING" || stateRef.current === "PROCESSING" || !isMicEnabledRef.current) {
          return;
        }

        logTelemetry("last_tamil_result_timestamp", { timestamp: Date.now() });
        logTelemetry("interim_tamil_transcript", { currentInterim });
        let currentFinalText = finalTranscriptRef.current;
        if (accumulatedFinal) {
          logTelemetry("final_tamil_segment", { segment: accumulatedFinal });
          currentFinalText += accumulatedFinal;
          finalTranscriptRef.current = currentFinalText;
          setFinalTranscript(currentFinalText);
          logTelemetry("accumulated_tamil_transcript", { transcript: currentFinalText });
        }
        setInterimTranscript(currentInterim);
        setState("USER_SPEAKING");

        // Reset existing silence detection timer
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          logTelemetry("silence_timer_reset");
        }

        // Never submit during active speech: wait until interim transcript stabilizes (becomes empty)
        if (currentInterim.trim().length > 0) {
          logTelemetry("waiting_for_stable_transcript", { currentInterim });
          return;
        }

        // Multilingual semantic turn & language intelligence detection
        const combinedText = (currentFinalText + currentInterim).trim();
        const normalizedText = normalizeTamilSpeech(combinedText);
        const turnAnalysis = analyzeSemanticTurn(normalizedText);

        logTelemetry("Detected Language", { language: turnAnalysis.detectedLanguage });
        logTelemetry("Semantic Confidence", { confidence: turnAnalysis.confidence });
        logTelemetry("Turn Detection Result", { isComplete: turnAnalysis.isComplete });
        logTelemetry("Adaptive Timeout", { delay: turnAnalysis.adaptiveTimeout });

        const timeoutDelay = turnAnalysis.adaptiveTimeout;

        silenceTimeoutRef.current = setTimeout(() => {
          const finalSpeech = normalizeTamilSpeech(finalTranscriptRef.current + interimTranscriptRef.current);
          if (finalSpeech && (stateRef.current === "USER_SPEAKING" || stateRef.current === "LISTENING")) {
            logTelemetry("Submission Time", { timestamp: new Date().toISOString() });
            logTelemetry("turn_submission_reason", { text: finalSpeech, reason: "SEMANTIC_TIMEOUT" });
            handleSubmitUserSpeech(finalSpeech);
          }
        }, timeoutDelay);
        logTelemetry("silence_timer_started", { delay: timeoutDelay });
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition service error:", e.error);
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setState("ERROR");
          setErrorMessage("Microphone permission denied.");
        } else if (e.error === "network") {
          setState("ERROR");
          setErrorMessage("Connection interrupted.");
        } else if (e.error === "no-speech") {
          // ignore
        } else {
          setState("ERROR");
          setErrorMessage("Speech recognition stopped.");
        }
      };

      rec.onend = () => {
        logTelemetry("Recognition stopped");
        // Continuous restarts: keep recognition alive on desktop, or on mobile when NOT speaking
        const current = stateRef.current;
        const wantListening = current === "LISTENING" || current === "USER_SPEAKING";
        const allowSpeechBargeIn = current === "AI_SPEAKING" && isDesktop;

        if (isMicEnabledRef.current && (wantListening || allowSpeechBargeIn)) {
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
      if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setErrorMessage("No microphone detected.");
      } else {
        setErrorMessage("Microphone permission denied.");
      }
    }
  };

  const endVoiceSession = () => {
    logTelemetry("Voice session ended");
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
      } catch (e) {
        // already stopped
      }
      recognitionRef.current = null;
    }
  };

  const cancelSpeechPlaybacks = (reason: string) => {
    logTelemetry("Speech cancelled");
    logTelemetry("speech_cancel_reason", { reason });

    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn("speechSynthesis.cancel failed:", e);
    }

    currentSpeechUtteranceRef.current = null;
    sentenceQueueRef.current = [];
    spokenSentenceIndicesRef.current.clear();
    activeUtteranceIndexRef.current = -1;
    currentStreamTextRef.current = "";

    if (aiSpeakingSafetyTimeoutRef.current) {
      clearTimeout(aiSpeakingSafetyTimeoutRef.current);
      aiSpeakingSafetyTimeoutRef.current = null;
    }
  };

  const handleSubmitUserSpeech = async (speechText: string) => {
    if (!speechText) {
      setState("LISTENING");
      return;
    }

    logTelemetry("Transcript finalized", { text: speechText });

    // Auto language strategy: save language preference dynamically based on input content
    const detectedSpeechLang = detectSpeechLanguage(speechText);
    if (detectedSpeechLang === "Tamil" || detectedSpeechLang === "Tanglish" || detectedSpeechLang === "Mixed") {
      localStorage.setItem("champai_speech_lang", "ta-IN");
    } else {
      localStorage.setItem("champai_speech_lang", "en-US");
    }

    logTelemetry("Gemini request", { text: speechText });

    // Allocate a unique response ID for this conversation turn
    const responseId = crypto.randomUUID();
    activeResponseIdRef.current = responseId;

    // Start timing telemetry
    speechEndTimeRef.current = Date.now();
    requestStartTimeRef.current = Date.now();
    firstTokenTimeRef.current = 0;
    firstAudioTimeRef.current = 0;
    logTelemetry("submitted_tamil_transcript", { text: speechText, responseId });

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
    setVoiceNotice("");

    setState("AI_THINKING");

    // Stop speech recognition immediately on mobile devices to prevent OS level audio ducking
    if (!isDesktop && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // already stopped
      }
    }

    try {
      let chatId = chatRef.current?._id;

      // Auto-create chat if none selected
      if (!chatId) {
        const newChat = await createChat("Voice Chat");
        chatId = newChat._id;
        await fetchChats();
      }

      setState("PROCESSING");
      // Stream response token-by-token directly using custom onToken callback
      await sendMessage(chatId, speechText, undefined, (token) => {
        // Discard tokens if user has interrupted or moved to a new turn
        if (activeResponseIdRef.current !== responseId) return;
        handleStreamToken(token, responseId);
      });

      if (activeResponseIdRef.current !== responseId) return;

      isStreamFinishedRef.current = true;
      logTelemetry("assistant_stream_completed", { responseId });
      
      // Flush out any remaining trailing text in stream buffer
      const finalSentences = splitSentences(currentStreamTextRef.current, true, currentStreamTextRef);
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
      // Discard errors if user has interrupted or moved to a new turn
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
      logTelemetry("First response token");
      logTelemetry("first_ai_token_timestamp", { latencyMs: firstTokenTimeRef.current - requestStartTimeRef.current });
    }

    // Append to authoritative progressive text
    setFullAssistantText((prev) => prev + token);
    currentStreamTextRef.current += token;

    // Extract newly completed sentences from stream
    const sentences = splitSentences(currentStreamTextRef.current, false, currentStreamTextRef);
    
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
    
    // Check if next sentence exists in queue
    if (nextIndex >= sentenceQueueRef.current.length) {
      checkQueueFinished(responseId);
      return;
    }

    const nextSentence = sentenceQueueRef.current[nextIndex];
    activeUtteranceIndexRef.current = nextIndex;

    logTelemetry("Chunk created", { text: nextSentence });
    logTelemetry("Queue length", { length: sentenceQueueRef.current.length });

    const cleanText = cleanSpeechText(nextSentence).normalize("NFC");
    if (!cleanText) {
      // Discard empty chunk and go next
      spokenSentenceIndicesRef.current.add(nextIndex);
      playNextSentenceInQueue(responseId);
      return;
    }

    // Mark active state
    setState("AI_SPEAKING");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.volume = isAudioMutedRef.current ? 0 : 1;
    utterance.lang = detectDominantLanguage(cleanText);

    const bestVoice = selectBestSystemVoice(utterance.lang);
    if (bestVoice) {
      utterance.voice = bestVoice;
      logTelemetry("Voice selected", { name: bestVoice.name, lang: bestVoice.lang });
      console.log(`[Voice Inventory] Selected voice: ${bestVoice.name}`);
    }

    // Measure time to first audio output
    utterance.onstart = () => {
      if (activeResponseIdRef.current !== responseId) return;

      logTelemetry("AI speaking", { text: cleanText });
      logTelemetry("Chunk played", { text: cleanText, index: nextIndex });
      logTelemetry("Playback restarted");
      logTelemetry("Speech started", { text: cleanText });
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

      logTelemetry("Speech completed");
      logTelemetry("Speech finished");
      logTelemetry("tts_chunk_completed", { index: nextIndex });
      spokenSentenceIndicesRef.current.add(nextIndex);
      currentSpeechUtteranceRef.current = null;
      if (aiSpeakingSafetyTimeoutRef.current) clearTimeout(aiSpeakingSafetyTimeoutRef.current);
      
      // Calculate dynamic pause between sentences
      const pauseDuration = calculateAdaptivePause(nextSentence);
      
      setTimeout(() => {
        if (activeResponseIdRef.current !== responseId) return;
        playNextSentenceInQueue(responseId);
      }, pauseDuration);
    };

    utterance.onerror = (e) => {
      if (activeResponseIdRef.current !== responseId) return;

      console.warn("Utterance playback error:", e);
      spokenSentenceIndicesRef.current.add(nextIndex);
      currentSpeechUtteranceRef.current = null;
      if (aiSpeakingSafetyTimeoutRef.current) clearTimeout(aiSpeakingSafetyTimeoutRef.current);
      
      // Proceed next with brief automatic recovery timeout
      setTimeout(() => {
        if (activeResponseIdRef.current !== responseId) return;
        playNextSentenceInQueue(responseId);
      }, 500);
    };

    currentSpeechUtteranceRef.current = utterance;

    // Safety timeout: prevent synthesis locking on mobile
    const estimatedDuration = cleanText.length * 150 + 5000;
    if (aiSpeakingSafetyTimeoutRef.current) clearTimeout(aiSpeakingSafetyTimeoutRef.current);
    aiSpeakingSafetyTimeoutRef.current = setTimeout(() => {
      if (stateRef.current === "AI_SPEAKING" && activeUtteranceIndexRef.current === nextIndex && activeResponseIdRef.current === responseId) {
        cancelSpeechPlaybacks("TTS_SAFETY_TIMEOUT");
        playNextSentenceInQueue(responseId);
      }
    }, estimatedDuration);

    const speakDelay = nextIndex > 0 ? 300 : 0;
    setTimeout(() => {
      if (activeResponseIdRef.current !== responseId) return;
      window.speechSynthesis.speak(utterance);
    }, speakDelay);
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
    setState("LISTENING");
    
    // Clear display transcripts for next turn
    setFinalTranscript("");
    setInterimTranscript("");

    // Restart speech recognition safely if mic is enabled
    if (isMicEnabledRef.current && recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // already running
      }
    }
  };

  const handleInterruptionBargeIn = () => {
    if (stateRef.current === "AI_SPEAKING" || stateRef.current === "AI_THINKING" || stateRef.current === "PROCESSING") {
      logTelemetry("User interruption detected");

      // Stop speech synthesis immediately
      cancelSpeechPlaybacks("USER_BARGE_IN");
      if (aiSpeakingSafetyTimeoutRef.current) clearTimeout(aiSpeakingSafetyTimeoutRef.current);

      // Invalidate current response completely
      activeResponseIdRef.current = "";
      sentenceQueueRef.current = [];
      activeUtteranceIndexRef.current = -1;

      // Transition to USER_SPEAKING state without clearing transcripts
      setState("USER_SPEAKING");
      setFullAssistantText("");
      logTelemetry("Playback restarted");
    }
  };

  // Safe barge-in interruption logic
  const handleInterrupt = (source = "MANUAL_STOP") => {
    if (stateRef.current === "AI_SPEAKING" || stateRef.current === "AI_THINKING") {
      setState("INTERRUPTED");
      logTelemetry("User interruption detected");
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

  const toggleMic = () => {
    const nextEnabled = !isMicEnabled;
    setIsMicEnabled(nextEnabled);

    if (!nextEnabled) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // already stopped
        }
      }
    } else {
      if (stateRef.current === "LISTENING") {
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

  const toggleMute = () => {
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);

    if (currentSpeechUtteranceRef.current) {
      currentSpeechUtteranceRef.current.volume = nextMuted ? 0 : 1;
    }
  };

  // Convert current state into user-friendly description
  const getStatusText = () => {
    if (!isMicEnabled) {
      return "🎙️ Mic Off";
    }
    switch (state) {
      case "CONNECTING":
        return "Connecting...";
      case "LISTENING":
        return "🎤 Listening...";
      case "USER_SPEAKING":
        return "🎙️ Speaking...";
      case "PROCESSING":
        return "⏳ Understanding...";
      case "AI_THINKING":
        return "🧠 Thinking...";
      case "AI_SPEAKING":
        return "🔊 Speaking...";
      case "INTERRUPTED":
        return "Interrupted";
      case "ERROR":
        return "Error";
      default:
        return "Idle";
    }
  };

  // Map state to 3D morphing sphere animator states
  const getOrbState = (): "idle" | "listening" | "thinking" | "streaming" | "error" => {
    switch (state) {
      case "LISTENING":
      case "USER_SPEAKING":
        return "listening";
      case "PROCESSING":
      case "AI_THINKING":
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

            {/* Language Selector Dropdown & Call Timer */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-400 font-bold">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Call:</span>
                <span className="text-blue-400 font-mono" aria-live="off">{formatDuration(sessionDuration)}</span>
              </div>

              <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-xl px-2.5 py-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lang:</span>
                <select
                  value={voiceLang}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="bg-transparent text-xs text-blue-400 font-bold outline-none cursor-pointer"
                  aria-label="Select voice language"
                >
                  <option value="Auto" className="bg-slate-950 text-white">Auto</option>
                  <option value="Tamil" className="bg-slate-950 text-white">தமிழ்</option>
                  <option value="English" className="bg-slate-950 text-white">English</option>
                </select>
              </div>

              <button
                onClick={onClose}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-900 hover:text-white transition"
                title="Close Voice Mode"
                aria-label="Close Voice Mode"
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
                    : state === "AI_THINKING" || state === "PROCESSING"
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
            <div className="text-center w-full max-w-lg min-h-[90px] flex flex-col justify-center items-center">
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

              {/* Interruption Prompt Banner */}
              {state === "AI_SPEAKING" && (
                <p className="mt-1 text-[10px] font-black text-indigo-400/70 uppercase tracking-widest animate-pulse select-none">
                  {isDesktop ? "Speak to interrupt" : "Tap to interrupt"}
                </p>
              )}

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
                <div className="text-left flex-1">
                  <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider">Voice Error</h4>
                  <p className="text-sm text-slate-350 mt-1 leading-relaxed">{errorMessage}</p>
                  <button
                    onClick={() => {
                      endVoiceSession();
                      setTimeout(() => {
                        startVoiceSession();
                      }, 300);
                    }}
                    className="mt-3 text-xs bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-xl transition duration-200"
                    aria-label="Retry voice session"
                  >
                    Retry Connection
                  </button>
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
                  {fullAssistantText && (state === "AI_THINKING" || state === "PROCESSING" || state === "AI_SPEAKING") && (
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
            {/* Toggle Mic Button */}
            <button
              onClick={toggleMic}
              className={`rounded-full p-4 border transition duration-200 hover:scale-105 active:scale-95 ${
                !isMicEnabled
                  ? "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
              }`}
              title={isMicEnabled ? "Disable Microphone" : "Enable Microphone"}
              aria-label={isMicEnabled ? "Disable Microphone" : "Enable Microphone"}
            >
              {isMicEnabled ? <Mic size={22} /> : <MicOff size={22} />}
            </button>

            {/* Toggle Audio Mute Button */}
            <button
              onClick={toggleMute}
              className={`rounded-full p-4 border transition duration-200 hover:scale-105 active:scale-95 ${
                isAudioMuted
                  ? "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
              }`}
              title={isAudioMuted ? "Unmute Assistant Volume" : "Mute Assistant Volume"}
              aria-label={isAudioMuted ? "Unmute Assistant Volume" : "Mute Assistant Volume"}
            >
              {isAudioMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
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
              aria-label="Stop Speaking"
            >
              <Square size={22} />
            </button>

            {/* Close Overlay Button */}
            <button
              onClick={onClose}
              className="rounded-full p-4 bg-red-600 text-white hover:bg-red-500 hover:scale-105 active:scale-95 shadow-lg transition duration-200"
              title="Close Voice Mode"
              aria-label="Close Voice Mode"
            >
              <X size={22} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
