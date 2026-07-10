import type { ReactNode } from "react";
import GlassPanel from "../ui/GlassPanel";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export default function AuthCard({
  title,
  subtitle,
  children,
}: AuthCardProps) {
  return (
    <GlassPanel className="p-8">
      <div className="mb-8 text-center">
        <div
          className="
            mx-auto
            mb-4
            flex
            h-14
            w-14
            items-center
            justify-center
            rounded-2xl
            bg-blue-600
            text-2xl
            font-bold
            text-white
            shadow-lg
          "
        >
          M
        </div>

        <h1 className="text-3xl font-extrabold text-slate-850 dark:text-white tracking-tight">
          {title}
        </h1>

        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {subtitle}
        </p>
      </div>

      {children}
    </GlassPanel>
  );
}