import type { ReactNode } from "react";

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
    <div
      className="
        rounded-3xl
        border
        border-slate-800
        bg-slate-900/70
        backdrop-blur-2xl
        shadow-2xl
        p-8
      "
    >
      <div className="mb-8 text-center">
        <div
          className="
            mx-auto
            mb-4
            flex
            h-16
            w-16
            items-center
            justify-center
            rounded-2xl
            bg-blue-600
            text-2xl
            font-bold
            text-white
          "
        >
          M
        </div>

        <h1 className="text-3xl font-bold text-white">
          {title}
        </h1>

        <p className="mt-2 text-slate-400">
          {subtitle}
        </p>
      </div>

      {children}
    </div>
  );
}