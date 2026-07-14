import { Request, Response } from "express";
import mongoose from "mongoose";
import { messageService } from "../services/message.service";
import Chat from "../models/Chat.model";

export class MessageController {
  async createMessage(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { chatId, content, attachment, attachments } = req.body;
      // SECURITY: role is NEVER accepted from the client. It is always "user".
      const role: "user" = "user";
      const userId = (req as any).user?.userId;

      if (!chatId || !content) {
        return res.status(400).json({
          success: false,
          message: "chatId and content are required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({ success: false, message: "Invalid chat ID." });
      }

      // IDOR: verify the authenticated user owns this chat
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ success: false, message: "Chat not found." });
      }
      if (String(chat.userId) !== String(userId)) {
        return res.status(403).json({ success: false, message: "Forbidden." });
      }

      // Handle single attachment or multiple attachments list
      let parsedAttachments = attachments;
      if (!parsedAttachments && attachment) {
        parsedAttachments = [attachment];
      }

      const message =
        await messageService.createMessage(
          chatId,
          role,
          content,
          parsedAttachments
        );

      return res.status(201).json({
        success: true,
        data: message,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "An error occurred.",
      });
    }
  }

  async getMessages(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const userId = (req as any).user?.userId;
      const { chatId } = req.params;

      if (!chatId) {
        return res.status(400).json({
          success: false,
          message: "chatId is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({ success: false, message: "Invalid chat ID." });
      }

      // IDOR: verify the authenticated user owns this chat before returning messages
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ success: false, message: "Chat not found." });
      }
      if (String(chat.userId) !== String(userId)) {
        return res.status(403).json({ success: false, message: "Forbidden." });
      }

      const messages =
        await messageService.getMessages(chatId);

      return res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "An error occurred.",
      });
    }
  }
}

export const messageController =
  new MessageController();