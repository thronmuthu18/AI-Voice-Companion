import { Request, Response } from "express";
import { messageService } from "../services/message.service";

export class MessageController {
  async createMessage(req: Request, res: Response) {
    try {
      const { chatId, role, content } = req.body;

      const message = await messageService.createMessage(
        chatId,
        role,
        content
      );

      return res.status(201).json({
        success: true,
        message: "Message created successfully",
        data: message,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getMessages(req: Request, res: Response) {
    try {
      const { chatId } = req.params;

      const messages = await messageService.getMessages(chatId);

      return res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export const messageController = new MessageController();