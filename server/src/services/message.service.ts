import Chat from "../models/Chat.model";
import Message from "../models/Message.model";
import mongoose from "mongoose";

export class MessageService {
  async createMessage(
    chatId: string,
    role: "user" | "assistant",
    content: string
  ) {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      throw new Error("Invalid chat id");
    }

    // Check Chat Exists
    const chat = await Chat.findById(chatId);

    if (!chat) {
      throw new Error("Chat not found");
    }

    // Save Message
    const message = await Message.create({
      chatId,
      sender: role,
      content,
    });

    // Update Chat
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: content,
    });

    return message;
  }

  async getMessages(chatId: string) {
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      throw new Error("Invalid chat id");
    }

    return await Message.find({ chatId }).sort({
      createdAt: 1,
    });
  }

  async getConversationHistory(chatId: string) {
  const messages = await Message.find({ chatId })
    .sort({ createdAt: 1 });

  return messages.map((message) => ({
    role: message.sender as "user" | "assistant",
    content: message.content,
  }));
}

}

export const messageService = new MessageService();