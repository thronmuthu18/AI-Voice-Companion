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
  CreditCard,
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

  const displayChats = (isPinnedRoute ? chats.filter((c) => c.isPinned) : chats).filter(
    (c) => c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedCount = chats.filter((c) => c.isPinned).length;

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="
        w-80
        h-screen
        p-4
        flex
        flex-col
        space-y-4
        bg-transparent
        overflow-hidden
      "
    >
      {/* 1. Logo Block (Independent Floating Glass Card) */}
      <div className="p-4 rounded-2xl border border-slate-200/40 dark:border-slate-800/50 bg-white/20 dark:bg-slate-950/30 backdrop-blur-md shadow-md flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Bot size={20} color="white" />
        </div>
        <div>
          <h1 className="text-md font-bold text-slate-800 dark:text-white leading-tight">MuthuAI</h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">AI Operating System</p>
        </div>
      </div>

      {/* 2. New Chat Button (Standalone floating CTA control with scale transition) */}
      <div>
        <button
          onClick={handleNewChat}
          className="
            w-full
            rounded-2xl
            bg-blue-600/90
            hover:bg-blue-600
            active:scale-95
            transition-all
            duration-200
            text-white
            py-3
            flex
            items-center
            justify-center
            gap-2
            font-medium
            shadow-lg
            shadow-blue-500/20
            backdrop-blur-md
            border
            border-blue-400/30
          "
        >
          <Plus size={18} />
          New Chat
        </button>
      </div>

      {/* 3. Navigation Folders (Floating Glass bento panel) */}
      <nav className="p-2 rounded-2xl border border-slate-200/40 dark:border-slate-800/50 bg-white/20 dark:bg-slate-950/30 backdrop-blur-md shadow-sm space-y-1">
        <SidebarItem to="/chat" icon={MessageSquare} label="Chats" />
        <SidebarItem to="/pinned" icon={Pin} label="Pinned" badge={pinnedCount} />
        <SidebarItem to="/archived" icon={Archive} label="Archived" />
        <SidebarItem to="/pricing" icon={CreditCard} label="Subscription" />
      </nav>

      {/* 4. Recent Chats Area (Independent Floating scroll view where every chat is an object) */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0">
        <p className="text-[10px] uppercase text-slate-500 dark:text-slate-400 pl-2 font-bold tracking-widest">
          {isPinnedRoute ? "Pinned Chats" : isArchivedRoute ? "Archived Chats" : "Recent Conversations"}
        </p>

        <div className="space-y-2 pb-2">
          {displayChats.length === 0 ? (
            <div className="text-xs text-slate-500 dark:text-slate-450 p-4 text-center rounded-2xl border border-slate-250/20 dark:border-slate-800/20 bg-white/5 dark:bg-slate-950/5">
              {searchQuery ? "No matching chats found" : "No chats in this folder"}
            </div>
          ) : (
            displayChats.map((chat) => {
              const isActive = currentChat?._id === chat._id;
              return (
                <div
                  key={chat._id}
                  className={`
                    group 
                    relative 
                    flex 
                    items-center 
                    w-full 
                    rounded-2xl 
                    border 
                    transition-all 
                    duration-200 
                    shadow-sm
                    ${
                      isActive
                        ? "border-blue-500/80 bg-blue-600/10 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                        : "border-slate-200/40 dark:border-slate-800/40 bg-white/20 dark:bg-slate-950/20 text-slate-700 dark:text-slate-400 hover:border-slate-350 dark:hover:border-slate-700 hover:bg-white/40 dark:hover:bg-slate-900/30"
                    }
                  `}
                >
                  <button
                    onClick={() => handleSelectChat(chat)}
                    className="
                      flex-1
                      text-left
                      px-4
                      py-3
                      pr-20
                      text-sm
                      truncate
                      transition-colors
                      font-medium
                    "
                  >
                    {chat.title}
                  </button>

                  {/* Actions (visible on hover over the chat item) */}
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
                      bg-white/90
                      dark:bg-slate-900/90
                      backdrop-blur-sm
                      px-1
                      py-0.5
                      rounded-lg
                      border
                      border-slate-200
                      dark:border-slate-800
                      shadow-md
                    "
                  >
                    {/* Pin button */}
                    {!chat.isArchived && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          pinChat(chat._id);
                        }}
                        className={`p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                          chat.isPinned ? "text-blue-500" : "text-slate-400 hover:text-slate-650 dark:hover:text-white"
                        }`}
                        title={chat.isPinned ? "Unpin Chat" : "Pin Chat"}
                      >
                        <Pin size={12} className={chat.isPinned ? "fill-blue-500" : ""} />
                      </button>
                    )}

                    {/* Archive button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        archiveChat(chat._id);
                      }}
                      className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 dark:hover:text-white transition"
                      title={chat.isArchived ? "Unarchive" : "Archive"}
                    >
                      <Archive size={12} />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this conversation permanent?")) {
                          deleteChat(chat._id);
                        }
                      }}
                      className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition"
                      title="Delete Permanently"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 5. Sidebar Footer Controls (Floating Bento panel at the bottom) */}
      <div className="mt-auto pt-2">
        <div className="rounded-2xl border border-slate-200/40 dark:border-slate-800/50 bg-white/20 dark:bg-slate-950/30 backdrop-blur-md p-1.5 shadow-sm space-y-1">
          <SidebarItem to="/settings" icon={Settings} label="Settings" />
          <SidebarItem to="/profile" icon={User} label="Profile" />
        </div>
      </div>
    </motion.aside>
  );
}