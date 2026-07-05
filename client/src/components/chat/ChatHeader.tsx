import { Bot, MoreVertical } from "lucide-react";

interface ChatHeaderProps {
  title?: string;
  subtitle?: string;
}

export default function ChatHeader({
  title = "MuthuAI",
  subtitle = "AI Assistant",
}: ChatHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Left */}

        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
            <Bot className="text-white" size={22} />
          </div>

          <div>
            <h1 className="text-lg font-semibold text-white">
              {title}
            </h1>

            <p className="text-sm text-slate-400">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right */}

        <button
          type="button"
          className="
            rounded-xl
            p-2
            text-slate-400
            transition
            hover:bg-slate-800
            hover:text-white
          "
        >
          <MoreVertical size={20} />
        </button>
      </div>
    </header>
  );
}