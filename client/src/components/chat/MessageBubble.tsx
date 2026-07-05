import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export default function MessageBubble({
  role,
  content,
  timestamp,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1500);
  };

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
        <button
          onClick={handleCopy}
          className="
            absolute
            right-3
            top-3
            rounded-lg
            p-1
            text-slate-400
            hover:text-white
            transition
          "
        >
          {copied ? (
            <Check size={16} />
          ) : (
            <Copy size={16} />
          )}
        </button>

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