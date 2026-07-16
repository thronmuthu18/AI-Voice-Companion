import { ProviderRouter } from "../providers/provider.router";
import { messageService } from "./message.service";
import { conversationManager } from "./conversationManager";
import { summarizerService } from "./summarizer";
import { promptBuilder } from "./promptBuilder";
import { contextService } from "./context.service";
import { detectLanguage } from "../utils/langDetector";

export class StreamService {
  async streamResponse(chatId: string) {
    const messages = await messageService.getConversationHistory(chatId);
    if (messages.length === 0) {
      throw new Error("No conversation history found to stream response.");
    }

    const lastMsg = messages[messages.length - 1];
    const latestUserText =
      typeof lastMsg.content === "string"
        ? lastMsg.content
        : lastMsg.content.find((c: any) => c.type === "text")?.text || "";

    // 1. Language Intelligence: Detect language dynamically
    const detectedLang = detectLanguage(latestUserText);
    console.log(`[Conversation Intelligence] Detected language: ${detectedLang}`);

    // 2. Context Manager turns tracking
    const session = conversationManager.getOrCreateSession(chatId);
    conversationManager.incrementUserTurn(chatId);
    conversationManager.updateSessionLanguage(chatId, detectedLang);
    conversationManager.updateState(chatId, "PROCESSING");

    // 3. Summarizer: Get or update rolling summary
    const rollingSummary = await summarizerService.getOrUpdateSummary(chatId, messages);
    const summarySize = summarizerService.getSummarySize(chatId);
    console.log(`[Conversation Intelligence] Rolling Summary Size: ${summarySize} characters`);

    // 4. Context reference resolution
    const activeCtx = await contextService.getActiveContext(chatId);
    const resolvedContext = contextService.resolveReferences("", activeCtx);

    // 5. Prompt Builder compilation
    const { systemPrompt, finalUserMessage } = promptBuilder.buildPrompt(
      latestUserText,
      detectedLang,
      rollingSummary,
      resolvedContext,
      session
    );

    const promptSize = promptBuilder.getPromptSize(systemPrompt, finalUserMessage);
    console.log(`[Conversation Intelligence] Prompt Size: ${promptSize} characters`);

    // 6. Map users multimodal block parts if they uploaded images
    let userContent: any = finalUserMessage;
    if (Array.isArray(lastMsg.content)) {
      userContent = lastMsg.content.map((block: any) => {
        if (block.type === "text") {
          return { type: "text", text: finalUserMessage };
        }
        return block; // retains base64 images
      });
    }

    const chatHistory = [
      {
        role: "system" as const,
        content: systemPrompt,
      },
      {
        role: "user" as const,
        content: userContent,
      },
    ];

    const provider = ProviderRouter.getProviderForAction("chat");
    const startTime = Date.now();
    console.log(`[StreamService] Sending request to Gemini...`);

    let stream;
    // 7. Error Recovery: retry once on connection timeouts
    try {
      stream = await provider.streamChat(chatHistory);
    } catch (err) {
      console.warn("[StreamService] Gemini connection failed. Retrying once...", err);
      await new Promise((resolve) => setTimeout(resolve, 500));
      stream = await provider.streamChat(chatHistory);
    }

    // 8. Stream output wrap mapping: logs metrics and state transitions
    const responseGenerator = async function* () {
      let isFirstToken = true;
      try {
        for await (const token of stream) {
          if (isFirstToken) {
            const firstTokenTime = Date.now();
            console.log(`[StreamService] First response token received in ${firstTokenTime - startTime}ms`);
            isFirstToken = false;
          }
          yield token;
        }
        const finishTime = Date.now();
        console.log(`[StreamService] Streaming finished. Total response time: ${finishTime - startTime}ms`);
        conversationManager.incrementAssistantTurn(chatId);
        conversationManager.updateState(chatId, "IDLE");
      } catch (streamError) {
        console.error("[StreamService] Token stream generation error:", streamError);
        conversationManager.updateState(chatId, "ERROR");
        throw streamError;
      }
    };

    return responseGenerator();
  }
}

export const streamService = new StreamService();