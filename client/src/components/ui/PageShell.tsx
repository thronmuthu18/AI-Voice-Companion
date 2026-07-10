import { ReactNode } from "react";
import { motion } from "framer-motion";
import GlassPanel from "./GlassPanel";

interface PageShellProps {
  children: ReactNode;
  title: string;
  description?: string;
  noCard?: boolean;
}

export default function PageShell({ children, title, description, noCard = false }: PageShellProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="max-w-5xl mx-auto py-8 px-4 space-y-8"
    >
      <div className="space-y-1.5 text-center md:text-left">
        <h2 className="text-3xl font-extrabold text-slate-850 dark:text-white tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-2xl">
            {description}
          </p>
        )}
      </div>

      {noCard ? (
        children
      ) : (
        <GlassPanel className="p-6 md:p-8 shadow-xl">
          {children}
        </GlassPanel>
      )}
    </motion.div>
  );
}
