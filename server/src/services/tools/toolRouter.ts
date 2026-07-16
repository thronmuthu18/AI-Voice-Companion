import { toolRegistry } from "./tool.registry";
import { toolEngine } from "./tool.engine";
import { Tool, ToolContext } from "./tool.interface";
import { intelligenceService } from "../intelligence.service";

export interface WorkspaceContext {
  chatId: string;
  latestImage?: any;
  latestDocument?: any;
  latestAudio?: any;
  activeTool?: string;
  selectedLanguage?: string;
}

export interface UnifiedResponse {
  success: boolean;
  content: string;
  attachments?: any[];
  toolExecuted?: string;
  executionTimeMs?: number;
}

export class ToolRouter {
  async routeAndExecute(
    message: string,
    workspaceCtx: WorkspaceContext
  ): Promise<UnifiedResponse> {
    const startTime = Date.now();

    try {
      // 1. Perform classification automatically
      const hasImage = !!workspaceCtx.latestImage;
      const hasDocument = !!workspaceCtx.latestDocument;

      const classification = await intelligenceService.classifyIntent(
        message,
        hasImage,
        hasDocument,
        workspaceCtx.chatId
      );

      const primaryIntent = classification.context.primaryIntent || "general_chat";

      // Telemetry log for development
      console.log(`[ToolRouter] Detected intent: ${primaryIntent}`);

      // 2. Select tool matching capability requirements
      const selectedTool = this.selectToolForIntent(primaryIntent);
      console.log(`[ToolRouter] Selected tool: ${selectedTool.name}`);
      
      workspaceCtx.activeTool = selectedTool.name;

      // 3. Execute safely
      const toolContext: ToolContext = {
        chatId: workspaceCtx.chatId,
        latestImage: workspaceCtx.latestImage,
        latestDocument: workspaceCtx.latestDocument,
        latestAudio: workspaceCtx.latestAudio,
      };

      const result = await toolEngine.executeTool(selectedTool, message, toolContext);
      const executionTime = Date.now() - startTime;

      console.log(`[ToolRouter] Execution time: ${executionTime}ms`);
      console.log(`[ToolRouter] Tool result status: Success`);

      let content = "";
      let attachments: any[] = [];

      if (typeof result === "string") {
        content = result;
      } else if (result && typeof result === "object") {
        content = result.content || "";
        attachments = result.attachments || [];
      }

      return {
        success: true,
        content,
        attachments,
        toolExecuted: selectedTool.name,
        executionTimeMs: executionTime,
      };
    } catch (error: any) {
      console.error("[ToolRouter] Route and execute error:", error);
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        content: `Error: ${error.message || "An unexpected error occurred during workspace tool orchestration."}`,
        executionTimeMs: executionTime,
      };
    }
  }

  private selectToolForIntent(intent: string): Tool {
    const capabilityMap: { [key: string]: string } = {
      image_generation: "image_generation",
      image_editing: "image_editing",
      image_analysis: "ocr",
      document_analysis: "document_reading",
      translation: "translation",
      summarization: "summarization",
      voice_request: "voice_processing",
      reasoning_request: "reasoning",
      code_generation: "code_generation",
      code_debugging: "code_debugging",
      mathematics: "math",
      vision_request: "vision",
      web_search: "web_search",
      document_generation: "document_generation",
      excel_generation: "excel_generation",
      video_request: "video_generation",
      future_tasks: "tasks",
      future_memory: "memory",
    };

    const capability = capabilityMap[intent] || "text_chat";
    const matchedTools = toolRegistry.getToolsByCapability(capability);

    if (matchedTools.length > 0 && matchedTools[0].availability) {
      return matchedTools[0];
    }

    // Default ChatTool fallback
    return toolRegistry.getToolsByCapability("text_chat")[0];
  }
}

export const toolRouter = new ToolRouter();
