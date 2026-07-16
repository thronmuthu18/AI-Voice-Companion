import { ProviderRouter } from "../providers/provider.router";

interface SummaryCache {
  summary: string;
  lastMessageCount: number;
}

export class SummarizerService {
  private cache = new Map<string, SummaryCache>();

  async getOrUpdateSummary(chatId: string, history: any[]): Promise<string> {
    // Only summarize if history is substantial (e.g. > 6 turns)
    if (history.length <= 6) {
      return "";
    }

    const cached = this.cache.get(chatId);
    // If the message count hasn't changed since the last summary, return cached summary
    if (cached && cached.lastMessageCount === history.length) {
      return cached.summary;
    }

    try {
      const provider = ProviderRouter.getProviderForAction("chat");
      
      // Summarize older history turns, excluding the last user/assistant turn to prevent lag
      const historyToSummarize = history.slice(0, -2);
      if (historyToSummarize.length === 0) {
        return "";
      }

      const summaryPrompt =
        "You are the Conversation Summarizer for Champ.ai.\n" +
        "Analyze the following conversation history between User and Assistant.\n" +
        "Generate a highly concise rolling summary.\n\n" +
        "Guidelines:\n" +
        "1. Preserve critical project metadata, developer context, unresolved code bugs, technical details, and core queries.\n" +
        "2. Remove all greetings, small talk, duplicate questions, and formatting fluff.\n" +
        "3. Keep the summary under 150 words.\n" +
        "4. Output only the plain text summary, nothing else. Do not start with 'Summary:' or 'The user asks'.";

      const formattedHistory = historyToSummarize
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n");

      const summaryResponse = await provider.chat([
        { role: "system", content: summaryPrompt },
        { role: "user", content: `History:\n${formattedHistory}` },
      ]);

      const cleanSummary = summaryResponse?.trim() || "";
      this.cache.set(chatId, {
        summary: cleanSummary,
        lastMessageCount: history.length,
      });

      return cleanSummary;
    } catch (error) {
      console.error("[Summarizer] Failed to generate rolling summary:", error);
      return cached?.summary || "";
    }
  }

  getSummarySize(chatId: string): number {
    return this.cache.get(chatId)?.summary.length || 0;
  }

  clearSummary(chatId: string): void {
    this.cache.delete(chatId);
  }
}

export const summarizerService = new SummarizerService();
