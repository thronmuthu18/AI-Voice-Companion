import type { ReactNode } from "react";
import { motion } from "framer-motion";
import BackgroundScene from "../ui/BackgroundScene";

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
        bg-transparent
        px-6
      "
    >
      <BackgroundScene />

      {/* Content wrapper */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {children}
      </motion.div>
    </div>
  );
}