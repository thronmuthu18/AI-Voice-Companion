import { create } from "zustand";
import { subscriptionService, PlanConfig, SubscriptionResponse } from "../services/subscription.service";

interface QuotaModalDetails {
  feature: string;
  plan: string;
  used: number;
  limit: number | null;
  resetAt: string;
  upgradeAvailable: boolean;
  availablePlans?: string[];
}

interface SubscriptionState {
  plans: Record<string, PlanConfig> | null;
  currentSubscription: SubscriptionResponse | null;
  isLoading: boolean;
  error: string | null;

  isQuotaModalOpen: boolean;
  quotaModalDetails: QuotaModalDetails | null;

  fetchPlans: () => Promise<void>;
  fetchSubscription: () => Promise<void>;
  openQuotaModal: (details: QuotaModalDetails) => void;
  closeQuotaModal: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  plans: null,
  currentSubscription: null,
  isLoading: false,
  error: null,

  isQuotaModalOpen: false,
  quotaModalDetails: null,

  async fetchPlans() {
    set({ isLoading: true, error: null });
    try {
      const plans = await subscriptionService.getPlans();
      set({ plans, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to load plans", isLoading: false });
    }
  },

  async fetchSubscription() {
    set({ isLoading: true, error: null });
    try {
      const currentSubscription = await subscriptionService.getSubscription();
      set({ currentSubscription, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to load subscription status", isLoading: false });
    }
  },

  openQuotaModal(details) {
    set({ isQuotaModalOpen: true, quotaModalDetails: details });
  },

  closeQuotaModal() {
    set({ isQuotaModalOpen: false, quotaModalDetails: null });
  },
}));
