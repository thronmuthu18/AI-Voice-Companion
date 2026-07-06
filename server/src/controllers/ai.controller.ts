import { Request, Response } from "express";
import { aiService } from "../services/ai.service";
import { chatService } from "../services/chat.service";
import { messageService } from "../services/message.service";
import { streamService } from "../services/stream.service";
import Message from "../models/Message.model";
import path from "path";
import fs from "fs";

// Intent Detection helper for Image Generation
function detectImageGenerationIntent(message: string): boolean {
  const msg = message.toLowerCase().trim();
  if (msg.startsWith("/image")) return true;

  const directPhrases = [
    "generate an image",
    "generate image",
    "generate a logo",
    "generate logo",
    "generate a portrait",
    "create an image",
    "create image",
    "draw an image",
    "draw a picture",
    "make an image of",
    "render a portrait",
    "create a picture",
    "generate a picture",
    "generate image of",
    "create image of",
    "draw a cityscape",
    "draw a robot",
    "create a robot",
    "make a logo",
  ];

  if (directPhrases.some((phrase) => msg.includes(phrase))) {
    return true;
  }

  const patterns = [
    /^(?:create|generate|draw|design|make|paint|sketch|render)\s+(?:an?\s+|a\s+|the\s+)?(?:image|photo|picture|painting|logo|portrait|wallpaper|sketch|illustration|character|invitation|avatar|graphic|scene|drawing|background|banner|poster|version|card|art|icon|robot|cityscape|sunset|mountains|landscape|doodle|concept|model)/i,
    /^(?:generate|create|draw|make)\s+(?:a\s+|an\s+)?(?:pixar|ghibli|realistic|cinematic|anime|cartoon|3d|vector|digital|tamil|futuristic)\s+/i,
  ];

  return patterns.some((pat) => pat.test(msg));
}

// Intent Detection helper for Vision / Image Understanding queries
function detectVisionIntent(message: string): boolean {
  const msg = message.toLowerCase().trim();
  const visionRoots = [
    "what",
    "describe",
    "explain",
    "extract",
    "read",
    "summarize",
    "tell me",
    "identify",
    "analyze",
    "who is",
    "how many",
  ];
  return visionRoots.some((r) => msg.includes(r)) || msg.endsWith("?");
}

// Intent Detection helper for Image Editing
// hasImage is true if ANY image exists — either in current request or chat history
function detectImageEditingIntent(message: string, hasImage: boolean): boolean {
  if (!hasImage) return false;

  const msg = message.toLowerCase().trim();
  if (msg.startsWith("/edit")) return true;

  // If the user is asking a vision query, it belongs in the Chat Completions pipeline, not Edit
  if (detectVisionIntent(message)) return false;

  // Otherwise, if there is an image, any command is treated as an image editing action
  return true;
}

// Clean command prefixes if present
function cleanPrompt(message: string): string {
  const msg = message.trim();
  if (msg.toLowerCase().startsWith("/image")) {
    return msg.substring(6).trim();
  }
  if (msg.toLowerCase().startsWith("/edit")) {
    return msg.substring(5).trim();
  }
  return msg;
}

// Find the best image to edit — from current request attachments first, then DB history
async function resolveLatestImage(
  chatId: string,
  requestAttachments?: any[]
): Promise<{ url: string; name: string } | null> {
  // 1. Check current request attachments first (most recent)
  if (requestAttachments && requestAttachments.length > 0) {
    const imgAtt = requestAttachments.find((a) =>
      a.mimeType?.startsWith("image/")
    );
    if (imgAtt) {
      return { url: imgAtt.url, name: imgAtt.name || "image.png" };
    }
  }

  // 2. Fall back to DB history (most recent image in the thread)
  const historyMessages = await Message.find({ chatId }).sort({ createdAt: -1 });
  for (const msg of historyMessages) {
    if (msg.attachments && msg.attachments.length > 0) {
      const imgAtt = msg.attachments.find((a: any) =>
        a.mimeType?.startsWith("image/")
      );
      if (imgAtt) {
        return { url: imgAtt.url, name: imgAtt.name || "image.png" };
      }
    }
  }

  return null;
}

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

      // Resolve the latest image from the current request OR history
      const latestImage = await resolveLatestImage(chatId, requestAttachments);
      const hasImage = latestImage !== null;
      const isImageRequest = detectImageGenerationIntent(message);
      const isEditRequest = detectImageEditingIntent(message, hasImage);

      // Handle Image Edit Intent
      if (isEditRequest && latestImage) {
        const editPrompt = cleanPrompt(message);

        const editedUrl = await aiService.editImage(
          latestImage.url,
          editPrompt
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
          `Here is the edited image for: "${editPrompt}"`,
          [attachment]
        );

        return res.status(200).json({
          success: true,
          assistantMessage,
          response: `Here is the edited image for: "${editPrompt}"`,
        });
      }

      // Handle Image Generation Intent
      if (isImageRequest) {
        const imagePrompt = cleanPrompt(message);
        const generatedUrl = await aiService.generateImage(imagePrompt);

        const attachment = {
          name: `${imagePrompt.substring(0, 20).replace(/\s+/g, "_")}.png`,
          mimeType: "image/png",
          url: generatedUrl,
          size: getFileSize(generatedUrl),
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

      // Normal text response (Vision model picks up image attachments via getConversationHistory)
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

      // Resolve the latest image from the current request OR history
      const latestImage = await resolveLatestImage(chatId, requestAttachments);
      const hasImage = latestImage !== null;
      const isImageRequest = detectImageGenerationIntent(message);
      const isEditRequest = detectImageEditingIntent(message, hasImage);

      // Handle Image Edit
      if (isEditRequest && latestImage) {
        const editPrompt = cleanPrompt(message);

        res.write(
          `data: ${JSON.stringify({
            token: `🎨 Editing your image: "${editPrompt}"...\n(This may take 5–15 seconds)`,
          })}\n\n`
        );

        const editedUrl = await aiService.editImage(latestImage.url, editPrompt);

        const attachment = {
          name: `edited_${latestImage.name}`.replace(/\.[^/.]+$/, ".png"),
          mimeType: "image/png",
          url: editedUrl,
          size: getFileSize(editedUrl),
        };

        await messageService.createMessage(
          chatId,
          "assistant",
          `Here is the edited image for: "${editPrompt}"`,
          [attachment]
        );

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
      }

      // Handle Image Generation
      if (isImageRequest) {
        const imagePrompt = cleanPrompt(message);

        res.write(
          `data: ${JSON.stringify({
            token: `🎨 Generating image: "${imagePrompt}"...\n(This may take 5–15 seconds)`,
          })}\n\n`
        );

        const generatedUrl = await aiService.generateImage(imagePrompt);

        const attachment = {
          name: `${imagePrompt.substring(0, 20).replace(/\s+/g, "_")}.png`,
          mimeType: "image/png",
          url: generatedUrl,
          size: getFileSize(generatedUrl),
        };

        await messageService.createMessage(
          chatId,
          "assistant",
          `Here is the image generated for: "${imagePrompt}"`,
          [attachment]
        );

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
      }

      // Normal text streaming — OpenAI Vision picks up images from getConversationHistory
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