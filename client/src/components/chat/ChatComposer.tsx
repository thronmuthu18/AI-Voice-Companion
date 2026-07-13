import {
  Loader2,
  Mic,
  Paperclip,
  SendHorizontal,
  X,
  FileText,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Attachment } from "../../types/api.types";
import api from "../../services/api";
import { API_BASE_URL } from "../../lib/constants";
import AiPresence from "../ui/AiPresence";

interface ChatComposerProps {
  disabled?: boolean;
  isLoading?: boolean;
  onSend: (message: string, attachments?: Attachment[]) => void;
  droppedFiles?: { files: File[]; timestamp: number } | null;
}

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  error: string | null;
  file: File;
}

export default function ChatComposer({
  disabled = false,
  isLoading = false,
  onSend,
  droppedFiles = null,
}: ChatComposerProps) {
  const [message, setMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  
  // Plural attachments and upload states
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  // Multilingual Speech Input Lang selection state
  const [speechLang, setSpeechLang] = useState(() => {
    return localStorage.getItem("champai_speech_lang") || "en-US";
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea on input
  useEffect(() => {
    if (!textareaRef.current) return;

    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height =
      textareaRef.current.scrollHeight + "px";
  }, [message]);

  // Handle forwarded dropped files from AppShell / Chat view
  useEffect(() => {
    if (droppedFiles && droppedFiles.files.length > 0) {
      droppedFiles.files.forEach(uploadFile);
    }
  }, [droppedFiles]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const uploadFile = async (file: File) => {
    const fileId = Math.random().toString(36).substring(2, 9);
    
    // Add to active upload list
    setUploadingFiles((prev) => [
      ...prev,
      { id: fileId, name: file.name, progress: 0, error: null, file },
    ]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          setUploadingFiles((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, progress } : f))
          );
        },
      });

      const att: Attachment = response.data.attachment;
      setAttachments((prev) => [...prev, att]);
      
      // Remove from active uploads on completion
      setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err: any) {
      console.error("File upload failed:", file.name, err);
      const errorMsg =
        err.response?.data?.message || "Upload failed. Click to retry.";
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, error: errorMsg, progress: 0 } : f
        )
      );
    }
  };

  const retryUpload = (id: string) => {
    const target = uploadingFiles.find((f) => f.id === id);
    if (!target) return;

    // Reset error state
    setUploadingFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, error: null, progress: 0 } : f))
    );

    uploadFile(target.file);
  };

  const cancelUpload = (id: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed && attachments.length === 0) return;
    if (disabled || isLoading || uploadingFiles.some((f) => !f.error)) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }

    onSend(trimmed, attachments);

    setMessage("");
    setAttachments([]);
    setUploadingFiles([]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      files.forEach(uploadFile);
    }
    if (e.target) e.target.value = "";
  };

  const handlePaperclipClick = () => {
    fileInputRef.current?.click();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (disabled || isLoading) return;
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            uploadFile(file);
            e.preventDefault();
            break;
          }
        }
      }
    }
  };

  const toggleSpeechLang = () => {
    const nextLang = speechLang === "en-US" ? "ta-IN" : "en-US";
    setSpeechLang(nextLang);
    localStorage.setItem("champai_speech_lang", nextLang);
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
        recognition.lang = speechLang;

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

  const isUploadingAny = uploadingFiles.some((f) => !f.error);
  const backendRoot = API_BASE_URL.replace("/api", "");

  return (
    <div
      className="
        bg-transparent
        px-6
        pb-6
        pt-2
        transition-all
        duration-300
      "
    >
      <div className="mx-auto max-w-4xl">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept="image/*,.pdf,.docx,.doc,.txt,.md,.csv,.xlsx,.xls,.pptx,.ppt,.zip,.mp3,.wav,.mp4"
          className="hidden"
        />

        {/* Media Preview Container */}
        {(attachments.length > 0 || uploadingFiles.length > 0) && (
          <div className="flex flex-wrap gap-3 mb-4 max-h-48 overflow-y-auto p-1">
            {/* Completed Uploads */}
            {attachments.map((att, idx) => {
              const isImg = att.mimeType.startsWith("image/");
              const resolvedUrl = att.url.startsWith("http") || att.url.startsWith("data:")
                ? att.url
                : `${backendRoot}${att.url}`;

              return (
                <div
                  key={`att-${idx}`}
                  className="relative flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-2.5 pr-10 shadow-lg group hover:border-slate-700 transition"
                >
                  <div className="relative h-11 w-11 flex items-center justify-center rounded-xl border border-slate-750 bg-slate-950 text-blue-500 overflow-hidden">
                    {isImg ? (
                      <img
                        src={resolvedUrl}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <FileText size={20} />
                    )}
                  </div>
                  <div className="min-w-0 max-w-[150px]">
                    <p className="text-xs font-semibold text-white truncate">
                      {att.name}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {(att.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="absolute right-2 top-2 rounded-full p-1 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition shadow-sm"
                    title="Remove File"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}

            {/* Active Uploads & Errors */}
            {uploadingFiles.map((uf) => (
              <div
                key={`uf-${uf.id}`}
                className={`relative flex items-center gap-3 rounded-2xl border p-2.5 pr-10 shadow-lg min-w-[200px] transition ${
                  uf.error
                    ? "border-red-900/50 bg-red-950/10"
                    : "border-slate-800 bg-slate-900/30"
                }`}
              >
                <div className="relative h-11 w-11 flex items-center justify-center rounded-xl border border-slate-750 bg-slate-950 text-slate-500">
                  {uf.error ? (
                    <AlertCircle size={20} className="text-red-500" />
                  ) : (
                    <Loader2 size={20} className="animate-spin text-blue-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate pr-4">
                    {uf.name}
                  </p>
                  {uf.error ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-red-400 font-medium">
                        Failed
                      </span>
                      <button
                        type="button"
                        onClick={() => retryUpload(uf.id)}
                        className="text-[10px] text-blue-400 font-bold hover:underline flex items-center gap-0.5"
                      >
                        <RotateCcw size={8} /> Retry
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1 w-full bg-slate-800 rounded-full h-1">
                      <div
                        className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${uf.progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => cancelUpload(uf.id)}
                  className="absolute right-2 top-2 rounded-full p-1 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition shadow-sm"
                  title="Cancel upload"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          className="
            flex
            items-end
            gap-3
            rounded-3xl
            border
            border-slate-200/50
            dark:border-slate-800/40
            p-3
            shadow-xl
            bg-white/25
            dark:bg-slate-950/25
            backdrop-blur-md
            transition-all
            duration-250
            focus-within:border-blue-500/60
            focus-within:ring-2
            focus-within:ring-blue-500/20
          "
        >
          <button
            type="button"
            onClick={handlePaperclipClick}
            disabled={disabled || isLoading || isUploadingAny}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-200/50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white disabled:opacity-50"
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
            onPaste={handlePaste}
            placeholder={
              isListening
                ? `Listening in ${speechLang === "ta-IN" ? "Tamil" : "English"}...`
                : "Message Champ.ai (Paste or Drag files directly)..."
            }
            className="
              min-h-[28px]
              max-h-40
              flex-1
              resize-none
              overflow-y-auto
              bg-transparent
              text-slate-800
              dark:text-white
              placeholder:text-slate-400
              dark:placeholder:text-slate-500
              outline-none
            "
          />

          {/* Multilingual Voice Language Toggle */}
          <button
            type="button"
            onClick={toggleSpeechLang}
            disabled={disabled || isLoading || isListening}
            className="
              rounded-xl
              px-2.5
              py-1.5
              text-xs
              font-extrabold
              border
              border-slate-800
              bg-slate-950/70
              text-slate-400
              hover:text-white
              transition
              disabled:opacity-50
              mb-1
            "
            title={`Active Language: ${
              speechLang === "ta-IN" ? "Tamil" : "English"
            }. Click to toggle.`}
          >
            {speechLang === "ta-IN" ? "தமிழ்" : "EN"}
          </button>

          <button
            type="button"
            onClick={toggleListening}
            disabled={disabled || isLoading || isUploadingAny}
            className={`rounded-xl p-2 transition duration-200 disabled:opacity-50 hover:scale-105 active:scale-95 flex items-center justify-center ${
              isListening
                ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                : "text-slate-450 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white"
            }`}
            title={isListening ? "Stop Listening" : "Start Voice Input"}
          >
            {isListening ? <AiPresence state="listening" size={20} /> : <Mic size={20} />}
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={
              disabled ||
              isLoading ||
              isUploadingAny ||
              (message.trim() === "" && attachments.length === 0)
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
              duration-200
              hover:bg-blue-500
              hover:scale-105
              active:scale-95
              disabled:cursor-not-allowed
              disabled:opacity-50
              disabled:scale-100
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
          Champ.ai can make mistakes. Please verify important information.
        </p>
      </div>
    </div>
  );
}