import { create } from "zustand";
import { chatService } from "../services/chat.service.ts";
import type { Chat } from "../types/api.types";

interface ChatState {
  chats: Chat[];
  currentChat: Chat | null;
  isLoading: boolean;

  fetchChats: () => Promise<void>;
  createChat: (title: string) => Promise<Chat>;
  selectChat: (chat: Chat) => void;
  renameChat: (chatId: string, title: string) => Promise<void>;
  pinChat: (chatId: string) => Promise<void>;
  archiveChat: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  currentChat: null,
  isLoading: false,

  async fetchChats() {
    set({ isLoading: true });

    try {
      const chats = await chatService.getChats();

      set({
        chats,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  async createChat(title) {
    const chat = await chatService.createChat(title);

    set((state) => ({
      chats: [chat, ...state.chats],
      currentChat: chat,
    }));

    return chat;
  },

  selectChat(chat) {
    set({
      currentChat: chat,
    });
  },

  async renameChat(chatId, title) {
    const updated = await chatService.renameChat(chatId, title);

    set((state) => ({
      chats: state.chats.map((chat) =>
        chat._id === chatId ? updated : chat
      ),
      currentChat:
        state.currentChat?._id === chatId
          ? updated
          : state.currentChat,
    }));
  },

  async pinChat(chatId) {
    await chatService.pinChat(chatId);
    await get().fetchChats();
  },

  async archiveChat(chatId) {
    await chatService.archiveChat(chatId);
    await get().fetchChats();
  },

  async deleteChat(chatId) {
    await chatService.deleteChat(chatId);

    set((state) => ({
      chats: state.chats.filter(
        (chat) => chat._id !== chatId
      ),
      currentChat:
        state.currentChat?._id === chatId
          ? null
          : state.currentChat,
    }));
  },
}));