export type PlanCode = "FREE" | "BASIC_199" | "PRO_299";

export interface PlanLimits {
  textChat: number | null; // null represents unlimited
  imageGenerate: number;
  videoGenerate: number;
  fileGenerate: number;
}

export interface PlanConfig {
  code: PlanCode;
  displayName: string;
  priceINR: number;
  durationDays: number | null; // null represents lifetime
  limits: PlanLimits;
}

export const PLANS: Record<PlanCode, PlanConfig> = {
  FREE: {
    code: "FREE",
    displayName: "Free",
    priceINR: 0,
    durationDays: null,
    limits: {
      textChat: 200,
      imageGenerate: 4,
      videoGenerate: 4,
      fileGenerate: 4,
    },
  },
  BASIC_199: {
    code: "BASIC_199",
    displayName: "₹199 Plan",
    priceINR: 199,
    durationDays: 7,
    limits: {
      textChat: 800,
      imageGenerate: 15,
      videoGenerate: 15,
      fileGenerate: 15,
    },
  },
  PRO_299: {
    code: "PRO_299",
    displayName: "₹299 Plan",
    priceINR: 299,
    durationDays: 7,
    limits: {
      textChat: null, // Unlimited
      imageGenerate: 40,
      videoGenerate: 40,
      fileGenerate: 40,
    },
  },
};
