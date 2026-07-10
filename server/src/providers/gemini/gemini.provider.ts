import { IAIProvider } from "../provider.interface";
import { ChatMessage, HealthCheckResult } from "../provider.types";
import { providerConfig } from "../provider.config";
import https from "https";

// Custom error representation
export class GeminiProviderError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = "GeminiProviderError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

// Sanitization to prevent API key exposure in call stacks or exception messages
function sanitizeError(err: Error): Error {
  if (err.message) {
    err.message = err.message.replace(/key=[A-Za-z0-9_-]+/g, "key=REDACTED");
  }
  if (err.stack) {
    err.stack = err.stack.replace(/key=[A-Za-z0-9_-]+/g, "key=REDACTED");
  }
  return err;
}

// Map Google API status codes to standard internal exception structures
function parseGeminiError(err: any): Error {
  const errMsg = err.message || "";
  
  const match = errMsg.match(/failed with status (\d+)/i);
  if (match) {
    const statusCode = parseInt(match[1], 10);
    const bodyStr = errMsg.substring(errMsg.indexOf(":") + 1).trim();
    
    let googleMessage = "";
    try {
      const parsed = JSON.parse(bodyStr);
      googleMessage = parsed.error?.message || "";
      
      if (statusCode === 429) {
        GeminiProvider.isQuotaExhausted = true; // Dynamically track quota depletion
        if (googleMessage.toLowerCase().includes("limit") && (googleMessage.includes("0") || googleMessage.includes("zero"))) {
          return sanitizeError(new GeminiProviderError(
            "Gemini free-tier quota is explicitly 0 for this API key. Please upgrade or switch models.",
            "GEMINI_QUOTA_UNAVAILABLE",
            429
          ));
        }
        return sanitizeError(new GeminiProviderError(
          googleMessage || "Gemini rate limit or quota exceeded.",
          "RATE_LIMIT_OR_QUOTA_EXHAUSTED",
          429
        ));
      }
      if (statusCode === 400) {
        return sanitizeError(new GeminiProviderError(googleMessage || "Bad Request.", "BAD_REQUEST", 400));
      }
      if (statusCode === 401) {
        return sanitizeError(new GeminiProviderError(googleMessage || "Authentication failed.", "AUTHENTICATION_FAILED", 401));
      }
      if (statusCode === 403) {
        return sanitizeError(new GeminiProviderError(googleMessage || "Permission denied.", "PERMISSION_DENIED", 403));
      }
      if (statusCode === 404) {
        return sanitizeError(new GeminiProviderError(googleMessage || "Model not found.", "MODEL_NOT_FOUND", 404));
      }
      if (statusCode >= 500) {
        return sanitizeError(new GeminiProviderError(googleMessage || "Gemini service temporarily unavailable.", "PROVIDER_TEMPORARILY_UNAVAILABLE", statusCode));
      }
    } catch {
      // Body not standard JSON, use fallback matchers
    }
  }

  // Network/DNS routing failures
  if (err.code === "ENOTFOUND" || err.code === "EAI_AGAIN" || err.message?.includes("getaddrinfo")) {
    return sanitizeError(new GeminiProviderError("Network connection failure to Google Gemini API.", "NETWORK_ERROR", 503));
  }

  return sanitizeError(err);
}

