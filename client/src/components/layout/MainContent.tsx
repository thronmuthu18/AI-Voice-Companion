import type { ReactNode } from "react";

interface MainContentProps {
  children?: ReactNode;
}

export default function MainContent({
  children,
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
        className="
          h-full
          w-full
          overflow-y-auto
          p-6
        "
      >
        {children}
      </div>
    </main>
  );
}