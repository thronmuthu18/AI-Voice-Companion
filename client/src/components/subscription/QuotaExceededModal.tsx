import { useSubscriptionStore } from "../../stores/subscription.store";
import { AlertTriangle, X, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function QuotaExceededModal() {
  const navigate = useNavigate();
  const { isQuotaModalOpen, quotaModalDetails, closeQuotaModal } = useSubscriptionStore();

  if (!isQuotaModalOpen || !quotaModalDetails) return null;

  const { feature, plan, used, limit, resetAt, upgradeAvailable } = quotaModalDetails;

  const formatFeatureName = (name: string) => {
    switch (name) {
      case "textChat": return "Text Messages";
      case "imageGenerate": return "Image Generations";
      case "videoGenerate": return "Video Generations";
      case "fileGenerate": return "File Generations";
      default: return name;
    }
  };

  const formatResetTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " (" + date.toLocaleDateString() + ")";
    } catch {
      return isoString;
    }
  };

  const handleViewPlans = () => {
    closeQuotaModal();
    navigate("/pricing");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div 
        className="
          relative
          w-full
          max-w-md
          rounded-3xl
          border
          border-slate-200/50
          dark:border-slate-800
          bg-white/90
          dark:bg-slate-900/90
          backdrop-blur-md
          p-6
          shadow-2xl
          space-y-6
          text-center
          animate-in
          fade-in
          zoom-in-95
          duration-200
        "
      >
        {/* Close Button */}
        <button 
          onClick={closeQuotaModal}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-white transition"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {/* Alert Icon Header */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 dark:text-amber-400">
          <AlertTriangle size={28} />
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Daily Limit Reached</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            You've run out of daily allocation for <span className="font-semibold text-blue-600 dark:text-blue-400">{formatFeatureName(feature)}</span>.
          </p>
        </div>

        {/* Stats Table */}
        <div className="rounded-2xl bg-slate-100/50 dark:bg-slate-950/65 p-4 text-left border border-slate-200/40 dark:border-slate-800/40 text-sm space-y-3">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Current Plan</span>
            <span className="font-medium text-slate-800 dark:text-white uppercase">{plan}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Usage Today</span>
            <span className="font-medium text-slate-800 dark:text-white">{used} / {limit}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Daily Reset At</span>
            <span className="font-medium text-amber-600 dark:text-amber-350">{formatResetTime(resetAt)}</span>
          </div>
        </div>

        {/* Upgrade Callout */}
        {upgradeAvailable && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-blue-500/20 text-left">
            <Sparkles className="text-blue-500 dark:text-blue-450 shrink-0 mt-0.5" size={16} />
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-white">Upgrade available</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Unlock higher daily limitations of 15/day or 40/day by upgrading your active subscription plan.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          {upgradeAvailable ? (
            <button 
              onClick={handleViewPlans}
              className="
                w-full
                rounded-xl
                bg-blue-600
                hover:bg-blue-500
                transition
                text-white
                py-3
                font-medium
                text-sm
                shadow-lg
                shadow-blue-600/20
                hover:scale-[1.01]
                active:scale-[0.99]
                duration-200
              "
            >
              View Upgrade Plans
            </button>
          ) : (
            <button 
              onClick={closeQuotaModal}
              className="
                w-full
                rounded-xl
                bg-blue-600
                hover:bg-blue-500
                transition
                text-white
                py-3
                font-medium
                text-sm
                hover:scale-[1.01]
                active:scale-[0.99]
                duration-200
              "
            >
              Understand
            </button>
          )}
          
          <button 
            onClick={closeQuotaModal}
            className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white py-3 font-medium text-sm hover:scale-[1.01] active:scale-[0.99] duration-200"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
