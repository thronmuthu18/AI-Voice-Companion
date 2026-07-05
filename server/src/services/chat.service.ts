import Chat from "../models/Chat.model";
import { openai } from "../config/openai";

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
    firstMessage: string
  ) {
    const chat = await Chat.findById(chatId);

    if (!chat) {
      throw new Error("Chat not found");
    }

    // Don't overwrite manually renamed chats
    if (chat.title !== "New Chat") {
      return chat;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Generate a very short chat title (maximum 5 words). Return only the title without quotes or punctuation.",
        },
        {
          role: "user",
          content: firstMessage,
        },
      ],
      max_tokens: 20,
      temperature: 0.3,
    });

    chat.title =
      completion.choices[0]?.message?.content?.trim() ||
      "New Chat";

    await chat.save();

    return chat;
  }

  async renameChat(
    chatId: string,
    title: string
  ) {
    const chat = await Chat.findById(chatId);

    if (!chat) {
      throw new Error("Chat not found");
    }

    chat.title = title.trim();

    await chat.save();

    return chat;
  }

  async pinChat(
    chatId: string
  ) {
    const chat = await Chat.findById(chatId);

    if (!chat) {
      throw new Error("Chat not found");
    }

    chat.isPinned = !chat.isPinned;

    await chat.save();

    return chat;
  }

  async archiveChat(
    chatId: string
  ) {
    const chat = await Chat.findById(chatId);

    if (!chat) {
      throw new Error("Chat not found");
    }

    chat.isArchived = true;

    await chat.save();

    return chat;
  }

  async deleteChat(
    chatId: string
  ) {
    const chat = await Chat.findById(chatId);

    if (!chat) {
      throw new Error("Chat not found");
    }

    await Chat.findByIdAndDelete(chatId);

    return;
  }
}

export const chatService = new ChatService();