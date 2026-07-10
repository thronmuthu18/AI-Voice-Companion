import { ReactNode } from "react";

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
}

export default function GlassPanel({ children, className = "" }: GlassPanelProps) {
  return (
    <div
      className={`
        rounded-3xl
        border
        border-slate-200/50
        dark:border-slate-800/60
        bg-white/40
        dark:bg-slate-950/40
        backdrop-blur-xl
        shadow-2xl
        shadow-slate-200/10
        dark:shadow-black/20
        transition-all
        duration-300
        ${className}
      `}
    >
      {children}
    </div>
  );
}
