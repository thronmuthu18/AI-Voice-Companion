import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import EmptyState from "./EmptyState";
import AiPresence from "../ui/AiPresence";
import { useMessageStore } from "../../stores/message.store";
import type { Attachment } from "../../types/api.types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  attachments?: Attachment[];
}

interface ChatMessagesProps {
  messages: ChatMessage[];
}

export default function ChatMessages({
  messages,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const isLoading = useMessageStore((state) => state.isLoading);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              timestamp={msg.timestamp}
              attachments={msg.attachments}
            />
          ))
        )}

        {isLoading && (
          <div className="flex justify-start items-center">
            <div className="rounded-2xl border border-slate-200/40 dark:border-slate-800/30 bg-white/20 dark:bg-slate-950/15 px-5 py-3 shadow-md backdrop-blur-md flex items-center gap-3">
              <AiPresence state="thinking" size={20} />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Assistant is thinking...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}