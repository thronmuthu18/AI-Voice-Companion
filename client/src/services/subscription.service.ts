import api from "./api";

export interface PlanLimits {
  textChat: number | null;
  imageGenerate: number;
  videoGenerate: number;
  fileGenerate: number;
}

export interface PlanConfig {
  code: string;
  displayName: string;
  priceINR: number;
  durationDays: number | null;
  limits: PlanLimits;
}

export interface SubscriptionResponse {
  success: boolean;
  plan: string;
  status: string;
  priceINR: number;
  startedAt: string;
  expiresAt: string | null;
  daysRemaining: number | null;
  limits: PlanLimits;
  usage: {
    textChat: { used: number; limit: number | null; remaining: number | null; resetAt: string };
    imageGenerate: { used: number; limit: number; remaining: number; resetAt: string };
    videoGenerate: { used: number; limit: number; remaining: number; resetAt: string };
    fileGenerate: { used: number; limit: number; remaining: number; resetAt: string };
  };
  upgradeAvailable: boolean;
}

export class SubscriptionService {
  async getPlans(): Promise<Record<string, PlanConfig>> {
    const res = await api.get<{ success: boolean; plans: Record<string, PlanConfig> }>(
      "/v1/plans"
    );
    return res.data.plans;
  }

  async getSubscription(): Promise<SubscriptionResponse> {
    const res = await api.get<SubscriptionResponse>("/v1/subscription/me");
    return res.data;
  }
}

export const subscriptionService = new SubscriptionService();
