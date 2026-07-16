import { Tool, ToolContext } from "./tool.interface";
import { aiService } from "../ai.service";

// Chat Tool
export class ChatTool implements Tool {
  name = "Chat Tool";
  description = "Handles general conversational inputs, chit-chat, and natural language communication.";
  capabilities = ["text_chat", "general_conversations"];
  inputSchema = { type: "string" };
  outputSchema = { type: "string" };
  priority = 10;
  availability = true;
  requiredFiles = [];
  streamingSupport = true;
  async execute(_input: string, context: ToolContext): Promise<any> {
    return await aiService.generateResponse(context.chatId);
  }
}

// Image Generation Tool
export class ImageGenerationTool implements Tool {
  name = "Image Generation Tool";
  description = "Generates new images from scratch based on user prompts.";
  capabilities = ["image_generation", "dall-e", "gpt-image-2"];
  inputSchema = { type: "string" };
  outputSchema = { type: "string", description: "Relative URL of the generated image" };
  priority = 1;
  availability = true;
  requiredFiles = [];
  streamingSupport = false;
  async execute(input: string, _context: ToolContext): Promise<any> {
    return await aiService.generateImage(input);
  }
}

// Image Editing Tool
export class ImageEditingTool implements Tool {
  name = "Image Editing Tool";
  description = "Edits or alters existing images in the chat history based on instructions.";
  capabilities = ["image_editing", "image_modification"];
  inputSchema = { type: "string" };
  outputSchema = { type: "string", description: "Relative URL of the edited image" };
  priority = 2;
  availability = true;
  requiredFiles = ["image"];
  streamingSupport = false;
  async execute(input: string, context: ToolContext): Promise<any> {
    if (!context.latestImage) {
      throw new Error("No image context found for editing");
    }
    return await aiService.editImage(context.latestImage.url, input);
  }
}

// Vision Analysis Tool
export class VisionAnalysisTool implements Tool {
  name = "Vision Analysis Tool";
  description = "Analyzes, describes, or answers questions about the contents of an uploaded image.";
  capabilities = ["vision", "image_description", "image_analysis"];
  inputSchema = { type: "string" };
  outputSchema = { type: "string" };
  priority = 3;
  availability = true;
  requiredFiles = ["image"];
  streamingSupport = true;
  async execute(_input: string, context: ToolContext): Promise<any> {
    return await aiService.generateResponse(context.chatId);
  }
}

// Document Analysis Tool
export class DocumentAnalysisTool implements Tool {
  name = "Document Analysis Tool";
  description = "Reads, parses, and answers questions about PDF, DOCX, TXT, or CSV files.";
  capabilities = ["document_reading", "document_summarization", "document_analysis"];
  inputSchema = { type: "string" };
  outputSchema = { type: "string" };
  priority = 4;
  availability = true;
  requiredFiles = ["document"];
  streamingSupport = true;
  async execute(_input: string, context: ToolContext): Promise<any> {
    return await aiService.generateResponse(context.chatId);
  }
}

// OCR Tool
export class OCRTool implements Tool {
  name = "OCR Tool";
  description = "Extracts printed or handwritten text from uploaded images.";
  capabilities = ["ocr", "text_extraction"];
  inputSchema = { type: "string" };
  outputSchema = { type: "string" };
  priority = 5;
  availability = true;
  requiredFiles = ["image"];
  streamingSupport = false;
  async execute(_input: string, context: ToolContext): Promise<any> {
    return await aiService.generateResponse(context.chatId);
  }
}

// Translation Tool
export class TranslationTool implements Tool {
  name = "Translation Tool";
  description = "Translates text or documents between different languages (e.g. English, Tamil).";
  capabilities = ["translation", "language_translation"];
  inputSchema = { type: "string" };
  outputSchema = { type: "string" };
  priority = 6;
  availability = true;
  requiredFiles = [];
  streamingSupport = true;
  async execute(_input: string, context: ToolContext): Promise<any> {
    return await aiService.generateResponse(context.chatId);
  }
}

