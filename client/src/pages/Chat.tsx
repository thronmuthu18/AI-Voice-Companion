import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import ChatMessages, {
  ChatMessage,
} from "../components/chat/ChatMessages";
import EmptyState from "../components/chat/EmptyState";
import ChatComposer from "../components/chat/ChatComposer";
import VoiceModeOverlay from "../components/chat/VoiceModeOverlay";
import { useChatStore } from "../stores/chat.store";
import { useMessageStore } from "../stores/message.store";
import { Upload } from "lucide-react";

export default function Chat() {
  const { currentChat, createChat, fetchChats } = useChatStore();
  const { messages, isLoading, sendMessage, fetchMessages } = useMessageStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<{
    files: File[];
    timestamp: number;
  } | null>(null);

  // Load messages whenever current chat changes
  useEffect(() => {
    if (currentChat?._id) {
      fetchMessages(currentChat._id).catch((err) => {
        console.error("Error fetching messages:", err);
      });
    }
  }, [currentChat?._id, fetchMessages]);

  const handleSend = async (content: string, attachments?: any[]) => {
    try {
      let chatId = currentChat?._id;

      // Auto-create chat if none is selected
      if (!chatId) {
        const newChat = await createChat("New Chat");
        chatId = newChat._id;
      }

      await sendMessage(chatId, content, attachments);

      // Refresh the chat list so the title (updated on server) refreshes
      await fetchChats();
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  // Drag & drop on full chat window
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only set dragging to false if we exit the parent container
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (
      x < rect.left ||
      x >= rect.right ||
      y < rect.top ||
      y >= rect.bottom
    ) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setDroppedFiles({
        files,
        timestamp: Date.now(),
      });
    }
  };

  // Map backend message format to ChatMessages component interface
  const formattedMessages: ChatMessage[] = messages.map((msg) => ({
    id: msg._id,
    role: msg.role || (msg as any).sender || "user",
    content: msg.content,
    attachments: msg.attachments,
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
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="relative flex flex-1 flex-col h-full overflow-hidden"
      >
        {/* Visual Drop Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md border-4 border-dashed border-blue-500/50 m-4 rounded-3xl pointer-events-none animate-fade-in">
            <div className="p-4 rounded-2xl bg-blue-600/10 border border-blue-500/30 text-blue-500 mb-3 animate-bounce">
              <Upload size={32} />
            </div>
            <h3 className="text-xl font-bold text-white">Drop files to upload</h3>
            <p className="text-sm text-slate-400 mt-1">
              Supports images, PDF, Word, Excel, PowerPoint, Text, and ZIP
            </p>
          </div>
        )}

        {formattedMessages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 max-w-4xl mx-auto w-full">
            <div className="w-full flex-1 flex items-center justify-center">
              <EmptyState />
            </div>
            <div className="w-full pb-8">
              <ChatComposer
                onSend={handleSend}
                isLoading={isLoading}
                droppedFiles={droppedFiles}
                onStartVoiceMode={() => setIsVoiceOpen(true)}
              />
            </div>
          </div>
        ) : (
          <>
            <ChatMessages messages={formattedMessages} />
            <ChatComposer
              onSend={handleSend}
              isLoading={isLoading}
              droppedFiles={droppedFiles}
              onStartVoiceMode={() => setIsVoiceOpen(true)}
            />
          </>
        )}

        {/* Real-time Voice Conversation Overlay */}
        <VoiceModeOverlay
          isOpen={isVoiceOpen}
          onClose={() => setIsVoiceOpen(false)}
        />
      </div>
    </AppShell>
  );
}