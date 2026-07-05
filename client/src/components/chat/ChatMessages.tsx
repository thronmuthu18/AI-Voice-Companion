import { useEffect, useRef } from "react";
import EmptyState from "./EmptyState";
import MessageBubble from "./MessageBubble";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
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

  if (messages.length === 0) {
    return <EmptyState />;
  }

  return (
    <div
      className="
        flex-1
        overflow-y-auto
        px-6
        py-8
      "
    >
      <div
        className="
          mx-auto
          flex
          max-w-4xl
          flex-col
          gap-6
        "
      >
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            role={message.role}
            content={message.content}
            timestamp={message.timestamp}
          />
        ))}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}