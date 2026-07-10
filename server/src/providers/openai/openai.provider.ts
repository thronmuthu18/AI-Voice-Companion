import { openai } from "../../config/openai";
import { IAIProvider } from "../provider.interface";
import { ChatMessage, HealthCheckResult } from "../provider.types";

export class OpenAIProvider implements IAIProvider {
  readonly name = "openai";

  async chat(chatHistory: ChatMessage[]): Promise<string> {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatHistory,
    });
    return response.choices[0]?.message?.content || "";
  }

  async *streamChat(chatHistory: ChatMessage[]): AsyncGenerator<string, void, unknown> {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: chatHistory,
      stream: true,
    });
    for await (const chunk of stream) {
      yield chunk.choices[0]?.delta?.content || "";
    }
  }

  async generateImage(_prompt: string): Promise<{ url: string }> {
    throw new Error("Method not implemented.");
  }

  async editImage(_imageBuffer: Buffer, _prompt: string): Promise<{ url: string }> {
    throw new Error("Method not implemented.");
  }

  async analyzeImage(_imageBuffer: Buffer, _prompt: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async analyzePDF(_pdfBuffer: Buffer, _prompt: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async analyzeFile(_fileBuffer: Buffer, _prompt: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async analyzeVideo(_videoBuffer: Buffer, _prompt: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async analyzeAudio(_audioBuffer: Buffer, _prompt: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async generateCode(_prompt: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async generateReport(_prompt: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      if (!openai.apiKey) {
        return {
          status: "Unhealthy",
          latency: 0,
          error: "OpenAI API Key is missing or empty"
        };
      }

      // Connection Validation via model list API (minimal token usage/cost)
      await openai.models.list();
      
      const latency = Date.now() - start;
      console.log(`[OpenAI Health Check] Status: Healthy, Latency: ${latency}ms`);
      return {
        status: "Healthy",
        latency
      };
    } catch (err: any) {
      const latency = Date.now() - start;
      console.error(`[OpenAI Health Check] Status: Unhealthy, Latency: ${latency}ms, Error:`, err.message);
      return {
        status: "Unhealthy",
        latency,
        error: err.message || "Failed connection validation check"
      };
    }
  }
}

export const openaiProvider = new OpenAIProvider();
