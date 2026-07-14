import Chat from "../models/Chat.model";
import { ProviderRouter } from "../providers/provider.router";

export class ChatService {
  async createChat(
    userId: string,
    title: string
  ) {
    return await Chat.create({
      userId,
      title,
    });
  }

  async getChats(
    userId: string,
    archived: boolean = false
  ) {
    return await Chat.find({
      userId,
      isArchived: archived,
    }).sort({
      isPinned: -1,
      updatedAt: -1,
    });
  }

  async updateChatTitle(
    chatId: string,
    userId: string,
    firstMessage: string
  ) {
    const chat = await Chat.findById(chatId);

    if (!chat) {
      throw new Error("Chat not found");
    }

    // Ownership check
    if (String(chat.userId) !== String(userId)) {
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
    }

    // Don't overwrite manually renamed chats
    if (chat.title !== "New Chat") {
      return chat;
    }

    const provider = ProviderRouter.getProviderForAction("chat");
    const response = await provider.chat([
      {
        role: "system",
        content: "Generate a very short chat title (maximum 5 words). Return only the title without quotes or punctuation.",
      },
      {
        role: "user",
        content: firstMessage.substring(0, 500), // limit to first 500 chars for title generation
      },
    ]);

    chat.title = response.trim() || "New Chat";

    await chat.save();

    return chat;
  }

  async renameChat(
    chatId: string,
    userId: string,
    title: string
  ) {
    const chat = await Chat.findById(chatId);

    if (!chat) {
      throw new Error("Chat not found");
    }

    // Ownership check: prevent IDOR
    if (String(chat.userId) !== String(userId)) {
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
    }

    chat.title = title.trim().substring(0, 200);

    await chat.save();

    return chat;
  }

  async pinChat(
    chatId: string,
    userId: string
  ) {
    const chat = await Chat.findById(chatId);

    if (!chat) {
      throw new Error("Chat not found");
    }

    // Ownership check: prevent IDOR
    if (String(chat.userId) !== String(userId)) {
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
    }

    chat.isPinned = !chat.isPinned;

    await chat.save();

    return chat;
  }

  async archiveChat(
    chatId: string,
    userId: string
  ) {
    const chat = await Chat.findById(chatId);

    if (!chat) {
      throw new Error("Chat not found");
    }

    // Ownership check: prevent IDOR
    if (String(chat.userId) !== String(userId)) {
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
    }

    chat.isArchived = true;

    await chat.save();

    return chat;
  }

  async deleteChat(
    chatId: string,
    userId: string
  ) {
    const chat = await Chat.findById(chatId);

    if (!chat) {
      throw new Error("Chat not found");
    }

    // Ownership check: prevent IDOR
    if (String(chat.userId) !== String(userId)) {
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
    }

    await Chat.findByIdAndDelete(chatId);

    return;
  }
}

export const chatService = new ChatService();