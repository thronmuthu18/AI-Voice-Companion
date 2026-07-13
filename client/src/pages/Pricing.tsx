import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import PageShell from "../components/ui/PageShell";
import PricingCard from "../components/subscription/PricingCard";
import QuotaExceededModal from "../components/subscription/QuotaExceededModal";
import { useSubscriptionStore } from "../stores/subscription.store";
import { useAuthStore } from "../stores/auth.store";
import { Calendar, AlertTriangle, RefreshCw, Info, Lock } from "lucide-react";

export default function Pricing() {
  const { isAuthenticated } = useAuthStore();
  const { 
    plans, 
    currentSubscription, 
    isLoading, 
    error, 
    fetchPlans, 
    fetchSubscription 
  } = useSubscriptionStore();

  const [paymentPrepModalOpen, setPaymentPrepModalOpen] = useState(false);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
    if (isAuthenticated) {
      fetchSubscription();
    }
  }, [fetchPlans, fetchSubscription, isAuthenticated]);

  const handleUpgradeClick = (planCode: string) => {
    setSelectedPlanCode(planCode);
    setPaymentPrepModalOpen(true);
  };

  // Maps usage counts to specific color classes and accessibility warnings
  const getUsageBarConfig = (used: number, limit: number | null) => {
    if (limit === null) {
      return { 
        percentage: 0, 
        colorClass: "bg-slate-700", 
        textColor: "text-slate-400",
        label: "Unlimited Active" 
      };
    }
    const percentage = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
    
    if (percentage >= 100) {
      return { 
        percentage, 
        colorClass: "bg-red-500", 
        textColor: "text-red-400",
        label: "Daily limit reached" 
      };
    }
    if (percentage >= 90) {
      return { 
        percentage, 
        colorClass: "bg-amber-600", 
        textColor: "text-amber-500",
        label: "Almost exhausted" 
      };
    }
    if (percentage >= 70) {
      return { 
        percentage, 
        colorClass: "bg-yellow-500", 
        textColor: "text-yellow-400",
        label: "Approaching daily limit" 
      };
    }
    return { 
      percentage, 
      colorClass: "bg-slate-500", 
      textColor: "text-slate-400",
      label: "Normal usage" 
    };
  };

  const formatResetTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " (" + date.toLocaleDateString() + ")";
    } catch {
      return isoString;
    }
  };

  const getFormatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString([], { dateStyle: "long" });
    } catch {
      return dateString;
    }
  };

  const renderCurrentPlanWidget = () => {
    if (!currentSubscription) return null;
    const isFree = currentSubscription.plan === "FREE";

    return (
      <div className="rounded-3xl border border-slate-200/50 dark:border-slate-800/60 bg-white/40 dark:bg-slate-950/40 p-6 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Active Plan Settings</span>
            <div className="flex items-center gap-2 mt-1">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                {currentSubscription.plan === "FREE" ? "Free Tier" : currentSubscription.plan === "BASIC_199" ? "₹199 Plan" : "₹299 Plan"}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-bold tracking-wider">
                {currentSubscription.status}
              </span>
            </div>
          </div>

          <div className="text-sm space-y-1.5 text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400 dark:text-slate-500" />
              <span>
                {isFree ? "Validity: Lifetime Free" : `Valid Until: ${getFormatDate(currentSubscription.expiresAt || "")}`}
              </span>
            </div>
            {!isFree && currentSubscription.daysRemaining !== null && (
              <div className="flex items-center gap-2">
                <Info size={14} className="text-slate-400 dark:text-slate-500" />
                <span className="font-semibold text-blue-650 dark:text-blue-400">{currentSubscription.daysRemaining} days remaining</span>
              </div>
            )}
            {currentSubscription.status === "expired" && (
              <div className="text-xs text-red-500 dark:text-red-400 font-semibold">
                ⚠️ Previous subscription expired. Returned to FREE.
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Reset Indicator */}
        <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
          <span>All limits reset daily (UTC)</span>
          {currentSubscription.usage?.textChat?.resetAt && (
            <span>Next reset at: <span className="text-slate-600 dark:text-slate-400 font-semibold">{formatResetTime(currentSubscription.usage.textChat.resetAt)}</span></span>
          )}
        </div>
      </div>
    );
  };

  const renderUsageDashboard = () => {
    if (!currentSubscription || !currentSubscription.usage) return null;
    const usage = currentSubscription.usage;

    const renderBar = (title: string, data: any) => {
      const { used, limit } = data;
      const config = getUsageBarConfig(used, limit);
      const isUnlimited = limit === null;

      return (
        <div key={title} className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-350">{title}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-900 dark:text-white">{used}</span> / {isUnlimited ? "Unlimited" : limit}
            </span>
          </div>
          
          {/* Progress bar boundary */}
          <div className="h-2.5 w-full bg-slate-200/50 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-300/40 dark:border-slate-800/40" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={limit || 100}>
            {!isUnlimited && (
              <div 
                className={`h-full rounded-full transition-all duration-500 ${config.colorClass}`} 
                style={{ width: `${config.percentage}%` }}
              />
            )}
            {isUnlimited && (
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 w-full opacity-40" />
            )}
          </div>

          <div className="flex justify-between text-[10px]">
            <span className={`${config.textColor} uppercase font-bold tracking-wider`}>{config.label}</span>
            {!isUnlimited && limit - used > 0 && (
              <span className="text-slate-500">{limit - used} remaining today</span>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="rounded-3xl border border-slate-200/50 dark:border-slate-800/60 bg-white/40 dark:bg-slate-950/40 p-6 space-y-6 shadow-xl">
        <div>
          <h4 className="text-md font-bold text-slate-800 dark:text-white">Daily Limits Dashboard</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time daily usage metrics and quota allocations</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {renderBar("Text Chats", usage.textChat)}
          {renderBar("Image Generations", usage.imageGenerate)}
          {renderBar("Video Generations", usage.videoGenerate)}
          {renderBar("File Generations", usage.fileGenerate)}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
          <RefreshCw size={32} className="text-blue-500 animate-spin" />
          <p className="text-sm text-slate-400">Loading plan specifications and active status...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 max-w-lg mx-auto text-center space-y-4 my-8">
          <AlertTriangle className="text-red-400 mx-auto" size={32} />
          <h3 className="text-lg font-bold text-white">Failed to retrieve configuration</h3>
          <p className="text-sm text-slate-400">{error}</p>
          <button 
            onClick={() => { fetchPlans(); if (isAuthenticated) fetchSubscription(); }}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 text-sm font-medium transition"
          >
            Retry Connection
          </button>
        </div>
      );
    }

    const currentPlanCode = currentSubscription?.plan || "FREE";

    return (
      <div className="space-y-12">
        {/* Auth details widgets */}
        {isAuthenticated && (
          <div className="space-y-8">
            {renderCurrentPlanWidget()}
            {renderUsageDashboard()}
          </div>
        )}

        {/* Pricing Matrix Card Grid */}
        <div className="space-y-6">
          <div className="text-center md:text-left">
            <h4 className="text-lg font-bold text-slate-800 dark:text-white">Subscription & Limits Matrix</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Choose the plan that suits your creative limits. Daily resets apply.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans && Object.keys(plans).map((planKey) => {
              const plan = plans[planKey];
              const isCurrent = currentPlanCode === plan.code;

              return (
                <PricingCard
                  key={plan.code}
                  code={plan.code}
                  displayName={plan.displayName}
                  priceINR={plan.priceINR}
                  durationDays={plan.durationDays}
                  limits={plan.limits}
                  isCurrent={isCurrent}
                  onUpgradeClick={handleUpgradeClick}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppShell>
      <PageShell title="Subscription Options" description="Supercharge your workflow with direct access to high-speed AI text chat, image generation, videos, and files" noCard>
        {renderContent()}

        {/* Quota Modal Popups */}
        <QuotaExceededModal />

        {/* Payment Preparation Dialog Modal */}
        {paymentPrepModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl border border-slate-200/50 dark:border-slate-800 bg-slate-900/90 backdrop-blur-md p-6 space-y-6 text-center shadow-2xl">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <Lock size={22} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white text-center">Payment Integration Ready</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-center font-medium">
                  Upgrade order configurations for <span className="font-semibold text-slate-900 dark:text-white">{selectedPlanCode}</span> is prepared. Secure checkout will be mounted in the next phase.
                </p>
              </div>
              <button 
                onClick={() => setPaymentPrepModalOpen(false)}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 transition text-white py-3 text-sm font-semibold shadow-md active:scale-95 duration-200"
              >
                Continue using Champ.ai
              </button>
            </div>
          </div>
        )}
      </PageShell>
    </AppShell>
  );
}
