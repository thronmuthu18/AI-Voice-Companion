import {
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  SendHorizontal,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ChatComposerProps {
  disabled?: boolean;
  isLoading?: boolean;
  onSend: (message: string) => void;
}

export default function ChatComposer({
  disabled = false,
  isLoading = false,
  onSend,
}: ChatComposerProps) {
  const [message, setMessage] = useState("");
  const [isListening, setIsListening] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!textareaRef.current) return;

    textareaRef.current.style.height = "0px";

    textareaRef.current.style.height =
      textareaRef.current.scrollHeight + "px";
  }, [message]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleSend = () => {
    const trimmed = message.trim();

    if (!trimmed) return;

    if (disabled || isLoading) return;

    // If recording, stop it first
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }

    onSend(trimmed);

    setMessage("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge."
      );
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      // Cancel any ongoing text-to-speech playbacks
      window.speechSynthesis.cancel();

      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
            setMessage((prev) => {
              const separator = prev ? " " : "";
              return prev + separator + finalTranscript.trim();
            });
          }
        };

        recognition.onerror = (e: any) => {
          console.error("Speech recognition error:", e);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
        setIsListening(false);
      }
    }
  };

  return (
    <div className="border-t border-slate-800 bg-slate-950/80 backdrop-blur-xl px-6 py-5">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-end gap-3 rounded-3xl border border-slate-800 bg-slate-900 p-3 shadow-xl">
          {/* Attachment */}
          <button
            type="button"
            disabled={disabled || isLoading}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            <Paperclip size={20} />
          </button>

          {/* Input */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={message}
            disabled={disabled || isLoading}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening ? "Listening... Speak now." : "Message MuthuAI..."
            }
            className="
              min-h-[28px]
              max-h-40
              flex-1
              resize-none
              overflow-y-auto
              bg-transparent
              text-white
              placeholder:text-slate-500
              outline-none
            "
          />

          {/* Voice Mic Toggle */}
          <button
            type="button"
            onClick={toggleListening}
            disabled={disabled || isLoading}
            className={`rounded-xl p-2 transition disabled:opacity-50 ${
              isListening
                ? "bg-red-600 text-white animate-pulse"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
            title={isListening ? "Stop Listening" : "Start Voice Input"}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled || isLoading || message.trim() === ""}
            className="
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-2xl
              bg-blue-600
              text-white
              transition
              hover:bg-blue-500
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <SendHorizontal size={20} />
            )}
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-slate-500">
          MuthuAI can make mistakes. Please verify important information.
        </p>
      </div>
    </div>
  );
}