import { openai } from "../config/openai";
import { messageService } from "./message.service";

export class AIService {
  async generateResponse(chatId: string): Promise<string> {
    const messages = [
      {
        role: "system" as const,
        content:
          "You are MuthuAI, a smart, friendly and professional AI Voice Companion. Answer clearly, accurately, and naturally. If the user speaks in Tamil, reply in Tamil. If the user speaks in English, reply in English. To generate images, instruct the user to prefix their prompt with '/image ' (e.g. '/image a futuristic city').",
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

  async generateImage(prompt: string): Promise<string> {
    try {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      });

      const b64 = response.data?.[0]?.b64_json;
      if (!b64) {
        throw new Error("No image data returned from OpenAI");
      }

      return `data:image/png;base64,${b64}`;
    } catch (err: any) {
      console.error("OpenAI DALL-E image generation error:", err);
      throw new Error(`Failed to generate AI image: ${err.message}`);
    }
  }
}

export const aiService = new AIService();