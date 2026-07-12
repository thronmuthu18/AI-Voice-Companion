import { create } from "zustand";
import { messageService } from "../services/message.service";
import { aiService } from "../services/ai.service";
import type { Message, Attachment } from "../types/api.types";
import { useSubscriptionStore } from "./subscription.store";

interface MessageState {
  messages: Message[];
  isLoading: boolean;

  fetchMessages: (chatId: string) => Promise<void>;
  sendMessage: (
    chatId: string,
    content: string,
    attachments?: Attachment[]
  ) => Promise<void>;
  clearMessages: () => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  messages: [],
  isLoading: false,

  async fetchMessages(chatId) {
    set({ isLoading: true });

    try {
      const messages = await messageService.getMessages(chatId);

      set({
        messages,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  async sendMessage(chatId, content, attachments) {
    const assistantMsgId = crypto.randomUUID();
    set({ isLoading: true });

    try {
      // Save user message in the database
      const userMessage = await messageService.sendMessage(
        chatId,
        content,
        attachments
      );

      // Append user message to store state immediately
      set((state) => ({
        messages: [...state.messages, userMessage],
      }));

      // Setup temporary placeholder assistant message with client-side unique id
      const placeholderAssistantMsg: Message = {
        _id: assistantMsgId,
        chatId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, placeholderAssistantMsg],
      }));

      // Stream AI response token-by-token (pass attachments so backend can detect edit/vision intent)
      await aiService.streamResponse(
        chatId,
        content,
        (token) => {
          // Update the placeholder assistant message content
          set((state) => ({
            messages: state.messages.map((m) =>
              m._id === assistantMsgId
                ? { ...m, content: m.content + token }
                : m
            ),
          }));
        },
        async () => {
          // Stream completed - fetch latest database state to synchronize MongoDB _ids and times
          try {
            const messages = await messageService.getMessages(chatId);
            set({ messages, isLoading: false });

            // Automatically speak response if Auto Speak preference is active
            const autoSpeak = localStorage.getItem("muthuai_auto_speak") === "true";
            if (autoSpeak && messages.length > 0) {
              const lastMsg = messages[messages.length - 1];
              const role = lastMsg.role || (lastMsg as any).sender || "user";
              if (role === "assistant") {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(lastMsg.content);
                const isTamil = /[\u0B80-\u0BFF]/.test(lastMsg.content);
                const targetLang = isTamil ? "ta-IN" : "en-US";
                utterance.lang = targetLang;

                const voices = window.speechSynthesis.getVoices();
                const matchingVoices = voices.filter(
                  (v) =>
                    v.lang.startsWith(targetLang) ||
                    v.lang.startsWith(isTamil ? "ta" : "en")
                );

                const bestVoice =
                  matchingVoices.find((v) =>
                    v.name.toLowerCase().includes("google")
                  ) ||
                  matchingVoices.find((v) =>
                    v.name.toLowerCase().includes("microsoft")
                  ) ||
                  matchingVoices.find((v) =>
                    v.name.toLowerCase().includes("natural")
                  ) ||
                  matchingVoices[0];

                if (bestVoice) {
                  utterance.voice = bestVoice;
                }
                window.speechSynthesis.speak(utterance);
              }
            }
          } catch (err) {
            set({ isLoading: false });
          }
        },
        attachments  // ← forward attachments to backend stream
      );
    } catch (error: any) {
      if (error.code === "APP_DAILY_QUOTA_EXCEEDED") {
        set((state) => ({
          isLoading: false,
          messages: state.messages.filter((m) => m._id !== assistantMsgId),
        }));
        
        useSubscriptionStore.getState().openQuotaModal({
          feature: error.feature,
          plan: error.plan,
          used: error.used,
          limit: error.limit,
          resetAt: error.resetAt,
          upgradeAvailable: error.upgradeAvailable,
          availablePlans: error.availablePlans
        });
      } else {
        set((state) => ({
          isLoading: false,
          messages: state.messages.map((m) =>
            m._id === assistantMsgId
              ? { ...m, content: `❌ Error: ${error.message || "Failed to generate response"}` }
              : m
          ),
        }));
      }
    }
  },

  clearMessages() {
    set({
      messages: [],
    });
  },
}));