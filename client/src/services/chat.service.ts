import api from "./api";
import type { Chat } from "../types/api.types";

export class ChatService {
  async getChats(): Promise<Chat[]> {
    const response = await api.get("/chat");

    return response.data.chats;
  }

  async createChat(title: string): Promise<Chat> {
    const response = await api.post("/chat", {
      title,
    });

    return response.data.chat;
  }

  async renameChat(
    chatId: string,
    title: string
  ): Promise<Chat> {
    const response = await api.put(
      `/chat/${chatId}`,
      {
        title,
      }
    );

    return response.data.chat;
  }

  async pinChat(
    chatId: string
  ) {
    const response = await api.patch(
      `/chat/${chatId}/pin`
    );

    return response.data;
  }

  async archiveChat(
    chatId: string
  ) {
    const response = await api.patch(
      `/chat/${chatId}/archive`
    );

    return response.data;
  }

  async deleteChat(
    chatId: string
  ) {
    const response = await api.delete(
      `/chat/${chatId}`
    );

    return response.data;
  }
}

export const chatService = new ChatService();