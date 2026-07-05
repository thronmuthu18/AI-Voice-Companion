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

      // Update chat title if it's the first message
      await chatService.updateChatTitle(
        chatId,
        message
      );

      const isImageRequest = message.trim().toLowerCase().startsWith("/image");

      if (isImageRequest) {
        const imagePrompt = message.trim().substring(6).trim() || "beautiful landscape";
        const imageBase64 = await aiService.generateImage(imagePrompt);

        const attachment = {
          name: `${imagePrompt.substring(0, 20).replace(/\s+/g, "_")}.png`,
          mimeType: "image/png",
          url: imageBase64,
          size: imageBase64.length,
        };

        const assistantMessage = await messageService.createMessage(
          chatId,
          "assistant",
          `Here is the image generated for: "${imagePrompt}"`,
          [attachment]
        );

        return res.status(200).json({
          success: true,
          assistantMessage,
          response: `Here is the image generated for: "${imagePrompt}"`,
        });
      }

      // Generate completion response
      const aiReply =
        await aiService.generateResponse(chatId);

      // Save assistant response in database
      const assistantMessage =
        await messageService.createMessage(
          chatId,
          "assistant",
          aiReply
        );

      return res.status(200).json({
        success: true,
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

      // Update chat title if it's the first message
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

      const isImageRequest = message.trim().toLowerCase().startsWith("/image");

      if (isImageRequest) {
        const imagePrompt = message.trim().substring(6).trim() || "beautiful landscape";

        res.write(
          `data: ${JSON.stringify({
            token: `🎨 Generating image for: "${imagePrompt}"...\n(This will take about 5-10 seconds)`,
          })}\n\n`
        );

        // Generate the image
        const imageBase64 = await aiService.generateImage(imagePrompt);

        const attachment = {
          name: `${imagePrompt.substring(0, 20).replace(/\s+/g, "_")}.png`,
          mimeType: "image/png",
          url: imageBase64,
          size: imageBase64.length,
        };

        // Save assistant response in database with generated image attachment
        await messageService.createMessage(
          chatId,
          "assistant",
          `Here is the image generated for: "${imagePrompt}"`,
          [attachment]
        );

        res.write(
          `data: ${JSON.stringify({
            done: true,
          })}\n\n`
        );

        res.end();
        return;
      }

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

      // Save complete assistant message to database once streaming completes
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
      } else {
        res.write(
          `data: ${JSON.stringify({
            token: `\n❌ Image generation error: ${error.message}`,
          })}\n\n`
        );
        res.write(
          `data: ${JSON.stringify({
            done: true,
          })}\n\n`
        );
        res.end();
      }

      return;
    }
  }
}

export const aiController =
  new AIController();