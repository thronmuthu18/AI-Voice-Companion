import api from "./api";
import type { AIChatResponse } from "../types/api.types";

export class AIService {
  async generateResponse(
    chatId: string,
    message: string
  ): Promise<AIChatResponse> {
    const response = await api.post<AIChatResponse>(
      "/ai/chat",
      {
        chatId,
        message,
      }
    );

    return response.data;
  }

  async streamResponse(
    chatId: string,
    message: string,
    onMessage: (token: string) => void,
    onComplete?: () => void
  ): Promise<void> {
    const token = localStorage.getItem(
      "muthuai_access_token"
    );

    const response = await fetch(
      "http://localhost:5000/api/ai/stream",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chatId,
          message,
        }),
      }
    );

    if (!response.body) {
      throw new Error("Streaming not supported");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } =
        await reader.read();

      if (done) break;

      const chunk = decoder.decode(value);

      const lines = chunk
        .split("\n")
        .filter((line) =>
          line.startsWith("data:")
        );

      for (const line of lines) {
        const json = JSON.parse(
          line.replace("data:", "").trim()
        );

        if (json.done) {
          onComplete?.();
          continue;
        }

        onMessage(json.token);
      }
    }
  }
}

export const aiService =
  new AIService();