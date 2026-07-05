import { openai } from "../config/openai";
import { messageService } from "./message.service";

export class AIService {
  async generateResponse(chatId: string): Promise<string> {
    // System Prompt + Conversation History
    const messages = [
      {
        role: "system" as const,
        content:
          "You are MuthuAI, a smart, friendly and professional AI Voice Companion. Answer clearly, accurately, and naturally. If the user speaks in Tamil, reply in Tamil. If the user speaks in English, reply in English.",
      },
      ...(await messageService.getConversationHistory(chatId)),
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    return (
      response.choices[0]?.message?.content?.trim() ??
      "Sorry, I couldn't generate a response."
    );
  }
}

export const aiService = new AIService();