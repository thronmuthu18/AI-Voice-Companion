import { Bell, Search, Settings } from "lucide-react";

export default function Header() {
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
      "
    >
      {/* Left */}
      <div>
        <h1 className="text-xl font-bold text-white">
          Welcome 👋
        </h1>

        <p className="text-sm text-slate-400">
          MuthuAI Operating System
        </p>
      </div>

      {/* Center */}
      <div className="hidden md:flex items-center w-[420px]">
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
            py-2
          "
        >
          <Search size={18} className="text-slate-500" />

          <input
            type="text"
            placeholder="Search chats..."
            className="
              w-full
              bg-transparent
              outline-none
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
          "
        >
          <Bell size={20} className="text-slate-300" />
        </button>

        <button
          className="
            p-2
            rounded-xl
            hover:bg-slate-800
            transition
          "
        >
          <Settings size={20} className="text-slate-300" />
        </button>

        <div
          className="
            h-10
            w-10
            rounded-full
            bg-blue-600
            flex
            items-center
            justify-center
            text-white
            font-bold
          "
        >
          M
        </div>
      </div>
    </header>
  );
}