import { contextService } from "./context.service";

export interface ClassificationResult {
  intents: string[];
  confidence: number;
  clarificationQuestion?: string;
  context: {
    hasImage: boolean;
    hasDocument: boolean;
    primaryIntent: string;
  };
}

export class IntelligenceService {
  // Delegate context resolution to contextService
  async resolveContext(chatId: string, requestAttachments?: any[]) {
    const activeCtx = await contextService.getActiveContext(chatId, requestAttachments);
    return {
      hasImage: !!activeCtx.latestImage,
      hasDocument: !!activeCtx.latestDocument,
      latestImage: activeCtx.latestImage,
      latestDocument: activeCtx.latestDocument,
      latestAudio: activeCtx.latestAudio
    };
  }

  // Classifies user query with full context awareness and resolved pronoun references
  async classifyIntent(
    message: string,
    hasImage: boolean,
    hasDocument: boolean,
    chatId?: string
  ): Promise<ClassificationResult> {
    try {
      // Resolve pronoun reference mapping based on active context
      let resolvedQuery = message;
      if (chatId) {
        const activeCtx = await contextService.getActiveContext(chatId);
        resolvedQuery = contextService.resolveReferences(message, activeCtx);
      }

      const systemMessage =
        "You are the Core Intelligence Engine for Champ.ai. Your task is to analyze user queries and context to perform intent classification.\n\n" +
        "Available Intents:\n" +
        "- general_chat (normal chat conversations)\n" +
        "- programming (conceptual software engineering questions)\n" +
        "- code_generation (requests to write code, web pages, functions)\n" +
        "- code_debugging (requests to fix compilation, type, syntax, or logical errors)\n" +
        "- image_generation (requests to create/draw/make a new image from scratch)\n" +
        "- image_editing (requests to alter/modify/remove elements of an existing image)\n" +
        "- image_analysis (requests to identify elements, transcribe text, describe uploaded image)\n" +
        "- document_analysis (requests to read, summarize, or query document text)\n" +
        "- translation (requests to translate languages, Tamil translation)\n" +
        "- summarization (requests to summarize text/links)\n" +
        "- voice_request (commands specifically about speaking/voice controls)\n" +
        "- search_request (requests requiring web search or real-time info)\n" +
        "- reasoning_request (highly complex logical, algebraic, or analytical tasks)\n" +
        "- creative_writing (poems, stories, essays)\n" +
        "- mathematics (solving math equations, calculations)\n" +
        "- vision_request (asking questions about visual components of an image)\n" +
        "- file_processing (requests to convert or modify files)\n" +
        "- future_tool_calls (requests containing future tool integration intents like weather, calendar)\n" +
        "- unknown_intent (unclear or completely ambiguous inputs)\n\n" +
        "Rules:\n" +
        "1. Context-Aware: If hasImage is true, a command like 'remove background' or 'make realistic' is image_editing. If hasImage is true and they ask 'what is this?', it is vision_request.\n" +
        "2. Context-Aware: If hasDocument is true, a command like 'summarize' is document_analysis.\n" +
        "3. Multi-Intent: A query like 'Translate this PDF and summarize it' should return document_analysis, translation, and summarization.\n" +
        "4. Intent Confidence: Assign a confidence score from 0.0 to 1.0. If the request is highly ambiguous or confidence is below 0.5, provide a single polite clarification question in clarificationQuestion. Otherwise, leave clarificationQuestion empty.\n" +
        "5. Output Format: Return JSON matching the following structure:\n" +
        "{\n" +
        "  \"intents\": [\"intent_name_1\", \"intent_name_2\"],\n" +
        "  \"confidence\": 0.95,\n" +
        "  \"clarificationQuestion\": \"\",\n" +
        "  \"context\": {\n" +
        "    \"hasImage\": true/false,\n" +
        "    \"hasDocument\": true/false,\n" +
        "    \"primaryIntent\": \"primary_intent_name\"\n" +
        "  }\n" +
        "}";

      const { ProviderRouter } = require("../providers/provider.router");
      const provider = ProviderRouter.getProviderForAction("chat");

      const response = await provider.chat([
        { role: "system", content: systemMessage },
        {
          role: "user",
          content: `Message: "${resolvedQuery}"\nContext: hasImage=${hasImage}, hasDocument=${hasDocument}`
        }
      ]);

      const parsed: ClassificationResult = JSON.parse(response || "{}");

      return {
        intents: parsed.intents || ["general_chat"],
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 1.0,
        clarificationQuestion: parsed.clarificationQuestion || undefined,
        context: parsed.context || { hasImage, hasDocument, primaryIntent: "general_chat" }
      };
    } catch (err) {
      console.error("[Intent Classification Error] Classification failed. Falling back to general_chat:", err);
      return {
        intents: ["general_chat"],
        confidence: 1.0,
        context: { hasImage, hasDocument, primaryIntent: "general_chat" }
      };
    }
  }
}

export const intelligenceService = new IntelligenceService();
