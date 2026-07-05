import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({
  children,
}: AuthLayoutProps) {
  return (
    <div
      className="
        relative
        flex
        min-h-screen
        items-center
        justify-center
        overflow-hidden
        bg-slate-950
        px-6
      "
    >
      {/* Background Glow */}
      <div
        className="
          absolute
          -top-32
          -left-32
          h-96
          w-96
          rounded-full
          bg-blue-600/20
          blur-3xl
        "
      />

      <div
        className="
          absolute
          -bottom-32
          -right-32
          h-96
          w-96
          rounded-full
          bg-purple-600/20
          blur-3xl
        "
      />

      {/* Grid */}
      <div
        className="
          absolute
          inset-0
          opacity-10
          [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)]
          [background-size:40px_40px]
        "
      />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 w-full max-w-md"
      >
        {children}
      </motion.div>
    </div>
  );
}