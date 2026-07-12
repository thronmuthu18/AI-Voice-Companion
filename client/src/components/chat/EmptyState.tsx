import { motion } from "framer-motion";
import GlassPanel from "../ui/GlassPanel";
import AiPresence from "../ui/AiPresence";

export default function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <GlassPanel className="p-8 text-center space-y-6">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-transparent">
            <AiPresence state="idle" size={96} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-slate-855 dark:text-white tracking-tight">
              Welcome to MuthuAI
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Start a new conversation with your AI assistant. Ask questions, analyze assets, and build anything with AI.
            </p>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}