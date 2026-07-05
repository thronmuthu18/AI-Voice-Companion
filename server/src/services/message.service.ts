import Chat from "../models/Chat.model";
import Message from "../models/Message.model";
import mongoose from "mongoose";

export class MessageService {
  async createMessage(
    chatId: string,
    role: "user" | "assistant",
    content: string,
    attachments?: any[]
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

    // Save Message with optional attachments
    const message = await Message.create({
      chatId,
      sender: role,
      content,
      attachments,
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
    const messages = await Message.find({ chatId }).sort({ createdAt: 1 });

    return messages.map((message) => {
      const role = message.sender as "user" | "assistant";

      // If the message contains image attachments, map it to OpenAI Vision payload
      if (message.attachments && message.attachments.length > 0) {
        const contentBlocks: any[] = [
          { type: "text", text: message.content }
        ];

        for (const attachment of message.attachments) {
          if (attachment.mimeType.startsWith("image/")) {
            contentBlocks.push({
              type: "image_url",
              image_url: {
                url: attachment.url, // Base64 data URL
              }
            });
          }
        }

        return {
          role,
          content: contentBlocks as any,
        };
      }

      return {
        role,
        content: message.content,
      };
    });
  }
}

export const messageService = new MessageService();