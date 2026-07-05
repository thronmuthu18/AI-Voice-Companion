import {
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  SendHorizontal,
  X,
  FileText,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Attachment } from "../../types/api.types";

interface ChatComposerProps {
  disabled?: boolean;
  isLoading?: boolean;
  onSend: (message: string, attachment?: Attachment) => void;
}

export default function ChatComposer({
  disabled = false,
  isLoading = false,
  onSend,
}: ChatComposerProps) {
  const [message, setMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!textareaRef.current) return;

    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height =
      textareaRef.current.scrollHeight + "px";
  }, [message]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed && !attachment) return;
    if (disabled || isLoading || isUploading) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }

    onSend(trimmed, attachment || undefined);

    setMessage("");
    setAttachment(null);

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

  const processFile = (file: File) => {
    let mimeType = file.type;

    // Normalize file type if empty (browser fails to map extensions)
    if (!mimeType) {
      if (file.name.endsWith(".md")) {
        mimeType = "text/markdown";
      } else if (file.name.endsWith(".txt")) {
        mimeType = "text/plain";
      } else if (file.name.endsWith(".pdf")) {
        mimeType = "application/pdf";
      } else if (file.name.endsWith(".docx")) {
        mimeType =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      } else if (file.name.endsWith(".doc")) {
        mimeType = "application/msword";
      }
    }

    const isImage = mimeType.startsWith("image/");
    const isDoc =
      mimeType === "application/pdf" ||
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword" ||
      mimeType === "text/plain" ||
      mimeType === "text/markdown" ||
      mimeType.startsWith("text/");

    if (!isImage && !isDoc) {
      alert(
        "Unsupported file type. Please upload an image, PDF, DOCX, TXT, or Markdown document."
      );
      return;
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB.");
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      setAttachment({
        name: file.name,
        mimeType,
        url: e.target?.result as string,
        size: file.size,
      });
      setIsUploading(false);
    };
    reader.onerror = () => {
      alert("Failed to read file.");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    if (e.target) e.target.value = "";
  };

  const handlePaperclipClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || isLoading) return;
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isLoading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
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
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
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
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        border-t
        border-slate-800
        bg-slate-950/80
        backdrop-blur-xl
        px-6
        py-5
        transition-colors
        duration-200
        ${isDragging ? "bg-blue-600/5" : ""}
      `}
    >
      <div className="mx-auto max-w-4xl">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,.pdf,.docx,.doc,.txt,.md"
          className="hidden"
        />

        {/* Attachment preview pill card */}
        {attachment && (
          <div className="relative inline-flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-2.5 pr-12 mb-3 shadow-lg group">
            <div className="relative h-12 w-12 flex items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-blue-500">
              {attachment.mimeType.startsWith("image/") ? (
                <img
                  src={attachment.url}
                  alt="Upload preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <FileText size={24} />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-white truncate max-w-[180px]">
                {attachment.name}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {(attachment.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="absolute right-2 top-2 rounded-full p-1 bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-white transition-all shadow-sm"
              title="Remove attachment"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {isUploading && (
          <div className="flex items-center gap-2 text-xs text-blue-400 mb-3 animate-pulse">
            <Loader2 size={14} className="animate-spin" />
            <span>Reading file...</span>
          </div>
        )}

        <div
          className={`
            flex
            items-end
            gap-3
            rounded-3xl
            border
            p-3
            shadow-xl
            bg-slate-900
            transition-all
            duration-250
            ${isDragging ? "border-blue-500 scale-[1.01]" : "border-slate-800"}
          `}
        >
          <button
            type="button"
            onClick={handlePaperclipClick}
            disabled={disabled || isLoading || isUploading}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
            title="Attach File"
          >
            <Paperclip size={20} />
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={message}
            disabled={disabled || isLoading}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? "Listening... Speak now."
                : isDragging
                ? "Drop file here..."
                : "Message MuthuAI..."
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

          <button
            type="button"
            onClick={toggleListening}
            disabled={disabled || isLoading || isUploading}
            className={`rounded-xl p-2 transition disabled:opacity-50 ${
              isListening
                ? "bg-red-600 text-white animate-pulse"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
            title={isListening ? "Stop Listening" : "Start Voice Input"}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={
              disabled ||
              isLoading ||
              isUploading ||
              (message.trim() === "" && !attachment)
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