// Summarization Tool
export class SummarizationTool implements Tool {
  name = "Summarization Tool";
  description = "Summarizes long text passages, web links, or documents.";
  capabilities = ["summarization", "text_summarization"];
  inputSchema = { type: "string" };
  outputSchema = { type: "string" };
  priority = 7;
  availability = true;
  requiredFiles = [];
  streamingSupport = true;
  async execute(_input: string, context: ToolContext): Promise<any> {
    return await aiService.generateResponse(context.chatId);
  }
}

// Voice Tool
export class VoiceTool implements Tool {
  name = "Voice Tool";
  description = "Processes specific voice interface commands or speech settings.";
  capabilities = ["voice_processing", "audio_commands", "voice_request"];
  inputSchema = { type: "string" };
  outputSchema = { type: "string" };
  priority = 8;
  availability = true;
  requiredFiles = [];
  streamingSupport = true;
  async execute(_input: string, context: ToolContext): Promise<any> {
    return await aiService.generateResponse(context.chatId);
  }
}

// Reasoning Tool
export class ReasoningTool implements Tool {
  name = "Reasoning Tool";
  description = "Solves complex logical queries, algebraic calculations, and puzzles.";
  capabilities = ["reasoning", "complex_logic", "reasoning_request"];
  inputSchema = { type: "string" };
  outputSchema = { type: "string" };
  priority = 9;
  availability = true;
  requiredFiles = [];
  streamingSupport = true;
  async execute(_input: string, context: ToolContext): Promise<any> {
    return await aiService.generateResponse(context.chatId);
  }
}

// Code Generation Tool
export class CodeGenerationTool implements Tool {
  name = "Code Generation Tool";
  description = "Generates software code, web pages, or scripts based on requirements.";
  capabilities = ["code_generation"];
  inputSchema = { type: "string" };
  outputSchema = { type: "string" };
  priority = 11;
  availability = true;
  requiredFiles = [];
  streamingSupport = true;
  async execute(_input: string, context: ToolContext): Promise<any> {
    return await aiService.generateResponse(context.chatId);
  }
}

// Code Debugging Tool
export class CodeDebuggingTool implements Tool {
  name = "Code Debugging Tool";
  description = "Finds and repairs errors in user-provided source code.";
  capabilities = ["code_debugging", "error_fixing"];
  inputSchema = { type: "string" };
  outputSchema = { type: "string" };
  priority = 12;
  availability = true;
  requiredFiles = [];
  streamingSupport = true;
  async execute(_input: string, context: ToolContext): Promise<any> {
    return await aiService.generateResponse(context.chatId);
  }
}

// Mathematics Tool
export class MathematicsTool implements Tool {
  name = "Mathematics Tool";
  description = "Solves equations, performs math analysis, and evaluates numbers.";
  capabilities = ["math", "calculation", "mathematics"];
  inputSchema = { type: "string" };
  outputSchema = { type: "string" };
  priority = 13;
  availability = true;
  requiredFiles = [];
  streamingSupport = true;
  async execute(_input: string, context: ToolContext): Promise<any> {
    return await aiService.generateResponse(context.chatId);
  }
}

// Document Generation Tool
export class DocumentGenerationTool implements Tool {
  name = "Document Generation Tool";
  description = "Generates formatted reports, letters, and text documents.";
  capabilities = ["document_generation"];
  inputSchema = { type: "string" };
  outputSchema = { type: "string" };
  priority = 14;
  availability = true;
  requiredFiles = [];
  streamingSupport = false;
  async execute(_input: string, context: ToolContext): Promise<any> {
    return await aiService.generateResponse(context.chatId);
  }
}

// Excel Generation Tool
export class ExcelGenerationTool implements Tool {
  name = "Excel Generation Tool";
  description = "Generates spreadsheet tables, budgets, and tabular data.";
  capabilities = ["excel_generation"];
  inputSchema = { type: "string" };
  outputSchema = { type: "string" };
  priority = 15;
  availability = true;
  requiredFiles = [];
  streamingSupport = false;
  async execute(_input: string, context: ToolContext): Promise<any> {
    return await aiService.generateResponse(context.chatId);
  }
}

