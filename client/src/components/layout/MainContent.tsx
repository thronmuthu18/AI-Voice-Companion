import type { ReactNode } from "react";

interface MainContentProps {
  children?: ReactNode;
  noPadding?: boolean;
  noScroll?: boolean;
}

export default function MainContent({
  children,
  noPadding = false,
  noScroll = false,
}: MainContentProps) {
  return (
    <main
      className="
        flex-1
        overflow-hidden
        bg-slate-950
        text-white
      "
    >
      <div
        className={`
          h-full
          w-full
          ${noScroll ? "overflow-hidden" : "overflow-y-auto"}
          ${noPadding ? "" : "p-6"}
        `}
      >
        {children}
      </div>
    </main>
  );
}