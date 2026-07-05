import { Request, Response } from "express";
import { aiService } from "../services/ai.service";
import { chatService } from "../services/chat.service";
import { messageService } from "../services/message.service";
import { streamService } from "../services/stream.service";

export class AIController {
  async generateResponse(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { chatId, message } = req.body;

      if (!chatId || !message) {
        return res.status(400).json({
          success: false,
          message: "chatId and message are required",
        });
      }

      const userMessage = await messageService.createMessage(
        chatId,
        "user",
        message
      );

      await chatService.updateChatTitle(
        chatId,
        message
      );

      const aiReply =
        await aiService.generateResponse(chatId);

      const assistantMessage =
        await messageService.createMessage(
          chatId,
          "assistant",
          aiReply
        );

      return res.status(200).json({
        success: true,
        userMessage,
        assistantMessage,
        response: aiReply,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message:
          error.message || "Internal Server Error",
      });
    }
  }

  async streamResponse(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { chatId, message } = req.body;

      if (!chatId || !message) {
        res.status(400).json({
          success: false,
          message: "chatId and message are required",
        });
        return;
      }

      await messageService.createMessage(
        chatId,
        "user",
        message
      );

      await chatService.updateChatTitle(
        chatId,
        message
      );

      res.setHeader(
        "Content-Type",
        "text/event-stream"
      );
      res.setHeader(
        "Cache-Control",
        "no-cache"
      );
      res.setHeader(
        "Connection",
        "keep-alive"
      );

      const stream =
        await streamService.streamResponse(chatId);

      let fullResponse = "";

      for await (const chunk of stream) {
        const token =
          chunk.choices[0]?.delta?.content ?? "";

        fullResponse += token;

        res.write(
          `data: ${JSON.stringify({
            token,
          })}\n\n`
        );
      }

      await messageService.createMessage(
        chatId,
        "assistant",
        fullResponse
      );

      res.write(
        `data: ${JSON.stringify({
          done: true,
        })}\n\n`
      );

      res.end();
      return;
    } catch (error: any) {
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message:
            error.message ||
            "Internal Server Error",
        });
      }

      return;
    }
  }
}

export const aiController =
  new AIController();