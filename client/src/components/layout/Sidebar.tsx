import { motion } from "framer-motion";
import {
  Bot,
  Plus,
  MessageSquare,
  Pin,
  Archive,
  Settings,
  User,
  Trash2,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useChatStore } from "../../stores/chat.store";
import { useMessageStore } from "../../stores/message.store";
import SidebarItem from "./SidebarItem";
import type { Chat } from "../../types/api.types";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    chats,
    currentChat,
    fetchChats,
    createChat,
    selectChat,
    pinChat,
    archiveChat,
    deleteChat,
    searchQuery,
  } = useChatStore();

  const isPinnedRoute = location.pathname === "/pinned";
  const isArchivedRoute = location.pathname === "/archived";

  // Fetch chats on mount, and whenever switching between active and archived views
  useEffect(() => {
    fetchChats(isArchivedRoute).catch((err) =>
      console.error("Error loading sidebar chats:", err)
    );
  }, [fetchChats, isArchivedRoute]);

  const handleNewChat = async () => {
    try {
      await createChat("New Chat");
      useMessageStore.getState().clearMessages();
      if (location.pathname !== "/chat") {
        navigate("/chat");
      }
    } catch (err) {
      console.error("Error creating chat:", err);
    }
  };

  const handleSelectChat = (chat: Chat) => {
    selectChat(chat);
    if (location.pathname !== "/chat") {
      navigate("/chat");
    }
  };

  // Filter chats by search query and pin status
  const displayChats = (isPinnedRoute ? chats.filter((c) => c.isPinned) : chats).filter(
    (c) => c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedCount = chats.filter((c) => c.isPinned).length;

  return (
    <motion.aside
      initial={{ x: -30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="
        w-80
        h-screen
        border-r
        border-slate-800
        bg-slate-950/80
        backdrop-blur-xl
        flex
        flex-col
      "
    >
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className="
              h-11
              w-11
              rounded-xl
              bg-blue-600
              flex
              items-center
              justify-center
            "
          >
            <Bot size={22} color="white" />
          </div>

          <div>
            <h1 className="text-lg font-bold text-white">MuthuAI</h1>
            <p className="text-xs text-slate-400">AI Operating System</p>
          </div>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <button
          onClick={handleNewChat}
          className="
            w-full
            rounded-xl
            bg-blue-600
            hover:bg-blue-500
            transition
            text-white
            py-3
            flex
            items-center
            justify-center
            gap-2
            font-medium
          "
        >
          <Plus size={18} />
          New Chat
        </button>
      </div>

      {/* Navigation */}
      <nav className="px-3 space-y-1">
        <SidebarItem to="/chat" icon={MessageSquare} label="Chats" />
        <SidebarItem to="/pinned" icon={Pin} label="Pinned" badge={pinnedCount} />
        <SidebarItem to="/archived" icon={Archive} label="Archived" />
      </nav>

      {/* Recent Chats Section */}
      <div className="mt-6 px-5 flex-1 overflow-y-auto min-h-0">
        <p className="text-xs uppercase text-slate-500 mb-3 font-semibold tracking-wider">
          {isPinnedRoute ? "Pinned Chats" : isArchivedRoute ? "Archived Chats" : "Recent Conversations"}
        </p>

        <div className="space-y-1 pb-4">
          {displayChats.length === 0 ? (
            <div className="text-sm text-slate-600 py-2 pl-1">
              {searchQuery ? "No matching chats found" : "No chats in this folder"}
            </div>
          ) : (
            displayChats.map((chat) => {
              const isActive = currentChat?._id === chat._id;
              return (
                <div
                  key={chat._id}
                  className="group relative flex items-center w-full rounded-lg hover:bg-slate-800 transition"
                >
                  <button
                    onClick={() => handleSelectChat(chat)}
                    className={`
                      flex-1
                      text-left
                      px-3
                      py-2.5
                      pr-20
                      text-sm
                      truncate
                      transition
                      rounded-lg
                      ${isActive ? "text-white font-medium bg-slate-800" : "text-slate-400 hover:text-white"}
                    `}
                  >
                    {chat.title}
                  </button>

                  {/* Actions (visible on hover) */}
                  <div
                    className="
                      absolute
                      right-2
                      opacity-0
                      group-hover:opacity-100
                      flex
                      items-center
                      gap-0.5
                      transition-opacity
                      duration-150
                      bg-slate-800/90
                      backdrop-blur-sm
                      px-1
                      py-0.5
                      rounded-md
                      border
                      border-slate-700
                    "
                  >
                    {/* Pin button */}
                    {!chat.isArchived && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          pinChat(chat._id);
                        }}
                        className={`p-1 rounded hover:bg-slate-700 transition ${
                          chat.isPinned ? "text-blue-500" : "text-slate-400 hover:text-white"
                        }`}
                        title={chat.isPinned ? "Unpin Chat" : "Pin Chat"}
                      >
                        <Pin size={14} className={chat.isPinned ? "fill-blue-500" : ""} />
                      </button>
                    )}

                    {/* Archive button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        archiveChat(chat._id);
                      }}
                      className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition"
                      title={chat.isArchived ? "Unarchive" : "Archive"}
                    >
                      <Archive size={14} />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this conversation permanent?")) {
                          deleteChat(chat._id);
                        }
                      }}
                      className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-red-500 transition"
                      title="Delete Permanently"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="border-t border-slate-800 p-3 space-y-1 bg-slate-950">
        <SidebarItem to="/settings" icon={Settings} label="Settings" />
        <SidebarItem to="/profile" icon={User} label="Profile" />
      </div>
    </motion.aside>
  );
}