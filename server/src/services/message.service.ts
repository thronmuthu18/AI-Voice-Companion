import Chat from "../models/Chat.model";
import Message from "../models/Message.model";
import mongoose from "mongoose";
import { extractTextFromFile } from "../utils/documentParser";
import path from "path";
import fs from "fs";

export class MessageService {
  async createMessage(
    chatId: string,
    role: "user" | "assistant",
    content: string,
    attachments?: any[]
  ) {
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      throw new Error("Invalid chat id");
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }

    let processedAttachments = attachments;
    if (attachments && attachments.length > 0) {
      processedAttachments = await Promise.all(
        attachments.map(async (att) => {
          const isDoc =
            att.mimeType.startsWith("text/") ||
            att.mimeType === "application/pdf" ||
            att.mimeType ===
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            att.mimeType === "application/msword" ||
            att.mimeType === "text/csv";

          if (isDoc && !att.extractedText) {
            try {
              // Resolve local file path from attachment URL
              const filename = att.url.split("/").pop() || "";
              const filePath = path.join(process.cwd(), "uploads", filename);

              const text = await extractTextFromFile(
                att.mimeType,
                filePath
              );

              return { ...att, extractedText: text };
            } catch (err: any) {
              console.error(
                "Text extraction failed for local file:",
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

    // Save Message
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
    // Cap history at last 40 messages to prevent unbounded provider API cost abuse
    const MAX_HISTORY_MESSAGES = 40;

    const messages = await Message.find({ chatId }).sort({
      createdAt: 1,
    }).limit(MAX_HISTORY_MESSAGES * 2) // fetch extra and take from end
    .then(msgs => msgs.slice(-MAX_HISTORY_MESSAGES));


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

          // If image, read from disk on the fly and encode as base64 for OpenAI Vision API
          if (attachment.mimeType.startsWith("image/")) {
            hasImage = true;

            try {
              const filename = attachment.url.split("/").pop() || "";
              const filePath = path.join(process.cwd(), "uploads", filename);

              if (fs.existsSync(filePath)) {
                const buffer = fs.readFileSync(filePath);
                const base64Img = `data:${attachment.mimeType};base64,${buffer.toString("base64")}`;

                contentBlocks.push({
                  type: "image_url",
                  image_url: {
                    url: base64Img,
                  },
                });
              } else if (attachment.url.startsWith("data:image/")) {
                // If it is legacy base64 data url, use it directly
                contentBlocks.push({
                  type: "image_url",
                  image_url: {
                    url: attachment.url,
                  },
                });
              }
            } catch (err) {
              console.error("Failed to read image attachment from disk:", err);
            }
          }
        }
      }

      // If images exist, map to array content format (OpenAI Vision only supports image URLs on 'user' role messages)
      if (hasImage && role === "user") {
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