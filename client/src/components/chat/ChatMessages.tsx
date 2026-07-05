import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {messages.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center text-slate-500">
            Send a message to start the conversation
          </div>
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
        <div ref={bottomRef} />
      </div>
    </div>
  );
}