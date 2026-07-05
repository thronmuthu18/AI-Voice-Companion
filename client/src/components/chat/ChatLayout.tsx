import { ReactNode } from "react";
import ChatHeader from "./ChatHeader";
import ChatSidebar from "./ChatSidebar";

interface ChatLayoutProps {
  children: ReactNode;
}

export default function ChatLayout({
  children,
}: ChatLayoutProps) {
  return (
    <div className="flex h-screen bg-slate-950 text-white">
      {/* Sidebar */}
      <ChatSidebar />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <ChatHeader />

        <main className="flex flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}