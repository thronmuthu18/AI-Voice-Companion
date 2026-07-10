import { Request, Response } from "express";
import { chatService } from "../services/chat.service";
import { messageService } from "../services/message.service";
import { streamService } from "../services/stream.service";
import { intelligenceService } from "../services/intelligence.service";
import { contextService } from "../services/context.service";
import { coordinatorAgent } from "../services/agents/coordinator.agent";
import { auditService } from "../services/audit.service";
import { entitlementService } from "../services/entitlement.service";

export class AIController {
  async generateResponse(
    req: Request,
    res: Response
  ): Promise<Response> {
    let reservedFeature: "textChat" | "imageGenerate" | "videoGenerate" | "fileGenerate" | undefined;
    const userId = (req as any).user?.userId;
    try {
      const { chatId, message, attachments: requestAttachments } = req.body;

      if (!chatId || !message) {
        return res.status(400).json({
          success: false,
          message: "chatId and message are required",
        });
      }

      await chatService.updateChatTitle(chatId, message);

      // Resolve context & classify intent through modular Intelligence Layer
      const { hasImage, hasDocument, latestImage, latestDocument, latestAudio } = await intelligenceService.resolveContext(chatId, requestAttachments);
      const classification = await intelligenceService.classifyIntent(message, hasImage, hasDocument, chatId);

      // Check daily AI usage limits for the authenticated user and reserve quota atomically
      const quotaCheck = await checkQuotaAndReturn(userId, classification.context.primaryIntent, res);
      if (!quotaCheck.allowed) {
        return res;
      }
      reservedFeature = quotaCheck.feature;

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

      // Map resolved message
      const activeCtx = { chatId, latestImage, latestDocument, latestAudio };
      const resolvedMessage = contextService.resolveReferences(message, activeCtx);

      // Coordinate execution via Multi-Agent Orchestrator
      const orchestration = await coordinatorAgent.coordinate(resolvedMessage, classification.intents, activeCtx);

      if (userId && reservedFeature) {
        auditService.log("USAGE_INCREMENTED" as any, userId, { chatId, feature: reservedFeature }, req.ip);
      }

      const assistantMessage = await messageService.createMessage(
        chatId,
        "assistant",
        orchestration.content,
        orchestration.attachments
      );

      return res.status(200).json({
        success: true,
        assistantMessage,
        response: orchestration.content,
      });
    } catch (error: any) {
      if (userId && reservedFeature) {
        await entitlementService.releaseQuota(userId, reservedFeature);
      }
      return handleAIError(error, res);
    }
  }

  async streamResponse(
    req: Request,
    res: Response
  ): Promise<void> {
    let reservedFeature: "textChat" | "imageGenerate" | "videoGenerate" | "fileGenerate" | undefined;
    const userId = (req as any).user?.userId;
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

      // Resolve context & classify intent through modular Intelligence Layer
      const { hasImage, hasDocument, latestImage, latestDocument, latestAudio } = await intelligenceService.resolveContext(chatId, requestAttachments);
      const classification = await intelligenceService.classifyIntent(message, hasImage, hasDocument, chatId);

      // Check daily AI usage limits and reserve quota atomically
      const quotaCheck = await checkQuotaAndReturn(userId, classification.context.primaryIntent, res);
      if (!quotaCheck.allowed) {
        return;
      }
      reservedFeature = quotaCheck.feature;

      // Safe to set event stream headers now
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Handle low-confidence intent clarification question in streaming
      if (classification.clarificationQuestion) {
        const question = classification.clarificationQuestion;
        res.write(`data: ${JSON.stringify({ token: question })}\n\n`);
        await messageService.createMessage(chatId, "assistant", question);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
      }

      // Map resolved message
      const activeCtx = { chatId, latestImage, latestDocument, latestAudio };
      const resolvedMessage = contextService.resolveReferences(message, activeCtx);

      // Select agents via Multi-Agent Orchestrator
      const agents = coordinatorAgent.planTasks(classification.intents);
      const primaryAgent = agents[0];

      // If primary agent is MediaAgent, delegate execution cleanly
      if (primaryAgent.name === "Media Agent" && (classification.intents.includes("image_generation") || (classification.intents.includes("image_editing") && latestImage))) {
        res.write(
          `data: ${JSON.stringify({
            token: `🎨 Media Agent executing: "${message}"...\n(This may take 5–15 seconds)`,
          })}\n\n`
        );

        const response = await primaryAgent.execute(resolvedMessage, activeCtx);

        await messageService.createMessage(
          chatId,
          "assistant",
          response.content,
          response.attachments
        );

        if (userId && reservedFeature) {
          auditService.log("USAGE_INCREMENTED" as any, userId, { chatId, feature: reservedFeature }, req.ip);
        }

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
      }

      // Default stream completions execution
      const stream = await streamService.streamResponse(chatId);

      let fullResponse = "";

      for await (const token of stream) {
        fullResponse += token;
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }

      await messageService.createMessage(chatId, "assistant", fullResponse);

      if (userId && reservedFeature) {
        auditService.log("USAGE_INCREMENTED" as any, userId, { chatId, feature: reservedFeature }, req.ip);
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    } catch (error: any) {
      if (userId && reservedFeature) {
        await entitlementService.releaseQuota(userId, reservedFeature);
      }
      return handleAIError(error, res, true);
    }
  }
}

