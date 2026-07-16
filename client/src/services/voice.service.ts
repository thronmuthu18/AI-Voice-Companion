import api from "./api";

export interface RealtimeVoiceSessionResponse {
  enabled: boolean;
  provider: string;
  clientSecret?: string;
  session?: {
    id: string;
    expiresAt: number;
  };
  message?: string;
}

export interface SaveVoiceMessagesResponse {
  success: boolean;
  data?: {
    userMessage: any;
    assistantMessage: any;
  };
}

export class VoiceService {
  async getRealtimeSession(): Promise<RealtimeVoiceSessionResponse> {
    const response = await api.post<RealtimeVoiceSessionResponse>("/voice/session");
    return response.data;
  }

  async closeRealtimeSession(): Promise<void> {
    await api.post("/voice/session/close").catch(() => {});
  }

  async saveRealtimeMessages(
    chatId: string,
    userContent: string,
    assistantContent: string
  ): Promise<SaveVoiceMessagesResponse> {
    const response = await api.post<SaveVoiceMessagesResponse>("/voice/save", {
      chatId,
      userContent,
      assistantContent,
    });
    return response.data;
  }
}

export const voiceService = new VoiceService();
