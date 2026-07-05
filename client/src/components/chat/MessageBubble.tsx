import { Copy, Check, Volume2, VolumeX } from "lucide-react";
import { useState, useEffect } from "react";
import type { Attachment } from "../../types/api.types";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  attachments?: Attachment[];
}

export default function MessageBubble({
  role,
  content,
  timestamp,
  attachments,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [isPlayingSpeech, setIsPlayingSpeech] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1500);
  };

  const handleSpeak = () => {
    if (isPlayingSpeech) {
      window.speechSynthesis.cancel();
      setIsPlayingSpeech(false);
    } else {
      // Cancel any ongoing playbacks first
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(content);

      // Auto-detect Tamil vs English
      // Tamil unicode block range: \u0B80-\u0BFF
      const isTamil = /[\u0B80-\u0BFF]/.test(content);
      utterance.lang = isTamil ? "ta-IN" : "en-US";

      utterance.onend = () => {
        setIsPlayingSpeech(false);
      };
      utterance.onerror = () => {
        setIsPlayingSpeech(false);
      };

      setIsPlayingSpeech(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Clean up speech synthesis on bubble unmount
  useEffect(() => {
    return () => {
      if (isPlayingSpeech) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isPlayingSpeech]);

  const isUser = role === "user";

  return (
    <div
      className={`flex w-full ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`
          relative
          max-w-3xl
          rounded-2xl
          px-5
          py-4
          shadow-lg
          ${
            isUser
              ? "bg-blue-600 text-white"
              : "bg-slate-900 border border-slate-800 text-slate-100"
          }
        `}
      >
        {/* Action Controls */}
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          {!isUser && (
            <button
              onClick={handleSpeak}
              className={`
                rounded-lg
                p-1
                transition
                ${isPlayingSpeech ? "text-blue-500 animate-pulse" : "text-slate-400 hover:text-white"}
              `}
              title={isPlayingSpeech ? "Stop Speaking" : "Read Aloud"}
            >
              {isPlayingSpeech ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          )}

          <button
            onClick={handleCopy}
            className="
              rounded-lg
              p-1
              text-slate-400
              hover:text-white
              transition
            "
            title="Copy Text"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>

        {/* Display Attachments */}
        {attachments && attachments.map((att, idx) => (
          att.mimeType.startsWith("image/") && (
            <img
              key={idx}
              src={att.url}
              alt={att.name}
              className="max-h-60 max-w-full rounded-lg object-contain mb-3 border border-slate-800 bg-slate-950/20"
            />
          )
        ))}

        <p className="whitespace-pre-wrap break-words pr-8">
          {content}
        </p>

        {timestamp && (
          <p className="mt-3 text-xs opacity-60">
            {timestamp}
          </p>
        )}
      </div>
    </div>
  );
}