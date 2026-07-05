import { Bell, Search, Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useChatStore } from "../../stores/chat.store";
import { useAuthStore } from "../../stores/auth.store";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentChat, searchQuery, setSearchQuery } = useChatStore();
  const user = useAuthStore((state) => state.user);

  // Set titles based on the active path/selection
  let title = "Welcome 👋";
  let subtitle = "MuthuAI Operating System";

  if (location.pathname === "/settings") {
    title = "Settings";
    subtitle = "Configure your AI operating system";
  } else if (location.pathname === "/profile") {
    title = "Profile";
    subtitle = "Manage your user profile details";
  } else if (currentChat && (location.pathname === "/chat" || location.pathname === "/pinned" || location.pathname === "/archived")) {
    title = currentChat.title;
    subtitle = chatSubtitle(currentChat);
  }

  function chatSubtitle(chat: any) {
    if (chat.isPinned) return "Pinned AI Conversation";
    if (chat.isArchived) return "Archived AI Conversation";
    return "AI Conversation";
  }

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "M";

  return (
    <header
      className="
        h-16
        border-b
        border-slate-800
        bg-slate-950/70
        backdrop-blur-xl
        px-6
        flex
        items-center
        justify-between
        z-30
      "
    >
      {/* Left */}
      <div className="flex-1 min-w-0 pr-4">
        <h1 className="text-xl font-bold text-white truncate max-w-[280px] md:max-w-md">
          {title}
        </h1>

        <p className="text-xs text-slate-400 truncate">
          {subtitle}
        </p>
      </div>

      {/* Center - Search */}
      <div className="hidden md:flex items-center w-[360px] mx-4">
        <div
          className="
            flex
            items-center
            gap-3
            w-full
            rounded-xl
            bg-slate-900
            border
            border-slate-800
            px-4
            py-1.5
          "
        >
          <Search size={16} className="text-slate-500" />

          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="
              w-full
              bg-transparent
              outline-none
              text-sm
              text-white
              placeholder:text-slate-500
            "
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <button
          className="
            p-2
            rounded-xl
            hover:bg-slate-800
            transition
            text-slate-300
            hover:text-white
          "
        >
          <Bell size={18} />
        </button>

        <button
          onClick={() => navigate("/settings")}
          className="
            p-2
            rounded-xl
            hover:bg-slate-800
            transition
            text-slate-300
            hover:text-white
          "
        >
          <Settings size={18} />
        </button>

        <button
          onClick={() => navigate("/profile")}
          className="
            h-9
            w-9
            rounded-full
            bg-blue-600
            flex
            items-center
            justify-center
            text-white
            font-bold
            hover:bg-blue-500
            transition
            text-sm
          "
        >
          {userInitial}
        </button>
      </div>
    </header>
  );
}