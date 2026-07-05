import { Request, Response } from "express";
import { chatService } from "../services/chat.service";

export class ChatController {

  async createChat(
    req: Request,
    res: Response
  ) {
    try {

      const userId = (req as any).user.userId;

      const chat = await chatService.createChat(
        userId,
        "New Chat"
      );

      return res.status(201).json({
        success: true,
        message: "Chat created successfully",
        chat,
      });

    } catch (error: any) {

      return res.status(500).json({
        success: false,
        message: error.message,
      });

    }
  }

  async getChats(
    req: Request,
    res: Response
  ) {
    try {

      const userId = (req as any).user.userId;

      const chats = await chatService.getChats(userId);

      return res.status(200).json({
        success: true,
        chats,
      });

    } catch (error: any) {

      return res.status(500).json({
        success: false,
        message: error.message,
      });

    }
  }

  async renameChat(
    req: Request,
    res: Response
  ) {
    try {

      const { chatId } = req.params;
      const { title } = req.body;

      const chat = await chatService.renameChat(
        chatId,
        title
      );

      return res.status(200).json({
        success: true,
        message: "Chat renamed successfully",
        chat,
      });

    } catch (error: any) {

      return res.status(500).json({
        success: false,
        message: error.message,
      });

    }
  }

  async pinChat(
    req: Request,
    res: Response
  ) {
    try {

      const { chatId } = req.params;

      const chat = await chatService.pinChat(chatId);

      return res.status(200).json({
        success: true,
        message: "Chat updated successfully",
        chat,
      });

    } catch (error: any) {

      return res.status(500).json({
        success: false,
        message: error.message,
      });

    }
  }

  async archiveChat(
    req: Request,
    res: Response
  ) {
    try {

      const { chatId } = req.params;

      const chat = await chatService.archiveChat(chatId);

      return res.status(200).json({
        success: true,
        message: "Chat archived successfully",
        chat,
      });

    } catch (error: any) {

      return res.status(500).json({
        success: false,
        message: error.message,
      });

    }
  }

  async deleteChat(
    req: Request,
    res: Response
  ) {
    try {

      const { chatId } = req.params;

      await chatService.deleteChat(chatId);

      return res.status(200).json({
        success: true,
        message: "Chat deleted successfully",
      });

    } catch (error: any) {

      return res.status(500).json({
        success: false,
        message: error.message,
      });

    }
  }

}

export const chatController = new ChatController();