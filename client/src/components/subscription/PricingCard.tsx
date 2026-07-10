import { Check, ShieldCheck, Sparkles, Zap } from "lucide-react";

interface PlanLimits {
  textChat: number | null;
  imageGenerate: number;
  videoGenerate: number;
  fileGenerate: number;
}

interface PricingCardProps {
  code: string;
  displayName: string;
  priceINR: number;
  durationDays: number | null;
  limits: PlanLimits;
  isCurrent: boolean;
  onUpgradeClick: (planCode: string) => void;
}

export default function PricingCard({
  code,
  displayName,
  priceINR,
  durationDays,
  limits,
  isCurrent,
  onUpgradeClick
}: PricingCardProps) {

  const formatLimit = (value: number | null) => {
    return value === null ? "Unlimited" : `${value}/day`;
  };

  const getPriceSub = () => {
    if (priceINR === 0) return "Forever";
    return `for ${durationDays} days`;
  };

  const getCardStyles = () => {
    if (isCurrent) {
      return "border-blue-500 bg-white/60 dark:bg-slate-900/60 shadow-blue-500/10";
    }
    if (code === "PRO_299") {
      return "border-slate-200/50 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/30 hover:border-slate-350 dark:hover:border-slate-700 shadow-indigo-500/5";
    }
    return "border-slate-200/50 dark:border-slate-800/60 bg-white/20 dark:bg-slate-900/20 hover:border-slate-350 dark:hover:border-slate-700";
  };

  return (
    <div 
      className={`
        relative
        flex
        flex-col
        rounded-3xl
        border
        p-8
        shadow-2xl
        backdrop-blur-xl
        transition-all
        duration-300
        ${getCardStyles()}
      `}
    >
      {/* Popular badge for PRO plan */}
      {code === "PRO_299" && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-[10px] uppercase font-bold tracking-widest text-white flex items-center gap-1 shadow-lg shadow-blue-600/30">
          <Sparkles size={10} />
          Best Value
        </div>
      )}

      {/* Header info */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase">{displayName}</h4>
        
        <div className="flex items-baseline gap-1 text-slate-850 dark:text-white">
          <span className="text-3xl font-extrabold">₹{priceINR}</span>
          <span className="text-sm text-slate-500 dark:text-slate-400 font-normal">/ {getPriceSub()}</span>
        </div>
      </div>

      <hr className="my-6 border-slate-200/50 dark:border-slate-800/60" />

      {/* Limits List */}
      <ul className="space-y-4 flex-1 mb-8 text-sm">
        <li className="flex items-center gap-3 text-slate-650 dark:text-slate-300">
          <div className="rounded-full bg-emerald-500/10 p-0.5 text-emerald-500 dark:text-emerald-400 shrink-0">
            <Check size={14} />
          </div>
          <span>Text Chat: <span className="font-semibold text-slate-900 dark:text-white">{formatLimit(limits.textChat)}</span></span>
        </li>
        
        <li className="flex items-center gap-3 text-slate-650 dark:text-slate-300">
          <div className="rounded-full bg-emerald-500/10 p-0.5 text-emerald-500 dark:text-emerald-400 shrink-0">
            <Check size={14} />
          </div>
          <span>Image Generation: <span className="font-semibold text-slate-900 dark:text-white">{formatLimit(limits.imageGenerate)}</span></span>
        </li>

        <li className="flex items-center gap-3 text-slate-650 dark:text-slate-300">
          <div className="rounded-full bg-emerald-500/10 p-0.5 text-emerald-500 dark:text-emerald-400 shrink-0">
            <Check size={14} />
          </div>
          <span>Video Generation: <span className="font-semibold text-slate-900 dark:text-white">{formatLimit(limits.videoGenerate)}</span></span>
        </li>

        <li className="flex items-center gap-3 text-slate-650 dark:text-slate-300">
          <div className="rounded-full bg-emerald-500/10 p-0.5 text-emerald-500 dark:text-emerald-400 shrink-0">
            <Check size={14} />
          </div>
          <span>File Generation: <span className="font-semibold text-slate-900 dark:text-white">{formatLimit(limits.fileGenerate)}</span></span>
        </li>
      </ul>

      {/* Button Action */}
      {isCurrent ? (
        <button
          disabled
          className="
            w-full
            rounded-2xl
            bg-slate-800
            text-slate-400
            py-3
            font-semibold
            text-sm
            flex
            items-center
            justify-center
            gap-1.5
            cursor-not-allowed
            border
            border-slate-700/50
          "
        >
          <ShieldCheck size={16} />
          Current Active Plan
        </button>
      ) : (
        <button
          onClick={() => onUpgradeClick(code)}
          className={`
            w-full
            rounded-2xl
            py-3
            font-bold
            text-sm
            transition
            flex
            items-center
            justify-center
            gap-1.5
            ${
              code === "FREE"
                ? "bg-slate-800 hover:bg-slate-700 text-white"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/15"
            }
          `}
        >
          <Zap size={15} />
          {code === "FREE" ? "Revert to Free" : "Upgrade now"}
        </button>
      )}
    </div>
  );
}
