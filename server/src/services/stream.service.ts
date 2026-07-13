import { ProviderRouter } from "../providers/provider.router";
import { messageService } from "./message.service";

export class StreamService {
  async streamResponse(chatId: string) {
    const messages =
      await messageService.getConversationHistory(chatId);

    const provider = ProviderRouter.getProviderForAction("chat");

    const chatHistory = [
      {
        role: "system" as const,
        content:
          "You are Champ.ai, a smart, friendly and professional AI Voice Companion. " +
          "Answer clearly, accurately, and naturally. " +
          "If the user speaks in Tamil, reply in Tamil. If the user speaks in English, reply in English. " +
          "If an image is uploaded, analyze and describe it in detail — you MUST analyze images when provided. " +
          "If a document is uploaded, summarize its contents accurately. " +
          "Never refuse to analyze or describe images — always provide a thorough description.",
      },
      ...messages.map(m => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content
      }))
    ];

    const stream = await provider.streamChat(chatHistory);
    return stream;
  }
}

export const streamService = new StreamService();