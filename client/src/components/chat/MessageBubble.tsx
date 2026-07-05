import {
  Copy,
  Check,
  Volume2,
  VolumeX,
  FileText,
  Maximize2,
  Download,
  X,
} from "lucide-react";
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
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);

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
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(content);

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
        <div className="absolute right-3 top-3 flex items-center gap-1.5 font-sans z-10">
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
        {attachments &&
          attachments.map((att, idx) => {
            const isImage = att.mimeType.startsWith("image/");
            if (isImage) {
              return (
                <div
                  key={idx}
                  className="
                    relative
                    group/img
                    max-w-full
                    inline-block
                    rounded-xl
                    overflow-hidden
                    border
                    border-slate-800
                    bg-slate-950/20
                    mb-3
                    cursor-pointer
                  "
                >
                  <img
                    src={att.url}
                    alt={att.name}
                    className="max-h-60 max-w-full object-contain transition duration-300 group-hover/img:scale-[1.02]"
                  />
                  {/* Glassmorphic hover overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition duration-200 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedImageUrl(att.url)}
                      className="p-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white hover:bg-slate-800 transition"
                      title="Expand Image"
                    >
                      <Maximize2 size={16} />
                    </button>

                    <a
                      href={att.url}
                      download={att.name}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white hover:bg-slate-800 transition flex items-center justify-center"
                      title="Download Image"
                    >
                      <Download size={16} />
                    </a>
                  </div>
                </div>
              );
            }
            return (
              <a
                key={idx}
                href={att.url}
                download={att.name}
                className="
                  flex
                  items-center
                  gap-3
                  rounded-xl
                  border
                  border-slate-800
                  bg-slate-950/45
                  p-3
                  mb-3
                  max-w-md
                  hover:bg-slate-900/50
                  transition
                  cursor-pointer
                  text-slate-100
                "
              >
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500">
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-white">
                    {att.name}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {(att.size / 1024).toFixed(1)} KB • Document
                  </p>
                </div>
              </a>
            );
          })}

        <p className="whitespace-pre-wrap break-words pr-8">
          {content}
        </p>

        {timestamp && (
          <p className="mt-3 text-xs opacity-60">
            {timestamp}
          </p>
        )}
      </div>

      {/* Full screen modal overlay for image zoom */}
      {expandedImageUrl && (
        <div
          onClick={() => setExpandedImageUrl(null)}
          className="
            fixed
            inset-0
            z-[100]
            bg-black/90
            backdrop-blur-md
            flex
            items-center
            justify-center
            p-4
            cursor-zoom-out
            animate-fade-in
          "
        >
          <img
            src={expandedImageUrl}
            alt="Expanded preview"
            className="
              max-w-full
              max-h-full
              object-contain
              rounded-xl
              shadow-2xl
              transition-transform
              duration-200
            "
          />
          <button
            type="button"
            onClick={() => setExpandedImageUrl(null)}
            className="
              absolute
              top-6
              right-6
              rounded-full
              p-2.5
              bg-slate-900/80
              border
              border-slate-700
              text-white
              hover:bg-slate-800
              transition
            "
            title="Close Preview"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}