import Sidebar from "./Sidebar";
import Header from "./Header";
import MainContent from "./MainContent";
import MobileSidebar from "./MobileSidebar";
import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({
  children,
}: AppShellProps) {
  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar />

      {/* Main Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />

        <MainContent>
          {children}
        </MainContent>
      </div>
    </div>
  );
}