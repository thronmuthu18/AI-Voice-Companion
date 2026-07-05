import Chat from "../models/Chat.model";
import Message from "../models/Message.model";
import mongoose from "mongoose";
import { extractTextFromBase64 } from "../utils/documentParser";

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

    // Process document text extraction if attachments are present
    let processedAttachments = attachments;
    if (attachments && attachments.length > 0) {
      processedAttachments = await Promise.all(
        attachments.map(async (att) => {
          const isDoc =
            att.mimeType.startsWith("text/") ||
            att.mimeType === "application/pdf" ||
            att.mimeType ===
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            att.mimeType === "application/msword";

          if (isDoc && !att.extractedText) {
            try {
              const text = await extractTextFromBase64(
                att.mimeType,
                att.url
              );

              return { ...att, extractedText: text };
            } catch (err: any) {
              console.error(
                "Text extraction failed for file:",
                att.name,
                err
              );

              return {
                ...att,
                extractedText: `[Text extraction failed for document "${att.name}": ${err.message}]`,
              };
            }
          }

          return att;
        })
      );
    }

    // Save Message with processed attachments
    const message = await Message.create({
      chatId,
      sender: role,
      content,
      attachments: processedAttachments,
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
    const messages = await Message.find({ chatId }).sort({
      createdAt: 1,
    });

    return messages.map((message) => {
      const role = message.sender as "user" | "assistant";

      let promptContent = message.content;
      const contentBlocks: any[] = [];
      let hasImage = false;

      if (
        message.attachments &&
        message.attachments.length > 0
      ) {
        for (const attachment of message.attachments) {
          // If document, append extracted text content
          if (attachment.extractedText) {
            promptContent += `\n\n[Uploaded Document: ${attachment.name}]\n${attachment.extractedText}\n[End of Document: ${attachment.name}]`;
          }

          // If image, add it to OpenAI content blocks
          if (attachment.mimeType.startsWith("image/")) {
            hasImage = true;

            contentBlocks.push({
              type: "image_url",
              image_url: {
                url: attachment.url,
              },
            });
          }
        }
      }

      // If images exist, map to array content format
      if (hasImage) {
        contentBlocks.unshift({
          type: "text",
          text: promptContent,
        });

        return {
          role,
          content: contentBlocks as any,
        };
      }

      return {
        role,
        content: promptContent,
      };
    });
  }
}

export const messageService = new MessageService();