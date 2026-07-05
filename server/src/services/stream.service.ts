import { openai } from "../config/openai";
import { messageService } from "./message.service";

export class StreamService {
  async streamResponse(
    chatId: string
  ) {
    const messages =
      await messageService.getConversationHistory(chatId);

    const stream =
      await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are MuthuAI, a smart, friendly and professional AI assistant.",
          },
          ...messages,
        ],
        stream: true,
      });

    return stream;
  }
}

export const streamService = new StreamService();