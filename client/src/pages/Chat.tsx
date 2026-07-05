import { useEffect } from "react";
import AppShell from "../components/layout/AppShell";
import ChatMessages, {
  ChatMessage,
} from "../components/chat/ChatMessages";
import ChatComposer from "../components/chat/ChatComposer";
import { useChatStore } from "../stores/chat.store";
import { useMessageStore } from "../stores/message.store";

export default function Chat() {
  const { currentChat, createChat, fetchChats } = useChatStore();
  const { messages, isLoading, sendMessage, fetchMessages } = useMessageStore();

  // Load messages whenever current chat changes
  useEffect(() => {
    if (currentChat?._id) {
      fetchMessages(currentChat._id).catch((err) => {
        console.error("Error fetching messages:", err);
      });
    }
  }, [currentChat?._id, fetchMessages]);

  const handleSend = async (content: string) => {
    try {
      let chatId = currentChat?._id;

      // Auto-create chat if none is selected
      if (!chatId) {
        const newChat = await createChat("New Chat");
        chatId = newChat._id;
      }

      await sendMessage(chatId, content);

      // Refresh the chat list so the title (updated on server) refreshes
      await fetchChats();
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  // Map backend message format to ChatMessages component interface
  const formattedMessages: ChatMessage[] = messages.map((msg) => ({
    id: msg._id,
    role: msg.role || (msg as any).sender || "user",
    content: msg.content,
    timestamp: msg.createdAt
      ? new Date(msg.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
  }));

  return (
    <AppShell noPadding noScroll>
      <div className="flex flex-1 flex-col h-full overflow-hidden">
        <ChatMessages messages={formattedMessages} />

        <ChatComposer
          onSend={handleSend}
          isLoading={isLoading}
        />
      </div>
    </AppShell>
  );
}