/**
 * Dynamic helper that maps user request intents to the environment-driven
 * EntitlementService daily quota check, returning HTTP 429 when exceeded.
 */
async function checkQuotaAndReturn(
  userId: string,
  primaryIntent: string,
  res: Response
): Promise<{ allowed: boolean; feature?: "textChat" | "imageGenerate" | "videoGenerate" | "fileGenerate" }> {
  let feature: "textChat" | "imageGenerate" | "videoGenerate" | "fileGenerate";

  if (primaryIntent === "image_generation" || primaryIntent === "image_editing") {
    feature = "imageGenerate";
  } else if (primaryIntent === "video_request") {
    feature = "videoGenerate";
  } else if (primaryIntent === "file_generation" || primaryIntent === "report_generation" || primaryIntent === "code_generation") {
    feature = "fileGenerate";
  } else {
    // Normal text chat, or file/image analysis queries which do not consume media quotas
    feature = "textChat";
  }

  const result = await entitlementService.reserveQuota(userId, feature);

  if (!result.allowed) {
    const state = await entitlementService.checkEntitlement(userId, feature);
    res.status(429).json({
      code: "APP_DAILY_QUOTA_EXCEEDED",
      feature,
      plan: state.plan,
      used: state.used,
      limit: state.limit,
      remaining: state.remaining,
      resetAt: state.resetAt,
      upgradeAvailable: state.upgradeAvailable,
      availablePlans: ["BASIC_199", "PRO_299"]
    });
    return { allowed: false, feature };
  }

  return { allowed: true, feature };
}

/**
 * Robust helper to map AI connectivity errors, rate limits, and network timeouts
 * to production-safe status codes and messages without exposing server secrets.
 */
function handleAIError(error: any, res: Response, isStreaming = false): any {
  console.error("[AI Error Handler]", error);
  const isTimeout = error.code === "ETIMEDOUT" || error.message?.includes("timeout");
  
  const isProviderQuota = 
    error.code === "RATE_LIMIT_OR_QUOTA_EXHAUSTED" || 
    error.code === "GEMINI_QUOTA_UNAVAILABLE" || 
    error.message?.includes("quota") ||
    error.message?.includes("RESOURCE_EXHAUSTED") ||
    (error.statusCode === 429 && !res.headersSent);

  const statusCode = isTimeout ? 504 : isProviderQuota ? 429 : 502;
  
  let errorCode = "AI_PROVIDER_ERROR";
  let userMessage = error.message || "An unexpected error occurred during request processing.";

  if (isTimeout) {
    errorCode = "AI_TIMEOUT";
    userMessage = "AI request timed out. Please try again shortly.";
  } else if (isProviderQuota) {
    errorCode = "PROVIDER_QUOTA_EXHAUSTED";
    userMessage = "AI provider account quota is exhausted. Please try again later.";
  }

  if (isStreaming && res.headersSent) {
    res.write(
      `data: ${JSON.stringify({
        token: `\n❌ Error: ${userMessage}`,
      })}\n\n`
    );
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } else {
    return res.status(statusCode).json({
      success: false,
      code: errorCode,
      message: userMessage,
    });
  }
}

export const aiController = new AIController();