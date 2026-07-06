import api from "./api";
import type { Message, Attachment } from "../types/api.types";

export class MessageService {
  async getMessages(
    chatId: string
  ): Promise<Message[]> {
    const response = await api.get(
      `/message/${chatId}`
    );

    return response.data.data;
  }

  async sendMessage(
    chatId: string,
    content: string,
    attachments?: Attachment[]
  ): Promise<Message> {
    const response = await api.post(
      "/message",
      {
        chatId,
        role: "user",
        content,
        attachments,
      }
    );

    return response.data.data;
  }
}

export const messageService = new MessageService();