// Low-level HTTP payload transmitter using Node's native https module
function makePostRequest(url: string, payload: any, method: "POST" | "GET" = "POST"): Promise<string> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const bodyStr = payload ? JSON.stringify(payload) : "";

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}),
      },
      timeout: 15000, // 15-second timeout safeguard
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`Google API request failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Google API request timed out"));
    });

    req.on("error", (err) => reject(err));
    if (payload) {
      req.write(bodyStr);
    }
    req.end();
  });
}

// Automatic retry controller respecting RetryInfo metadata
async function makePostRequestWithRetry(url: string, payload: any, method: "POST" | "GET" = "POST", retriesRemaining = 2): Promise<string> {
  try {
    return await makePostRequest(url, payload, method);
  } catch (err: any) {
    const isRateLimit = err.message?.includes("status 429");
    const isServerErr = err.message?.includes("status 503") || err.message?.includes("status 502") || err.message?.includes("status 500");
    
    if ((isRateLimit || isServerErr) && retriesRemaining > 0) {
      // Do not retry if free tier has zero quota allocated
      const bodyStr = err.message.substring(err.message.indexOf(":") + 1).trim();
      if (bodyStr.toLowerCase().includes("limit") && (bodyStr.includes("0") || bodyStr.includes("zero"))) {
        throw err;
      }

      let retryDelayMs = 2000; // standard fallback backoff delay
      try {
        const parsed = JSON.parse(bodyStr);
        const details = parsed.error?.details || [];
        const retryInfo = details.find((d: any) => d.retryDelay);
        if (retryInfo && retryInfo.retryDelay) {
          const sec = parseFloat(retryInfo.retryDelay);
          if (!isNaN(sec)) {
            retryDelayMs = sec * 1000;
          }
        }
      } catch {
        // fallback to standard delay
      }

      console.warn(`[Gemini Request] Status code triggers retry. Retrying in ${retryDelayMs}ms. Retries remaining: ${retriesRemaining - 1}`);
      await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      return makePostRequestWithRetry(url, payload, method, retriesRemaining - 1);
    }
    throw err;
  }
}

export class GeminiProvider implements IAIProvider {
  readonly name = "gemini";
  static isQuotaExhausted = false;
  private static availableModels: string[] = [];
  private static hasDiscovered = false;

  constructor() {
    console.log("==================================================");
    console.log("   Gemini Provider REST API Integration          ");
    console.log("   - Model: " + (providerConfig.gemini.models.chat || "gemini-flash-lite-latest"));
    console.log("   - Connection: Native HTTPS REST Direct");
    console.log("   - Streaming: Active");
    console.log("==================================================");
  }

  // Model discovery check against Google's ListModels REST endpoint
  private static async discoverModels(apiKey: string): Promise<string[]> {
    if (this.hasDiscovered) {
      return this.availableModels;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const responseText = await makePostRequest(url, null, "GET");
      const parsed = JSON.parse(responseText);
      
      if (parsed.models && Array.isArray(parsed.models)) {
        this.availableModels = parsed.models
          .filter((m: any) => 
            m.supportedGenerationMethods?.includes("generateContent")
          )
          .map((m: any) => m.name.replace(/^models\//, ""));
        this.hasDiscovered = true;
        console.log(`[Gemini Discovery] Found ${this.availableModels.length} compatible models:`, this.availableModels);
      }
    } catch (err: any) {
      console.warn(`[Gemini Discovery] Warning: Model discovery query failed: ${err.message}. Using default list fallback.`);
      this.availableModels = [
        "gemini-flash-lite-latest",
        "gemini-3.1-flash-lite",
        "gemini-3.1-flash-lite-preview",
        "gemini-2.5-flash",
        "gemini-2.0-flash"
      ];
    }
    return this.availableModels;
  }

  // Resolve selection based on priority guidelines
  private async selectModel(role: "chat" | "fast"): Promise<string> {
    const apiKey = providerConfig.gemini.apiKey;
    const discovered = await GeminiProvider.discoverModels(apiKey);

    const envModel = role === "chat" ? providerConfig.gemini.models.chat : providerConfig.gemini.models.fast;
    
    // Priority 1: Check if configured env model is in the discovered list
    if (envModel && discovered.includes(envModel)) {
      return envModel;
    }

    // Priority 2: Look for flash models in the discovered list
    const flashModel = discovered.find(m => m.includes("flash") && !m.includes("tts") && !m.includes("image"));
    if (flashModel) {
      return flashModel;
    }

    // Priority 3: First discovered model
    if (discovered.length > 0) {
      return discovered[0];
    }

    return "gemini-flash-lite-latest";
  }

  // Maps custom system instruction and contents schemas for Gemini
  private mapChatHistory(chatHistory: ChatMessage[]) {
    const systemMessage = chatHistory.find(m => m.role === "system");
    const systemInstruction = systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined;
    const historyWithoutSystem = chatHistory.filter(m => m.role !== "system");

    const contents = historyWithoutSystem.map(m => {
      const role = m.role === "assistant" ? "model" : m.role;
      
      // Handle multimodal array contents
      if (Array.isArray(m.content)) {
        const parts = m.content.map((block: any) => {
          if (block.type === "text") {
            let val = block.text || "";
            if (typeof val === "string" && val.trim() === "") val = " ";
            return { text: val };
          }
          if (block.type === "image_url") {
            const url = block.image_url?.url || "";
            if (url.startsWith("data:")) {
              const matches = url.match(/^data:([^;]+);base64,(.+)$/);
              if (matches) {
                return {
                  inlineData: {
                    mimeType: matches[1],
                    data: matches[2]
                  }
                };
              }
            }
          }
          return null;
        }).filter(Boolean);

        return { role, parts };
      }

      // Default string text mapping
      let text = m.content || "";
      if (typeof text === "string" && text.trim() === "") {
        text = " "; // prevent 400 Content.parts must not be empty errors
      }

      return {
        role,
        parts: [{ text }]
      };
    });

    return { contents, systemInstruction };
  }

  async chat(chatHistory: ChatMessage[]): Promise<string> {
    const apiKey = providerConfig.gemini.apiKey;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing or empty");
    }

    const { contents, systemInstruction } = this.mapChatHistory(chatHistory);
    if (contents.length === 0) {
      return "";
    }

    const modelName = await this.selectModel("chat");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const payload = {
      contents,
      systemInstruction,
    };

    try {
      const responseText = await makePostRequestWithRetry(url, payload);
      const parsed = JSON.parse(responseText);
      const parts = parsed.candidates?.[0]?.content?.parts || [];
      return parts.map((p: any) => p.text || "").join("");
    } catch (err: any) {
      throw parseGeminiError(err);
    }
  }

  async *streamChat(chatHistory: ChatMessage[]): AsyncGenerator<string, void, unknown> {
    const apiKey = providerConfig.gemini.apiKey;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing or empty");
    }

    const { contents, systemInstruction } = this.mapChatHistory(chatHistory);
    if (contents.length === 0) {
      return;
    }

    const modelName = await this.selectModel("chat");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${apiKey}`;
    const payload = {
      contents,
      systemInstruction,
    };

    const urlObj = new URL(url);
    const bodyStr = JSON.stringify(payload);

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyStr),
      },
      timeout: 15000,
    };

    const tokenQueue: string[] = [];
    let resolveNext: ((value: any) => void) | null = null;
    let streamDone = false;
    let streamError: Error | null = null;

    const req = https.request(options, (res) => {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        let errorData = "";
        res.on("data", chunk => errorData += chunk);
        res.on("end", () => {
          const rawErr = new Error(`Google API request failed with status ${res.statusCode}: ${errorData}`);
          streamError = parseGeminiError(rawErr);
          if (resolveNext) {
            resolveNext(null);
            resolveNext = null;
          }
        });
        return;
      }

      let buffer = "";

      res.on("data", (chunk) => {
        buffer += chunk.toString("utf8");

        let braceCount = 0;
        let startIdx = -1;
        let inString = false;
        let escaped = false;

        for (let i = 0; i < buffer.length; i++) {
          const char = buffer[i];

          if (escaped) {
            escaped = false;
            continue;
          }

          if (char === "\\") {
            escaped = true;
            continue;
          }

          if (char === '"') {
            inString = !inString;
            continue;
          }

          if (!inString) {
            if (char === "{") {
              if (braceCount === 0) {
                startIdx = i;
              }
              braceCount++;
            } else if (char === "}") {
              braceCount--;
              if (braceCount === 0 && startIdx !== -1) {
                const objStr = buffer.substring(startIdx, i + 1);
                try {
                  const parsedObj = JSON.parse(objStr);
                  const text = parsedObj.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) {
                    tokenQueue.push(text);
                    if (resolveNext) {
                      resolveNext(null);
                      resolveNext = null;
                    }
                  }
                } catch (e) {
                  // Ignore parsing errors for partial text chunks
                }
                
                buffer = buffer.substring(i + 1);
                i = -1;
                startIdx = -1;
                braceCount = 0;
                inString = false;
                escaped = false;
              }
            }
          }
        }
      });

      res.on("end", () => {
        streamDone = true;
        if (resolveNext) {
          resolveNext(null);
          resolveNext = null;
        }
      });
    });

    req.on("timeout", () => {
      req.destroy();
      streamError = sanitizeError(new GeminiProviderError("Google API request timed out", "TIMEOUT", 408));
      if (resolveNext) {
        resolveNext(null);
        resolveNext = null;
      }
    });

    req.on("error", (err) => {
      streamError = parseGeminiError(err);
      if (resolveNext) {
        resolveNext(null);
        resolveNext = null;
      }
    });

    req.write(bodyStr);
    req.end();

    while (true) {
      if (tokenQueue.length > 0) {
        yield tokenQueue.shift()!;
      } else if (streamError) {
        throw streamError;
      } else if (streamDone) {
        break;
      } else {
        await new Promise((resolve) => {
          resolveNext = resolve;
        });
      }
    }
  }

  // Creative media assignments correctly redirect to OpenAI-specific errors
  async generateImage(_prompt: string): Promise<{ url: string }> {
    throw new Error("Creative image generation is routed exclusively through OpenAI Provider.");
  }

  async editImage(_imageBuffer: Buffer, _prompt: string): Promise<{ url: string }> {
    throw new Error("Creative image editing is routed exclusively through OpenAI Provider.");
  }

  // File and context processing operations implemented properly via real REST Direct
  async analyzeImage(imageBuffer: Buffer, prompt: string): Promise<string> {
    const apiKey = providerConfig.gemini.apiKey;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing or empty");

    const modelName = await this.selectModel("fast");
    const payload = {
      contents: [{
        role: "user",
        parts: [
          { text: prompt || "Analyze this image" },
          { inlineData: { mimeType: "image/png", data: imageBuffer.toString("base64") } }
        ]
      }]
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    try {
      const responseText = await makePostRequestWithRetry(url, payload);
      const parsed = JSON.parse(responseText);
      const parts = parsed.candidates?.[0]?.content?.parts || [];
      return parts.map((p: any) => p.text || "").join("");
    } catch (err: any) {
      throw parseGeminiError(err);
    }
  }

  async analyzePDF(pdfBuffer: Buffer, prompt: string): Promise<string> {
    const apiKey = providerConfig.gemini.apiKey;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing or empty");

    const modelName = await this.selectModel("fast");
    const payload = {
      contents: [{
        role: "user",
        parts: [
          { text: prompt || "Analyze this PDF document" },
          { inlineData: { mimeType: "application/pdf", data: pdfBuffer.toString("base64") } }
        ]
      }]
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    try {
      const responseText = await makePostRequestWithRetry(url, payload);
      const parsed = JSON.parse(responseText);
      const parts = parsed.candidates?.[0]?.content?.parts || [];
      return parts.map((p: any) => p.text || "").join("");
    } catch (err: any) {
      throw parseGeminiError(err);
    }
  }

  async analyzeFile(fileBuffer: Buffer, prompt: string): Promise<string> {
    const apiKey = providerConfig.gemini.apiKey;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing or empty");

    const modelName = await this.selectModel("fast");
    const payload = {
      contents: [{
        role: "user",
        parts: [
          { text: prompt || "Analyze this file" },
          { inlineData: { mimeType: "application/octet-stream", data: fileBuffer.toString("base64") } }
        ]
      }]
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    try {
      const responseText = await makePostRequestWithRetry(url, payload);
      const parsed = JSON.parse(responseText);
      const parts = parsed.candidates?.[0]?.content?.parts || [];
      return parts.map((p: any) => p.text || "").join("");
    } catch (err: any) {
      throw parseGeminiError(err);
    }
  }

  async analyzeVideo(videoBuffer: Buffer, prompt: string): Promise<string> {
    const apiKey = providerConfig.gemini.apiKey;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing or empty");

    const modelName = await this.selectModel("fast");
    const payload = {
      contents: [{
        role: "user",
        parts: [
          { text: prompt || "Analyze this video" },
          { inlineData: { mimeType: "video/mp4", data: videoBuffer.toString("base64") } }
        ]
      }]
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    try {
      const responseText = await makePostRequestWithRetry(url, payload);
      const parsed = JSON.parse(responseText);
      const parts = parsed.candidates?.[0]?.content?.parts || [];
      return parts.map((p: any) => p.text || "").join("");
    } catch (err: any) {
      throw parseGeminiError(err);
    }
  }

  async analyzeAudio(audioBuffer: Buffer, prompt: string): Promise<string> {
    const apiKey = providerConfig.gemini.apiKey;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing or empty");

    const modelName = await this.selectModel("fast");
    const payload = {
      contents: [{
        role: "user",
        parts: [
          { text: prompt || "Analyze this audio" },
          { inlineData: { mimeType: "audio/mp3", data: audioBuffer.toString("base64") } }
        ]
      }]
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    try {
      const responseText = await makePostRequestWithRetry(url, payload);
      const parsed = JSON.parse(responseText);
      const parts = parsed.candidates?.[0]?.content?.parts || [];
      return parts.map((p: any) => p.text || "").join("");
    } catch (err: any) {
      throw parseGeminiError(err);
    }
  }

  async generateCode(prompt: string): Promise<string> {
    const chatHistory: ChatMessage[] = [
      { role: "system", content: "You are an expert software developer. Return ONLY clean, functional programming code blocks without preamble." },
      { role: "user", content: prompt }
    ];
    return this.chat(chatHistory);
  }

  async generateReport(prompt: string): Promise<string> {
    const chatHistory: ChatMessage[] = [
      { role: "system", content: "You are an expert research analyst. Return a detailed, structured business report summarizing all topics." },
      { role: "user", content: prompt }
    ];
    return this.chat(chatHistory);
  }

  // Non-quota consuming health checks mapping to ListModels metadata
  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    const details = {
      apiKey: "Configured",
      apiReachable: "No",
      selectedModel: "None",
      modelAvailable: "No",
      generationQuota: GeminiProvider.isQuotaExhausted ? "Unavailable" : "Unknown"
    };

    try {
      const apiKey = providerConfig.gemini.apiKey;
      if (!apiKey) {
        return {
          status: "Unhealthy",
          latency: 0,
          error: "Gemini API Key is missing or empty"
        };
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const responseText = await makePostRequest(url, null, "GET");
      details.apiReachable = "Yes";

      const parsed = JSON.parse(responseText);
      const discoveredModels: string[] = [];
      if (parsed.models && Array.isArray(parsed.models)) {
        parsed.models.forEach((m: any) => {
          discoveredModels.push(m.name.replace(/^models\//, ""));
        });
      }

      const modelName = await this.selectModel("chat");
      details.selectedModel = modelName;

      if (discoveredModels.includes(modelName)) {
        details.modelAvailable = "Yes";
      }

      const latency = Date.now() - start;
      const quotaStatus = GeminiProvider.isQuotaExhausted ? "Unavailable" : "Available";

      return {
        status: "Healthy",
        latency,
        details: {
          apiKey: "Configured",
          apiReachable: "Yes",
          selectedModel: modelName,
          modelAvailable: details.modelAvailable,
          generationQuota: quotaStatus
        } as any
      };
    } catch (err: any) {
      const latency = Date.now() - start;
      const parsedErr = parseGeminiError(err) as any;
      const errorMsg = parsedErr.message || "Failed health check";
      
      let reachable = "No";
      let authStatus = "Configured";

      if (parsedErr.code === "AUTHENTICATION_FAILED") {
        authStatus = "Authentication Failed";
      }
      if (parsedErr.code === "NETWORK_ERROR") {
        reachable = "No";
      } else {
        reachable = "Yes";
      }

      return {
        status: "Unhealthy",
        latency,
        error: errorMsg,
        details: {
          apiKey: authStatus,
          apiReachable: reachable,
          selectedModel: "Unknown",
          modelAvailable: "No",
          generationQuota: "Unknown"
        } as any
      };
    }
  }
}

export const geminiProvider = new GeminiProvider();
