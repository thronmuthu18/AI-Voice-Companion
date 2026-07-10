import { ChatMessage, HealthCheckResult } from "./provider.types";

export interface IAIProvider {
  name: string;

  chat(chatHistory: ChatMessage[]): Promise<string>;

  streamChat(chatHistory: ChatMessage[]): Promise<AsyncGenerator<string, void, unknown>> | AsyncGenerator<string, void, unknown>;
  
  generateImage(prompt: string): Promise<{ url: string }>;
  
  editImage(imageBuffer: Buffer, prompt: string): Promise<{ url: string }>;
  
  analyzeImage(imageBuffer: Buffer, prompt: string): Promise<string>;
  
  analyzePDF(pdfBuffer: Buffer, prompt: string): Promise<string>;
  
  analyzeFile(fileBuffer: Buffer, prompt: string): Promise<string>;
  
  analyzeVideo(videoBuffer: Buffer, prompt: string): Promise<string>;
  
  analyzeAudio(audioBuffer: Buffer, prompt: string): Promise<string>;
  
  generateCode(prompt: string): Promise<string>;
  
  generateReport(prompt: string): Promise<string>;
  
  healthCheck(): Promise<HealthCheckResult>;
}
