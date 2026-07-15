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
        // Ignore speech inputs if muted or the AI is speaking/thinking
        if (isMutedRef.current || stateRef.current === "THINKING" || stateRef.current === "AI_SPEAKING" || stateRef.current === "PROCESSING_SPEECH") {
          return;
        }

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
        // If we ended listening but still want to be in listing state (no thinking/AI active), restart
        const current = stateRef.current;
        if (!isMutedRef.current && (current === "LISTENING" || current === "USER_SPEAKING")) {
          try {
            recognitionRef.current?.start();
          } catch (err) {
            // SpeechRecognition is already running or error
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
  };

  const handleSubmitUserSpeech = async (speechText: string) => {
    if (!speechText) {
      setState("LISTENING");
      return;
    }

    // 1. Transition state to Thinking
    setState("THINKING");
    setInterimTranscript("");

    // Temporarily pause speech recognition while AI thinks and speaks
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

      // Send speech message to AI
      await sendMessage(chatId, speechText);

      // Check for the AI's final text in the message store
      const currentMessages = useMessageStore.getState().messages;
      const lastMessage = currentMessages[currentMessages.length - 1];

      if (lastMessage && lastMessage.role === "assistant") {
        handleSpeakResponse(lastMessage.content);
      } else {
        // Fallback if no message found
        resumeListening();
      }
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

  const handleSpeakResponse = (responseText: string) => {
    setState("AI_SPEAKING");

    // Clean text of formatting tokens like markdown, asterisks, brackets which sound robotic
    const cleanText = responseText
      .replace(/[\*\_\`\#]/g, "") // remove bold/italic/code markdowns
      .replace(/\[.*?\]/g, "")   // remove reference link brackets
      .trim();

    if (!cleanText) {
      resumeListening();
      return;
    }

    window.speechSynthesis.cancel();

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

    utterance.onend = () => {
      currentSpeechUtteranceRef.current = null;
      if (aiSpeakingSafetyTimeoutRef.current) clearTimeout(aiSpeakingSafetyTimeoutRef.current);
      resumeListening();
    };

    utterance.onerror = (e) => {
      console.warn("TTS playback warning/error:", e);
      currentSpeechUtteranceRef.current = null;
      if (aiSpeakingSafetyTimeoutRef.current) clearTimeout(aiSpeakingSafetyTimeoutRef.current);
      resumeListening();
    };

    currentSpeechUtteranceRef.current = utterance;

    // Safety timeout: prevent synthesis hanging on mobile devices
    const estimatedDuration = cleanText.length * 120 + 3500; // 120ms per character + 3.5s cushion
    if (aiSpeakingSafetyTimeoutRef.current) clearTimeout(aiSpeakingSafetyTimeoutRef.current);
    aiSpeakingSafetyTimeoutRef.current = setTimeout(() => {
      if (stateRef.current === "AI_SPEAKING") {
        console.warn("TTS safety timeout fired: resetting to listening state.");
        window.speechSynthesis.cancel();
        currentSpeechUtteranceRef.current = null;
        resumeListening();
      }
    }, estimatedDuration);

    window.speechSynthesis.speak(utterance);
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
    if (state === "AI_SPEAKING") {
      setState("INTERRUPTED");
      window.speechSynthesis.cancel();
      currentSpeechUtteranceRef.current = null;
      if (aiSpeakingSafetyTimeoutRef.current) clearTimeout(aiSpeakingSafetyTimeoutRef.current);
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
        return "streaming"; // streams pulses
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
