import { create } from "zustand";
import { messageService } from "../services/message.service";
import { aiService } from "../services/ai.service";
import type { Message } from "../types/api.types";

interface MessageState {
  messages: Message[];
  isLoading: boolean;

  fetchMessages: (chatId: string) => Promise<void>;
  sendMessage: (
    chatId: string,
    content: string
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

  async sendMessage(chatId, content) {
    set({ isLoading: true });

    try {
      // Save user message
      const userMessage = await messageService.sendMessage(
        chatId,
        content
      );

      set((state) => ({
        messages: [...state.messages, userMessage],
      }));

      // Generate AI response
      const ai = await aiService.generateResponse(
        chatId,
        content
      );

      const assistantMessage: Message = {
        _id: crypto.randomUUID(),
        chatId,
        role: "assistant",
        content: ai.response,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      set((state) => ({
        messages: [
          ...state.messages,
          assistantMessage,
        ],
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  clearMessages() {
    set({
      messages: [],
    });
  },
}));