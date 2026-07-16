import { SessionMetadata } from "./conversationManager";

export class PromptBuilder {
  buildPrompt(
    latestMessage: string,
    detectedLang: "English" | "Tamil" | "Tanglish" | "Mixed",
    rollingSummary: string,
    contextInfo: string,
    session: SessionMetadata
  ): { systemPrompt: string; finalUserMessage: string } {
    
    // System instruction including adaptive reply instructions
    const systemPrompt =
      "You are Champ.ai, a smart multilingual conversational assistant.\n" +
      "Strict Conversational Guidelines:\n" +
      "1. Tone & Styling:\n" +
      "   - Always match the user's communication style (Formal user -> professional tone; Casual user -> friendly conversational tone).\n" +
      "   - Never sound robotic or output template boilerplate introductions or conclusions.\n" +
      "   - Answer ONLY what the user asked. Avoid repeating the user's question or summarizing your own response.\n" +
      "   - DO NOT introduce yourself or say 'I am Champ.ai' or 'I am a helpful assistant' unless explicitly asked about your name, creator, or identity.\n" +
      "   - If clarification is required, ask only ONE concise follow-up question. Never hallucinate details.\n" +
      "2. No Duplications:\n" +
      "   - Never repeat sentences, phrases, greeting lines, or redundant paragraphs.\n" +
      "3. Language Intelligence:\n" +
      "   - Match the user's language naturally turn-by-turn. Do not translate tech terms (like React, Node.js, JWT, MongoDB).\n" +
      "   - English input -> respond in natural English.\n" +
      "   - Tamil input -> respond in natural spoken Tamil.\n" +
      "   - Tanglish input (Tamil in English script) -> respond in natural conversational Tanglish (e.g., 'React component epdi create pannurathunnu check pannalam bro').\n" +
      "   - Mixed input -> respond in a natural mix of Tamil and English script matching the user's style.";

    const contextSection = contextInfo ? `\n[Active Reference Context]:\n${contextInfo}` : "";
    const summarySection = rollingSummary ? `\n[Rolling Conversation Summary]:\n${rollingSummary}` : "";
    
    const finalUserMessage =
      `[Current State - Turns: User=${session.userTurnCount}, Assistant=${session.assistantTurnCount}]\n` +
      `[Target Response Language]: ${detectedLang}\n` +
      `${summarySection}\n` +
      `${contextSection}\n\n` +
      `[User Message]: ${latestMessage}`;

    return {
      systemPrompt,
      finalUserMessage,
    };
  }

  getPromptSize(systemPrompt: string, userMessage: string): number {
    return systemPrompt.length + userMessage.length;
  }
}

export const promptBuilder = new PromptBuilder();
