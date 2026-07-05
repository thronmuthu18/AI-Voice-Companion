import {
  Archive,
  Clock3,
  MessageSquarePlus,
  Pin,
} from "lucide-react";
import { useChatStore } from "../../stores/chat.store";
import { useMessageStore } from "../../stores/message.store";
import { useEffect } from "react";

export default function ChatSidebar() {
  const { chats, currentChat, fetchChats, createChat, selectChat } = useChatStore();
  const { fetchMessages, clearMessages } = useMessageStore();

  useEffect(() => {
    fetchChats().catch((err) => console.error("Error fetching chats:", err));
  }, [fetchChats]);

  const handleNewChat = async () => {
    try {
      await createChat("New Chat");
      clearMessages();
    } catch (err) {
      console.error("Error creating chat:", err);
    }
  };

  const handleSelectChat = async (chat: any) => {
    selectChat(chat);
    try {
      await fetchMessages(chat._id);
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  return (
    <aside className="flex h-full w-72 flex-col border-r border-slate-800 bg-slate-950">
      {/* Header */}

      <div className="border-b border-slate-800 p-4">
        <button
          onClick={handleNewChat}
          className="
            flex
            w-full
            items-center
            justify-center
            gap-2
            rounded-xl
            bg-blue-600
            px-4
            py-3
            font-medium
            text-white
            transition
            hover:bg-blue-500
          "
        >
          <MessageSquarePlus size={18} />
          New Chat
        </button>
      </div>

      {/* Chat List */}

      <div className="flex-1 overflow-y-auto p-3">
        {chats.length === 0 ? (
          <div className="mt-10 text-center text-sm text-slate-500">
            No chats yet.
          </div>
        ) : (
          chats.map((chat) => {
            const isActive = currentChat?._id === chat._id;
            return (
              <button
                key={chat._id}
                onClick={() => handleSelectChat(chat)}
                className={`
                  mb-2
                  w-full
                  rounded-xl
                  px-3
                  py-3
                  text-left
                  transition
                  ${
                    isActive
                      ? "bg-slate-800 text-white font-semibold"
                      : "text-slate-300 hover:bg-slate-800"
                  }
                `}
              >
                <div className="truncate">{chat.title}</div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}

      <div className="border-t border-slate-800 p-3">
        <button className="mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-slate-300 transition hover:bg-slate-800">
          <Pin size={18} />
          Pinned
        </button>

        <button className="mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-slate-300 transition hover:bg-slate-800">
          <Archive size={18} />
          Archived
        </button>

        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-slate-300 transition hover:bg-slate-800">
          <Clock3 size={18} />
          History
        </button>
      </div>
    </aside>
  );
}