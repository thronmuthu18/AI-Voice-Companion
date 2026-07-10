export type ProviderName = "openai" | "gemini";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface HealthCheckResult {
  status: "Healthy" | "Unhealthy";
  latency: number;
  error?: string;
  details?: any;
}
