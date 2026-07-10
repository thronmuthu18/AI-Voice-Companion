import Sidebar from "./Sidebar";
import Header from "./Header";
import MainContent from "./MainContent";
import MobileSidebar from "./MobileSidebar";
import BackgroundScene from "../ui/BackgroundScene";
import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
  noPadding?: boolean;
  noScroll?: boolean;
}

export default function AppShell({
  children,
  noPadding = false,
  noScroll = false,
}: AppShellProps) {
  return (
    <div className="relative flex h-screen bg-transparent text-slate-800 dark:text-white overflow-hidden">
      <BackgroundScene />
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:block z-10">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar />

      {/* Main Area */}
      <div className="flex flex-1 flex-col overflow-hidden z-10">
        <Header />

        <MainContent noPadding={noPadding} noScroll={noScroll}>
          {children}
        </MainContent>
      </div>
    </div>
  );
}