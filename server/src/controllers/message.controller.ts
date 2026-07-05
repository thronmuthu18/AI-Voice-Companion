import { Request, Response } from "express";
import { messageService } from "../services/message.service";

export class MessageController {
  async createMessage(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { chatId, role, content, attachment, attachments } = req.body;

      if (!chatId || !role || !content) {
        return res.status(400).json({
          success: false,
          message:
            "chatId, role and content are required",
        });
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
        message:
          error.message || "Internal Server Error",
      });
    }
  }

  async getMessages(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { chatId } = req.params;

      if (!chatId) {
        return res.status(400).json({
          success: false,
          message: "chatId is required",
        });
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
        message:
          error.message || "Internal Server Error",
      });
    }
  }
}

export const messageController =
  new MessageController();