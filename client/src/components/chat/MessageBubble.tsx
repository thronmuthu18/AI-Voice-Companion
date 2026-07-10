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
import { motion } from "framer-motion";
import type { Attachment } from "../../types/api.types";
import { API_BASE_URL } from "../../lib/constants";

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
      const targetLang = isTamil ? "ta-IN" : "en-US";
      utterance.lang = targetLang;

      const voices = window.speechSynthesis.getVoices();
      const matchingVoices = voices.filter(
        (v) =>
          v.lang.startsWith(targetLang) ||
          v.lang.startsWith(isTamil ? "ta" : "en")
      );

      const bestVoice =
        matchingVoices.find((v) =>
          v.name.toLowerCase().includes("google")
        ) ||
        matchingVoices.find((v) =>
          v.name.toLowerCase().includes("microsoft")
        ) ||
        matchingVoices.find((v) =>
          v.name.toLowerCase().includes("natural")
        ) ||
        matchingVoices[0];

      if (bestVoice) {
        utterance.voice = bestVoice;
      }

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
  const backendRoot = API_BASE_URL.replace("/api", "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
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
          backdrop-blur-md
          ${
            isUser
              ? "bg-blue-600/90 text-white dark:bg-blue-600/90 border border-blue-500/30 shadow-md"
              : "bg-white/25 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800/40 text-slate-800 dark:text-slate-100"
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
                ${isPlayingSpeech ? "text-blue-500 animate-pulse" : "text-slate-400 hover:text-slate-800 dark:hover:text-white"}
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
              hover:text-slate-800
              dark:hover:text-white
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
            // Build full URL if relative
            const fullUrl = att.url.startsWith("http") || att.url.startsWith("data:")
              ? att.url
              : `${backendRoot}${att.url}`;

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
                    src={fullUrl}
                    alt={att.name}
                    className="max-h-60 max-w-full object-contain transition duration-300 group-hover/img:scale-[1.02]"
                  />
                  {/* Glassmorphic hover overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition duration-200 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedImageUrl(fullUrl)}
                      className="p-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white hover:bg-slate-800 transition"
                      title="Expand Image"
                    >
                      <Maximize2 size={16} />
                    </button>

                    <a
                      href={fullUrl}
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
                href={fullUrl}
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
    </motion.div>
  );
}