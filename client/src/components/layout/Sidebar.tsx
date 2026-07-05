import { motion } from "framer-motion";
import {
  Bot,
  Plus,
  MessageSquare,
  Pin,
  Archive,
  Settings,
  User,
} from "lucide-react";

import SidebarItem from "./SidebarItem";

const recentChats = [
  {
    id: "1",
    title: "New Chat",
  },
  {
    id: "2",
    title: "React Learning",
  },
];

export default function Sidebar() {
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
            <h1 className="text-lg font-bold text-white">
              MuthuAI
            </h1>

            <p className="text-xs text-slate-400">
              AI Operating System
            </p>
          </div>
        </div>
      </div>

      {/* New Chat */}

      <div className="p-4">
        <button
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
          "
        >
          <Plus size={18} />

          New Chat
        </button>
      </div>

      {/* Navigation */}

      <nav className="px-3 space-y-2">

        <SidebarItem
          to="/chat"
          icon={MessageSquare}
          label="Chats"
        />

        <SidebarItem
          to="/pinned"
          icon={Pin}
          label="Pinned"
        />

        <SidebarItem
          to="/archived"
          icon={Archive}
          label="Archived"
        />

      </nav>

      {/* Recent Chats */}

      <div className="mt-8 px-5">

        <p className="text-xs uppercase text-slate-500 mb-3">
          Recent
        </p>

        <div className="space-y-2">

          {recentChats.map((chat) => (
            <button
              key={chat.id}
              className="
                w-full
                text-left
                rounded-lg
                px-3
                py-2
                text-slate-300
                hover:bg-slate-800
                transition
              "
            >
              {chat.title}
            </button>
          ))}

        </div>

      </div>

      <div className="flex-1" />

      {/* Bottom */}

      <div className="border-t border-slate-800 p-3">

        <SidebarItem
          to="/settings"
          icon={Settings}
          label="Settings"
        />

        <SidebarItem
          to="/profile"
          icon={User}
          label="Profile"
        />

      </div>

    </motion.aside>
  );
}