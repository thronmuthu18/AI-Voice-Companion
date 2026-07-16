import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { createRealtimeSession, closeRealtimeSession, saveRealtimeVoiceMessages } from "../controllers/voice.controller";

const voiceRouter = Router();

// Retrieve client ephemeral token for OpenAI WebRTC voice mode
voiceRouter.post("/session", authenticate, createRealtimeSession);

// Close active session track
voiceRouter.post("/session/close", authenticate, closeRealtimeSession);

// Persist user query + assistant response history
voiceRouter.post("/save", authenticate, saveRealtimeVoiceMessages);

export default voiceRouter;
