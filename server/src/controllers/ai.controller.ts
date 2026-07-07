import { Request, Response } from "express";
import { aiService } from "../services/ai.service";
import { chatService } from "../services/chat.service";
import { messageService } from "../services/message.service";
import { streamService } from "../services/stream.service";
import { intelligenceService } from "../services/intelligence.service";
import { contextService } from "../services/context.service";
import path from "path";
import fs from "fs";

function getFileSize(relativeUrl: string): number {
  try {
    const filename = relativeUrl.split("/").pop() || "";
    const filePath = path.join(process.cwd(), "uploads", filename);
    return fs.existsSync(filePath) ? fs.statSync(filePath).size : 100000;
  } catch {
    return 100000;
  }
}

export class AIController {
  async generateResponse(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { chatId, message, attachments: requestAttachments } = req.body;

      if (!chatId || !message) {
        return res.status(400).json({
          success: false,
          message: "chatId and message are required",
        });
      }

      await chatService.updateChatTitle(chatId, message);

      // Resolve context & classify intent through modular Intelligence Layer (passing chatId to resolve references)
      const { hasImage, hasDocument, latestImage, latestDocument, latestAudio } = await intelligenceService.resolveContext(chatId, requestAttachments);
      const classification = await intelligenceService.classifyIntent(message, hasImage, hasDocument, chatId);

      // Handle low-confidence intent clarification question
      if (classification.clarificationQuestion) {
        const assistantMessage = await messageService.createMessage(
          chatId,
          "assistant",
          classification.clarificationQuestion
        );
        return res.status(200).json({
          success: true,
          assistantMessage,
          response: classification.clarificationQuestion,
        });
      }

      const primaryIntent = classification.context.primaryIntent;
      
      // Resolve pronouns in the message before passing to executors
      const activeCtx = { latestImage, latestDocument, latestAudio };
      const resolvedMessage = contextService.resolveReferences(message, activeCtx);

      // Handle Image Edit Intent routing
      if (primaryIntent === "image_editing" && latestImage) {
        const editedUrl = await aiService.editImage(
          latestImage.url,
          resolvedMessage
        );

        const attachment = {
          name: `edited_${latestImage.name}`.replace(/\.[^/.]+$/, ".png"),
          mimeType: "image/png",
          url: editedUrl,
          size: getFileSize(editedUrl),
        };

        const assistantMessage = await messageService.createMessage(
          chatId,
          "assistant",
          `Here is the edited image for: "${message}"`,
          [attachment]
        );

        return res.status(200).json({
          success: true,
          assistantMessage,
          response: `Here is the edited image for: "${message}"`,
        });
      }

      // Handle Image Generation Intent routing
      if (primaryIntent === "image_generation") {
        const generatedUrl = await aiService.generateImage(resolvedMessage);

        const attachment = {
          name: `${message.substring(0, 20).replace(/\s+/g, "_")}.png`,
          mimeType: "image/png",
          url: generatedUrl,
          size: getFileSize(generatedUrl),
        };

        const assistantMessage = await messageService.createMessage(
          chatId,
          "assistant",
          `Here is the image generated for: "${message}"`,
          [attachment]
        );

        return res.status(200).json({
          success: true,
          assistantMessage,
          response: `Here is the image generated for: "${message}"`,
        });
      }

      // Normal text response
      const aiReply = await aiService.generateResponse(chatId);

      const assistantMessage = await messageService.createMessage(
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
        message: error.message || "Internal Server Error",
      });
    }
  }

  async streamResponse(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { chatId, message, attachments: requestAttachments } = req.body;

      if (!chatId || !message) {
        res.status(400).json({
          success: false,
          message: "chatId and message are required",
        });
        return;
      }

      await chatService.updateChatTitle(chatId, message);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Resolve context & classify intent through modular Intelligence Layer (passing chatId to resolve references)
      const { hasImage, hasDocument, latestImage, latestDocument, latestAudio } = await intelligenceService.resolveContext(chatId, requestAttachments);
      const classification = await intelligenceService.classifyIntent(message, hasImage, hasDocument, chatId);

      // Handle low-confidence intent clarification question in streaming
      if (classification.clarificationQuestion) {
        const question = classification.clarificationQuestion;
        res.write(`data: ${JSON.stringify({ token: question })}\n\n`);
        await messageService.createMessage(chatId, "assistant", question);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
      }

      const primaryIntent = classification.context.primaryIntent;

      // Resolve pronouns in the message before passing to executors
      const activeCtx = { latestImage, latestDocument, latestAudio };
      const resolvedMessage = contextService.resolveReferences(message, activeCtx);

      // Handle Image Edit routing
      if (primaryIntent === "image_editing" && latestImage) {
        res.write(
          `data: ${JSON.stringify({
            token: `🎨 Editing your image: "${message}"...\n(This may take 5–15 seconds)`,
          })}\n\n`
        );

        const editedUrl = await aiService.editImage(latestImage.url, resolvedMessage);

        const attachment = {
          name: `edited_${latestImage.name}`.replace(/\.[^/.]+$/, ".png"),
          mimeType: "image/png",
          url: editedUrl,
          size: getFileSize(editedUrl),
        };

        await messageService.createMessage(
          chatId,
          "assistant",
          `Here is the edited image for: "${message}"`,
          [attachment]
        );

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
      }

      // Handle Image Generation routing
      if (primaryIntent === "image_generation") {
        res.write(
          `data: ${JSON.stringify({
            token: `🎨 Generating image: "${message}"...\n(This may take 5–15 seconds)`,
          })}\n\n`
        );

        const generatedUrl = await aiService.generateImage(resolvedMessage);

        const attachment = {
          name: `${message.substring(0, 20).replace(/\s+/g, "_")}.png`,
          mimeType: "image/png",
          url: generatedUrl,
          size: getFileSize(generatedUrl),
        };

        await messageService.createMessage(
          chatId,
          "assistant",
          `Here is the image generated for: "${message}"`,
          [attachment]
        );

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
      }

      // Normal text streaming
      const stream = await streamService.streamResponse(chatId);

      let fullResponse = "";

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content ?? "";
        fullResponse += token;
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }

      await messageService.createMessage(chatId, "assistant", fullResponse);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    } catch (error: any) {
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: error.message || "Internal Server Error",
        });
      } else {
        res.write(
          `data: ${JSON.stringify({
            token: `\n❌ Error: ${error.message}`,
          })}\n\n`
        );
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      }
      return;
    }
  }
}

export const aiController = new AIController();