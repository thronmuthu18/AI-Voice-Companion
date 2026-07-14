import { Request, Response } from "express";
import mongoose from "mongoose";
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
        message: "An error occurred.",
      });
    }
  }

  async getChats(
    req: Request,
    res: Response
  ) {
    try {
      const userId = (req as any).user.userId;
      const archived = req.query.archived === "true";

      const chats = await chatService.getChats(userId, archived);

      return res.status(200).json({
        success: true,
        chats,
      });

    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "An error occurred.",
      });
    }
  }

  async renameChat(
    req: Request,
    res: Response
  ) {
    try {
      const userId = (req as any).user.userId;
      const { chatId } = req.params;
      const { title } = req.body;

      if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({ success: false, message: "Invalid chat ID." });
      }

      if (!title || typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ success: false, message: "Title is required." });
      }

      const chat = await chatService.renameChat(
        chatId,
        userId,
        title
      );

      return res.status(200).json({
        success: true,
        message: "Chat renamed successfully",
        chat,
      });

    } catch (error: any) {
      if (error.statusCode === 403) {
        return res.status(403).json({ success: false, message: "Forbidden." });
      }
      return res.status(500).json({
        success: false,
        message: "An error occurred.",
      });
    }
  }

  async pinChat(
    req: Request,
    res: Response
  ) {
    try {
      const userId = (req as any).user.userId;
      const { chatId } = req.params;

      if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({ success: false, message: "Invalid chat ID." });
      }

      const chat = await chatService.pinChat(chatId, userId);

      return res.status(200).json({
        success: true,
        message: "Chat updated successfully",
        chat,
      });

    } catch (error: any) {
      if (error.statusCode === 403) {
        return res.status(403).json({ success: false, message: "Forbidden." });
      }
      return res.status(500).json({
        success: false,
        message: "An error occurred.",
      });
    }
  }

  async archiveChat(
    req: Request,
    res: Response
  ) {
    try {
      const userId = (req as any).user.userId;
      const { chatId } = req.params;

      if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({ success: false, message: "Invalid chat ID." });
      }

      const chat = await chatService.archiveChat(chatId, userId);

      return res.status(200).json({
        success: true,
        message: "Chat archived successfully",
        chat,
      });

    } catch (error: any) {
      if (error.statusCode === 403) {
        return res.status(403).json({ success: false, message: "Forbidden." });
      }
      return res.status(500).json({
        success: false,
        message: "An error occurred.",
      });
    }
  }

  async deleteChat(
    req: Request,
    res: Response
  ) {
    try {
      const userId = (req as any).user.userId;
      const { chatId } = req.params;

      if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({ success: false, message: "Invalid chat ID." });
      }

      await chatService.deleteChat(chatId, userId);

      return res.status(200).json({
        success: true,
        message: "Chat deleted successfully",
      });

    } catch (error: any) {
      if (error.statusCode === 403) {
        return res.status(403).json({ success: false, message: "Forbidden." });
      }
      return res.status(500).json({
        success: false,
        message: "An error occurred.",
      });
    }
  }

}

export const chatController = new ChatController();