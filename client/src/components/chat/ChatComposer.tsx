import {
  Loader2,
  Mic,
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

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!textareaRef.current) return;

    textareaRef.current.style.height = "0px";

    textareaRef.current.style.height =
      textareaRef.current.scrollHeight + "px";
  }, [message]);

  const handleSend = () => {
    const trimmed = message.trim();

    if (!trimmed) return;

    if (disabled || isLoading) return;

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
            onChange={(e) =>
              setMessage(e.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="Message MuthuAI..."
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

          {/* Voice */}

          <button
            type="button"
            disabled={disabled || isLoading}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            <Mic size={20} />
          </button>

          {/* Send */}

          <button
            type="button"
            onClick={handleSend}
            disabled={
              disabled ||
              isLoading ||
              message.trim() === ""
            }
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
              <Loader2
                size={18}
                className="animate-spin"
              />
            ) : (
              <SendHorizontal size={20} />
            )}
          </button>

        </div>

        <p className="mt-3 text-center text-xs text-slate-500">
          MuthuAI can make mistakes. Please verify
          important information.
        </p>

      </div>
    </div>
  );
}