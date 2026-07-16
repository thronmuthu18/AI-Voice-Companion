import { Request, Response } from "express";
import { env } from "../config/env";
import { entitlementService } from "../services/entitlement.service";
import { messageService } from "../services/message.service";
import Chat from "../models/Chat.model";

// Active sessions memory registry to prevent concurrent calls
const ACTIVE_SESSIONS = new Map<string, Date>();

export async function createRealtimeSession(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    // 1. Check feature flag status
    if (!env.REALTIME_VOICE_ENABLED) {
      res.json({
        enabled: false,
        provider: "none",
        message: "Realtime voice mode feature is currently disabled in system settings.",
      });
      return;
    }

    // 2. Validate user daily limits/quota using textChat quota feature
    const quota = await entitlementService.checkEntitlement(userId, "textChat");
    if (!quota.allowed) {
      res.status(429).json({
        success: false,
        error: "DAILY_LIMIT_REACHED",
        message: "Daily conversation quota exceeded. Upgrade to Pro for more sessions.",
      });
      return;
    }

    // 3. Prevent duplicate concurrent sessions for the same user account
    const activeSince = ACTIVE_SESSIONS.get(userId);
    const maxSessionMin = env.REALTIME_VOICE_MAX_SESSION_MINUTES || 15;
    if (activeSince) {
      const elapsedMinutes = (Date.now() - activeSince.getTime()) / 60000;
      if (elapsedMinutes < maxSessionMin) {
        res.status(409).json({
          success: false,
          error: "CONCURRENT_SESSION_LIMIT",
          message: "You already have an active voice session. Please disconnect it first.",
        });
        return;
      } else {
        // Session stale/timed out, clean up
        ACTIVE_SESSIONS.delete(userId);
      }
    }

    // 4. Request short-lived client secret from OpenAI Realtime API sessions
    if (!env.OPENAI_API_KEY) {
      res.status(500).json({
        success: false,
        message: "Realtime voice model is misconfigured. Missing API credentials.",
      });
      return;
    }

    const oaiResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.REALTIME_VOICE_MODEL || "gpt-4o-mini-realtime-preview-2024-12-17",
        modalities: ["audio", "text"],
        voice: "alloy",
      }),
    });

    if (!oaiResponse.ok) {
      const errText = await oaiResponse.text();
      console.error("[Voice Controller] OpenAI Realtime API call failed:", errText);
      res.status(502).json({
        success: false,
        message: "Failed to initialize realtime voice credentials from service provider.",
      });
      return;
    }

    const sessionData = (await oaiResponse.json()) as any;

    // Register active user session
    ACTIVE_SESSIONS.set(userId, new Date());

    // Deduct/reserve quota for textChat entitlement dynamically
    await entitlementService.reserveQuota(userId, "textChat");

    res.json({
      enabled: true,
      provider: "openai",
      clientSecret: sessionData.client_secret?.value,
      session: {
        id: sessionData.id,
        expiresAt: sessionData.client_secret?.expires_at,
      },
    });
  } catch (error: any) {
    console.error("[Voice Controller] Error generating realtime voice session:", error);
    res.status(500).json({
      success: false,
      message: "An internal server error occurred while configuring voice session.",
    });
  }
}

export async function closeRealtimeSession(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
    if (userId) {
      ACTIVE_SESSIONS.delete(userId);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
}

export async function saveRealtimeVoiceMessages(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
    const { chatId, userContent, assistantContent } = req.body;

    if (!chatId || !userContent || !assistantContent) {
      res.status(400).json({ success: false, message: "Missing required fields" });
      return;
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      res.status(404).json({ success: false, message: "Chat not found." });
      return;
    }
    if (String(chat.userId) !== String(userId)) {
      res.status(403).json({ success: false, message: "Forbidden." });
      return;
    }

    // Persist user query to database
    const userMsg = await messageService.createMessage(chatId, "user", userContent);
    // Persist assistant response to database
    const assistantMsg = await messageService.createMessage(chatId, "assistant", assistantContent);

    res.status(201).json({
      success: true,
      data: {
        userMessage: userMsg,
        assistantMessage: assistantMsg,
      },
    });
  } catch (error: any) {
    console.error("[Voice Controller] Error saving realtime voice messages:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while saving conversation history.",
    });
  }
}
