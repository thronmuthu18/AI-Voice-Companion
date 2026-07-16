export interface SessionMetadata {
  chatId: string;
  detectedLanguage: "English" | "Tamil" | "Tanglish" | "Mixed";
  userTurnCount: number;
  assistantTurnCount: number;
  startedAt: Date;
  lastActiveAt: Date;
  state: string;
}

export class ConversationManager {
  private sessions = new Map<string, SessionMetadata>();

  getOrCreateSession(chatId: string): SessionMetadata {
    let session = this.sessions.get(chatId);
    if (!session) {
      session = {
        chatId,
        detectedLanguage: "English",
        userTurnCount: 0,
        assistantTurnCount: 0,
        startedAt: new Date(),
        lastActiveAt: new Date(),
        state: "IDLE",
      };
      this.sessions.set(chatId, session);
    }
    return session;
  }

  updateSessionLanguage(chatId: string, language: "English" | "Tamil" | "Tanglish" | "Mixed"): void {
    const session = this.getOrCreateSession(chatId);
    session.detectedLanguage = language;
    session.lastActiveAt = new Date();
  }

  incrementUserTurn(chatId: string): void {
    const session = this.getOrCreateSession(chatId);
    session.userTurnCount += 1;
    session.lastActiveAt = new Date();
    session.state = "USER_SPEAKING";
  }

  incrementAssistantTurn(chatId: string): void {
    const session = this.getOrCreateSession(chatId);
    session.assistantTurnCount += 1;
    session.lastActiveAt = new Date();
    session.state = "AI_SPEAKING";
  }

  updateState(chatId: string, state: string): void {
    const session = this.getOrCreateSession(chatId);
    session.state = state;
    session.lastActiveAt = new Date();
  }

  clearSession(chatId: string): void {
    this.sessions.delete(chatId);
  }
}

export const conversationManager = new ConversationManager();