// Code Assistant Tool
export class CodeAssistantTool implements Tool {
  name = "Code Assistant Tool";
  description = "Assists in conceptual software engineering questions.";
  capabilities = ["programming", "code_assistant"];
  inputSchema = { type: "string" };
  outputSchema = { type: "string" };
  priority = 16;
  availability = true;
  requiredFiles = [];
  streamingSupport = true;
  async execute(_input: string, context: ToolContext): Promise<any> {
    return await aiService.generateResponse(context.chatId);
  }
}

// Web Search Tool
export class WebSearchTool implements Tool {
  name = "Web Search Tool";
  description = "Search the live web for real-time information.";
  capabilities = ["web_search", "search_request"];
  inputSchema = { type: "string" };
  outputSchema = { type: "string" };
  priority = 17;
  availability = false;
  requiredFiles = [];
  streamingSupport = false;
  async execute(): Promise<any> {
    throw new Error("Web Search Tool is currently in development (architecture only).");
  }
}

// Future Video Generation Tool
export class FutureVideoGenerationTool implements Tool {
  name = "Future Video Generation Tool";
  description = "Generates videos from scratch based on user prompts.";
  capabilities = ["video_generation", "video_request"];
  inputSchema = { type: "string" };
  outputSchema = { type: "string" };
  priority = 18;
  availability = false;
  requiredFiles = [];
  streamingSupport = false;
  async execute(): Promise<any> {
    throw new Error("Video Generation Tool is currently in development (architecture only).");
  }
}

// Future Tasks Tool
export class FutureTasksTool implements Tool {
  name = "Future Tasks Tool";
  description = "Manages lists of to-do items and automated tasks.";
  capabilities = ["tasks", "future_tasks"];
  inputSchema = { type: "string" };
  outputSchema = { type: "string" };
  priority = 19;
  availability = false;
  requiredFiles = [];
  streamingSupport = false;
  async execute(): Promise<any> {
    throw new Error("Tasks Tool is currently in development (architecture only).");
  }
}

// Future Memory Tool
export class FutureMemoryTool implements Tool {
  name = "Future Memory Tool";
  description = "Manages long-term conversation memories and facts.";
  capabilities = ["memory", "future_memory"];
  inputSchema = { type: "string" };
  outputSchema = { type: "string" };
  priority = 20;
  availability = false;
  requiredFiles = [];
  streamingSupport = false;
  async execute(): Promise<any> {
    throw new Error("Memory Tool is currently in development (architecture only).");
  }
}

// Centralized Tool Registry Instance
export class ToolRegistry {
  private registry = new Map<string, Tool>();

  constructor() {
    this.register(new ChatTool());
    this.register(new ImageGenerationTool());
    this.register(new ImageEditingTool());
    this.register(new VisionAnalysisTool());
    this.register(new DocumentAnalysisTool());
    this.register(new OCRTool());
    this.register(new TranslationTool());
    this.register(new SummarizationTool());
    this.register(new VoiceTool());
    this.register(new ReasoningTool());
    this.register(new CodeGenerationTool());
    this.register(new CodeDebuggingTool());
    this.register(new MathematicsTool());
    this.register(new DocumentGenerationTool());
    this.register(new ExcelGenerationTool());
    this.register(new CodeAssistantTool());
    this.register(new WebSearchTool());
    this.register(new FutureVideoGenerationTool());
    this.register(new FutureTasksTool());
    this.register(new FutureMemoryTool());
  }

  register(tool: Tool) {
    this.registry.set(tool.name, tool);
  }

  getTool(name: string): Tool | undefined {
    return this.registry.get(name);
  }

  getToolsByCapability(capability: string): Tool[] {
    return Array.from(this.registry.values()).filter((t) =>
      t.capabilities.includes(capability)
    );
  }

  getAllTools(): Tool[] {
    return Array.from(this.registry.values());
  }
}

export const toolRegistry = new ToolRegistry();
