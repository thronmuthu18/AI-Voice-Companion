import { openai } from "../config/openai";
import { messageService } from "./message.service";
import { ProviderRouter } from "../providers/provider.router";
import OpenAI from "openai";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

// Ensure uploads directory exists
function ensureUploadsDir(): string {
  const dir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// Save a base64 string to disk and return the relative URL
function saveBase64Image(b64: string, prefix = ""): string {
  const buffer = Buffer.from(b64, "base64");
  const filename = `${prefix}${uuidv4()}.png`;
  const dir = ensureUploadsDir();
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/uploads/${filename}`;
}

// Resolve image buffer from either a local /uploads/ path or a base64 data URL
function resolveImageBuffer(imageDataOrPath: string): Buffer {
  if (imageDataOrPath.startsWith("/uploads/")) {
    const filename = imageDataOrPath.split("/").pop() || "";
    const filePath = path.join(process.cwd(), "uploads", filename);
    return fs.readFileSync(filePath);
  }
  // base64 data URL
  const commaIndex = imageDataOrPath.indexOf(",");
  const payload =
    commaIndex !== -1
      ? imageDataOrPath.substring(commaIndex + 1)
      : imageDataOrPath;
  return Buffer.from(payload, "base64");
}

export class AIService {
  async generateResponse(chatId: string): Promise<string> {
    const history = await messageService.getConversationHistory(chatId);
    const provider = ProviderRouter.getProviderForAction("chat");

    const chatHistory = [
      {
        role: "system" as const,
        content:
          "You are Champ.ai, a helpful AI assistant.\n\n" +
          "Strict Conversational Guidelines:\n" +
          "1. Tone & Identity:\n" +
          "   - Be helpful, conversational, natural, and concise.\n" +
          "   - DO NOT introduce yourself unnecessarily. Never say \"I am Champ.ai\" or \"I'm Champ.ai, a helpful AI assistant\" unless the user explicitly asks about your name or identity (e.g., \"Who are you?\", \"What is your name?\", \"Are you Champ.ai?\").\n" +
          "   - DO NOT use the phrase \"AI Voice Companion\" or \"Voice Companion\" unless the user specifically asks about voice features or the product description.\n" +
          "   - DO NOT repeatedly use product branding or feature lists. Keep responses focused on the user's query.\n" +
          "   - Do not mention being an AI unless it is directly relevant.\n\n" +
          "2. Greetings Response:\n" +
          "   - Respond naturally to casual greetings without robotic template intros.\n" +
          "   - \"Hello\" -> \"Hi! 👋 How can I help you today?\"\n" +
          "   - \"Hi\" -> \"Hey! 👋 What can I help you with?\"\n" +
          "   - \"Vanakkam\" -> \"வணக்கம்! 👋 உங்களுக்கு என்ன உதவி வேண்டும்?\"\n" +
          "   - \"ஹலோ\" or \"ஹலோ!\" -> \"ஹலோ! 👋 உங்களுக்கு என்ன உதவி வேண்டும்?\"\n" +
          "   - \"Bro\" or \"Hi bro\" -> \"சொல்லுங்க ப்ரோ 👋 என்ன உதவி வேண்டும்?\"\n\n" +
          "3. Language Matching:\n" +
          "   - Always detect the language of the latest message and match it naturally.\n" +
          "   - If the user writes in English, reply in English.\n" +
          "   - If the user writes in Tamil, reply in natural, conversational, non-textbook Tamil.\n" +
          "   - If the user writes in Tanglish (Tamil written in English script), reply in natural conversational Tanglish. Example: \"Enakku React error varuthu\" -> \"சரி ப்ரோ, error message அல்லது screenshot அனுப்புங்க. என்ன problemன்னு check பண்ணலாம்.\"\n" +
          "   - If the user mixes English and Tamil, respond with a similar natural mix. Do not force formal Tamil or English.\n\n" +
          "4. Style & Length:\n" +
          "   - Answer the user's actual question directly.\n" +
          "   - Avoid repeating the user's entire question.\n" +
          "   - Avoid starting every response with the same greeting or phrase.\n" +
          "   - Keep simple answers concise. Provide detailed explanations only when requested or needed.\n\n" +
          "5. Multimodal Capabilities:\n" +
          "   - You can fully analyze, describe, and discuss any uploaded image or document.\n" +
          "   - If an image is uploaded, analyze and describe it in detail when asked.\n" +
          "   - If a document is uploaded, summarize its contents accurately.",
      },
      ...history.map(h => ({
        role: h.role as "user" | "assistant" | "system",
        content: h.content
      }))
    ];

    const response = await provider.chat(chatHistory);
    return response || "Sorry, I couldn't generate a response.";
  }

  async optimizeGenerationPrompt(userPrompt: string): Promise<string> {
    try {
      const provider = ProviderRouter.getProviderForAction("chat");
      const chatHistory = [
        {
          role: "system" as const,
          content:
            "You are an expert AI Image Prompt Optimizer. Your task is to transform a raw user prompt " +
            "(which may be long, conversational, poorly structured, or in another language like Tamil) " +
            "into a highly descriptive, cohesive, and optimized English prompt for an image generation model like DALL-E.\n\n" +
            "Guidelines:\n" +
            "1. Core Intent: Preserve the user's primary subject, setting, and composition.\n" +
            "2. Translation: Translate non-English (e.g. Tamil or Hinglish/Tanglish) content into descriptive English.\n" +
            "3. Clarity & Quality: Remove conversational fillers, redundant phrases, and logical contradictions. Add concise styling descriptors (e.g., lighting, texture, artistic medium) if implied.\n" +
            "4. Constraints: Strictly adhere to the original request without introducing entirely new subjects or hallucinating requirements.\n" +
            "5. Format: Output ONLY the final optimized prompt text. Do not write explanations or preambles."
        },
        {
          role: "user" as const,
          content: userPrompt
        }
      ];

      const response = await provider.chat(chatHistory);
      return response.trim() || userPrompt;
    } catch (err) {
      console.warn("Prompt optimization failed, falling back to original prompt:", err);
      return userPrompt;
    }
  }

  async optimizeEditPrompt(userPrompt: string, base64Url?: string): Promise<string> {
    try {
      const provider = ProviderRouter.getProviderForAction("chat");
      const chatHistory = [
        {
          role: "system" as const,
          content:
            "You are an expert AI Image Edit Prompt Optimizer. You are given a user request and the original image as the absolute ground truth.\n\n" +
            "Your task is to analyze the original image and the request to write a highly precise, literal instruction set for an image editing model (gpt-image-2 / DALL-E Edit).\n\n" +
            "Strict Guidelines:\n" +
            "1. IDENTITY LOCK: Identify the main subject's features (e.g. face, hair style/color, skin tone, clothing, pose, accessories). Explicitly instruct the model to lock these: 'Do not change the face, hairstyle, skin tone, pose, expression, clothing, or accessories of [describe main subject, e.g. the man in the blue shirt].'\n" +
            "2. COMPOSITION LOCK: Enforce that background perspective, camera angle, lighting, resolution, image size, and untouched regions must remain exactly identical to the original.\n" +
            "3. PRECISION EDIT ONLY: Extract the EXACT modification requested. Describe exactly what is being modified, added, or removed, and specify that nothing else should be altered.\n" +
            "4. NO CREATIVE MODIFICATIONS: Do not add unsolicited improvements, lighting adjustments, color grading, stylized accessories, or clothing changes unless the user explicitly requested it.\n" +
            "5. FORMAT: Output ONLY the final structured instructions. Enforce weightings strictly in this format:\n" +
            "   [STRICT CONSTRAINTS (Highest Priority):\n" +
            "   - Identity lock: <Detailed visual descriptors of face, hair, clothing, pose in original image that MUST remain unchanged>\n" +
            "   - Composition lock: Preserve background perspective, resolution, lighting, and all untouched regions.\n" +
            "   ]\n" +
            "   [ACTION (Secondary Priority):\n" +
            "   - Modify: <The literal request, e.g., Replace the background with a white studio background>\n" +
            "   ]\n" +
            "   [QUALITY ENHANCEMENT (Third Priority):\n" +
            "   - Details: Photorealistic match, high fidelity, seamless boundary merging.\n" +
            "   ]\n" +
            "Do not write conversational text, preamble, or explanations. Return ONLY the formatted block."
        },
        {
          role: "user" as const,
          content: base64Url ? `Optimize the prompt for this user request: "${userPrompt}". Original image base64 provided: ${base64Url.substring(0, 100)}...` : userPrompt
        }
      ];

      const response = await provider.chat(chatHistory);
      return response.trim() || userPrompt;
    } catch (err) {
      console.warn("Edit prompt optimization failed, falling back to original prompt:", err);
      return userPrompt;
    }
  }

  async generateImage(prompt: string): Promise<string> {
    // Run the prompt through the Optimization Layer
    const optimized = await this.optimizeGenerationPrompt(prompt);
    console.log(`Original Generation Prompt: "${prompt}" -> Optimized: "${optimized}"`);

    // This account uses gpt-image-2 (best available image model)
    const response = await openai.images.generate({
      model: "gpt-image-2",
      prompt: optimized,
      n: 1,
      size: "1024x1024",
    } as any);

    const b64 = (response.data?.[0] as any)?.b64_json as string | undefined;
    if (!b64) {
      throw new Error(
        "No image data returned from OpenAI gpt-image-2. Response: " +
          JSON.stringify(response.data?.[0])
      );
    }

    return saveBase64Image(b64, "gen_");
  }

  async editImage(imageDataOrPath: string, prompt: string): Promise<string> {
    const buffer = resolveImageBuffer(imageDataOrPath);

    // Must pass explicit MIME type — gpt-image-2 edit requires image/png, image/jpeg, or image/webp
    const imageFile = await OpenAI.toFile(buffer, "image.png", {
      type: "image/png",
    });

    // Build base64 representation for multimodal prompt optimizer to view the original image
    let base64Url = "";
    if (imageDataOrPath.startsWith("data:image/")) {
      base64Url = imageDataOrPath;
    } else {
      // Determine correct mime type
      const ext = imageDataOrPath.split(".").pop()?.toLowerCase();
      const mimeType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
      base64Url = `data:${mimeType};base64,${buffer.toString("base64")}`;
    }

    // Run the edit instruction through the Vision-guided Optimization Layer
    const optimizedInstruction = await this.optimizeEditPrompt(prompt, base64Url);
    console.log(`Original Edit Prompt: "${prompt}" -> Vision-Guided Optimized:\n"${optimizedInstruction}"`);

    // Enforce identity preservation constraints in the edit prompt
    const preservationDirectives = 
      "Strict Constraint: Preserve the original person's identity, face, features, hairstyle, expression, skin tone, age, gender, pose, and all untouched regions exactly as they are in the original image. Do not crop or alter untouched regions. Modify ONLY the requested area. Action: ";
    const finalPrompt = `${preservationDirectives}${optimizedInstruction}`;

    const response = await (openai.images as any).edit({
      model: "gpt-image-2",
      image: imageFile,
      prompt: finalPrompt,
      n: 1,
    });

    const b64 = response.data?.[0]?.b64_json as string | undefined;
    if (!b64) {
      throw new Error(
        "No image data returned from OpenAI image edit. Response: " +
          JSON.stringify(response.data?.[0])
      );
    }

    return saveBase64Image(b64, "edit_");
  }
}

export const aiService = new AIService();