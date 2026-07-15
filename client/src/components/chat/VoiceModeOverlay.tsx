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

export default function VoiceModeOverlay({ isOpen, onClose }: VoiceModeOverlayProps) {
  const { currentChat, createChat, fetchChats } = useChatStore();
  const { messages, sendMessage } = useMessageStore();

  const [state, setState] = useState<VoiceState>("IDLE");
  const [errorMessage, setErrorMessage] = useState("");
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
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Latency metrics tracking
  const speechEndTimeRef = useRef<number>(0);
  const requestStartTimeRef = useRef<number>(0);
  const firstTokenTimeRef = useRef<number>(0);
  const firstAudioTimeRef = useRef<number>(0);

  // Playback queue & unique chunk IDs tracking
  const currentStreamTextRef = useRef<string>("");
  const sentenceQueueRef = useRef<string[]>([]);
  const spokenSentenceIndicesRef = useRef<Set<number>>(new Set());
  const activeUtteranceIndexRef = useRef<number>(-1);
  const isStreamFinishedRef = useRef<boolean>(false);

  // Keep refs of values needed in async callbacks to prevent closures on stale state
  const stateRef = useRef<VoiceState>(state);
  const isMutedRef = useRef<boolean>(isMuted);
  const chatRef = useRef<any>(currentChat);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    chatRef.current = currentChat;
  }, [currentChat]);

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
    setInterimTranscript("");

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

      // Start volume-based audio analyzer for automatic user-voice barge-in detection
      startVolumeAnalyzer(stream);

      // Initialize speech recognition
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = speechLang;

      rec.onstart = () => {
        if (stateRef.current === "REQUESTING_MICROPHONE" || stateRef.current === "CONNECTING") {
          setState("LISTENING");
        }
      };

      rec.onresult = (event: any) => {
        let finalPart = "";
        let interimPart = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            finalPart += result[0].transcript;
          } else {
            interimPart += result[0].transcript;
          }
        }

        // Automatic voice-triggered interruption (barge-in)
        if (stateRef.current === "AI_SPEAKING" && (interimPart.trim().length > 3 || finalPart.trim().length > 3)) {
          // Verify that this isn't just the AI's own words being echoed back
          const currentSentence = activeUtteranceIndexRef.current >= 0 ? sentenceQueueRef.current[activeUtteranceIndexRef.current] || "" : "";
          const userWords = (interimPart || finalPart).toLowerCase().split(/\s+/);
          const aiWords = currentSentence.toLowerCase().split(/\s+/);
          
          // If the user says something that doesn't completely overlap with the spoken AI sentence, trigger interruption
          const isUniqueSpeech = userWords.some(word => word.length > 2 && !aiWords.includes(word));
          if (isUniqueSpeech) {
            console.log(`[Barge-In] Recognized user voice activity: "${interimPart || finalPart}". Interrupting.`);
            handleInterrupt();
            return;
          }
        }

        // Ignore standard speech inputs if thinking/processing
        if (isMutedRef.current || stateRef.current === "THINKING" || stateRef.current === "AI_SPEAKING" || stateRef.current === "PROCESSING_SPEECH") {
          return;
        }

        if (interimPart) {
          setState("USER_SPEAKING");
          setInterimTranscript(interimPart);
        }

        if (finalPart) {
          setInterimTranscript(finalPart);

          // Reset existing silence detection timer
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }

          // Trigger silence check to submit phrase
          silenceTimeoutRef.current = setTimeout(() => {
            if (stateRef.current === "USER_SPEAKING" || stateRef.current === "LISTENING") {
              handleSubmitUserSpeech(finalPart.trim());
            }
          }, 1500); // 1.5s of pause triggers AI response
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition service warning/error:", e.error);
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setState("ERROR");
          setErrorMessage("Microphone access was denied. Please check your system/browser settings.");
        }
      };

      rec.onend = () => {
        // Keep microphone recognition alive during LISTENING/USER_SPEAKING or AI_SPEAKING (for barge-in)
        const current = stateRef.current;
        if (!isMutedRef.current && (current === "LISTENING" || current === "USER_SPEAKING" || current === "AI_SPEAKING")) {
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

  const startVolumeAnalyzer = (stream: MediaStream) => {
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkVolume = () => {
        if (!localStreamRef.current) return; // session ended

        if (stateRef.current === "AI_SPEAKING") {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const averageVolume = sum / dataArray.length;
          
          // An average volume above 35 indicates active voice input over the audio playback
          if (averageVolume > 35) {
            console.log(`[Barge-In] Decibel volume exceeded threshold (${averageVolume.toFixed(1)}). Interrupting.`);
            handleInterrupt();
          }
        }
        
        requestAnimationFrame(checkVolume);
      };
      
      checkVolume();
    } catch (err) {
      console.warn("Failed to initialize barge-in audio volume analyzer:", err);
    }
  };

  const endVoiceSession = () => {
    setState("IDLE");

    // Cancel speech synthesis
    window.speechSynthesis.cancel();
    currentSpeechUtteranceRef.current = null;

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

    // Stop audio context
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
  };

  const handleSubmitUserSpeech = async (speechText: string) => {
    if (!speechText) {
      setState("LISTENING");
      return;
    }

    // Start latency timer
    speechEndTimeRef.current = Date.now();
    requestStartTimeRef.current = Date.now();
    firstTokenTimeRef.current = 0;
    firstAudioTimeRef.current = 0;

    // Reset sentence queue parameters
    currentStreamTextRef.current = "";
    sentenceQueueRef.current = [];
    spokenSentenceIndicesRef.current.clear();
    activeUtteranceIndexRef.current = -1;
    isStreamFinishedRef.current = false;

    // 1. Transition state to Thinking
    setState("THINKING");
    setInterimTranscript("");

    try {
      let chatId = chatRef.current?._id;

      // Auto-create chat if none selected
      if (!chatId) {
        const newChat = await createChat("Voice Chat");
        chatId = newChat._id;
        await fetchChats();
      }

      // Stream response token-by-token
      await sendMessage(chatId, speechText, undefined, (token) => {
        handleStreamToken(token);
      });

      isStreamFinishedRef.current = true;
      
      // Flush out any remaining trailing text in buffer
      const finalSentences = extractSentences(currentStreamTextRef.current, true);
      for (const sent of finalSentences) {
        if (!sentenceQueueRef.current.includes(sent)) {
          sentenceQueueRef.current.push(sent);
        }
      }

      // Check if queue has finished playing
      checkQueueFinished();

    } catch (err: any) {
      console.error("Error generating voice response:", err);
      setState("ERROR");
      if (err.code === "APP_DAILY_QUOTA_EXCEEDED") {
        setErrorMessage("You have reached your daily text/chat limits. Please upgrade to Pro.");
      } else {
        setErrorMessage("Connection lost. Voice Mode is temporarily unavailable.");
      }
    }
  };

  const handleStreamToken = (token: string) => {
    // Record time to first token
    if (firstTokenTimeRef.current === 0) {
      firstTokenTimeRef.current = Date.now();
    }

    currentStreamTextRef.current += token;

    // Extract newly completed sentences from stream
    const sentences = extractSentences(currentStreamTextRef.current, false);
    
    let added = false;
    for (const sent of sentences) {
      if (!sentenceQueueRef.current.includes(sent)) {
        sentenceQueueRef.current.push(sent);
        added = true;
      }
    }

    if (added) {
      playNextSentenceInQueue();
    }
  };

  const playNextSentenceInQueue = () => {
    // If currently speaking, wait for active sentence onend trigger
    if (stateRef.current === "AI_SPEAKING" && currentSpeechUtteranceRef.current) {
      return;
    }

    // Find the next index to play
    const nextIndex = activeUtteranceIndexRef.current + 1;
    
    // Check if next sentence exists in queue
    if (nextIndex >= sentenceQueueRef.current.length) {
      checkQueueFinished();
      return;
    }

    const nextSentence = sentenceQueueRef.current[nextIndex];
    activeUtteranceIndexRef.current = nextIndex;

    const cleanText = cleanSentenceText(nextSentence);
    if (!cleanText) {
      // Discard empty chunk and go next
      spokenSentenceIndicesRef.current.add(nextIndex);
      playNextSentenceInQueue();
      return;
    }

    // Mark active state
    setState("AI_SPEAKING");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const isTamil = /[\u0B80-\u0BFF]/.test(cleanText);
    utterance.lang = isTamil ? "ta-IN" : "en-US";

    const voices = window.speechSynthesis.getVoices();
    const matchingVoices = voices.filter(
      (v) =>
        v.lang.startsWith(utterance.lang) ||
        v.lang.startsWith(isTamil ? "ta" : "en")
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
      if (firstAudioTimeRef.current === 0) {
        firstAudioTimeRef.current = Date.now();
        
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
      spokenSentenceIndicesRef.current.add(nextIndex);
      currentSpeechUtteranceRef.current = null;
      if (aiSpeakingSafetyTimeoutRef.current) clearTimeout(aiSpeakingSafetyTimeoutRef.current);
      
      // Play next sentence chunk
      playNextSentenceInQueue();
    };

    utterance.onerror = (e) => {
      console.warn("Utterance playback error:", e);
      spokenSentenceIndicesRef.current.add(nextIndex);
      currentSpeechUtteranceRef.current = null;
      if (aiSpeakingSafetyTimeoutRef.current) clearTimeout(aiSpeakingSafetyTimeoutRef.current);
      
      // Proceed next
      playNextSentenceInQueue();
    };

    currentSpeechUtteranceRef.current = utterance;

    // Safety timeout: prevent synthesis locking
    const estimatedDuration = cleanText.length * 120 + 3500;
    if (aiSpeakingSafetyTimeoutRef.current) clearTimeout(aiSpeakingSafetyTimeoutRef.current);
    aiSpeakingSafetyTimeoutRef.current = setTimeout(() => {
      if (stateRef.current === "AI_SPEAKING" && activeUtteranceIndexRef.current === nextIndex) {
        console.warn("TTS safety timeout triggered: skipping chunk.");
        window.speechSynthesis.cancel();
        currentSpeechUtteranceRef.current = null;
        playNextSentenceInQueue();
      }
    }, estimatedDuration);

    window.speechSynthesis.speak(utterance);
  };

  const checkQueueFinished = () => {
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
  const handleInterrupt = () => {
    if (stateRef.current === "AI_SPEAKING" || stateRef.current === "THINKING") {
      setState("INTERRUPTED");
      
      // Stop speech synthesis immediately
      window.speechSynthesis.cancel();
      currentSpeechUtteranceRef.current = null;
      
      if (aiSpeakingSafetyTimeoutRef.current) clearTimeout(aiSpeakingSafetyTimeoutRef.current);

      // Flush queue
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
              onClick={handleInterrupt}
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
              {visibleMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs font-semibold">
                  Transcripts will appear here
                </div>
              ) : (
                visibleMessages.map((msg, i) => (
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
                ))
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
              onClick={handleInterrupt}
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
