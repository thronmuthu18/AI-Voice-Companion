import { Sparkles } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600 text-white shadow-xl">
          <Sparkles size={40} />
        </div>

        <h2 className="text-3xl font-bold text-white">
          Welcome to MuthuAI
        </h2>

        <p className="mt-4 text-slate-400 leading-7">
          Start a new conversation with your AI assistant.
          Ask questions, generate content, analyze files,
          and build anything with AI.
        </p>
      </div>
    </div>
  );
}