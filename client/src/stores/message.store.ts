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
      // Save user message in the database
      const userMessage = await messageService.sendMessage(
        chatId,
        content
      );

      // Append user message to store state immediately
      set((state) => ({
        messages: [...state.messages, userMessage],
      }));

      // Setup temporary placeholder assistant message with client-side unique id
      const assistantMsgId = crypto.randomUUID();
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

      // Stream AI response token-by-token
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
          } catch (err) {
            set({ isLoading: false });
          }
        }
      );
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