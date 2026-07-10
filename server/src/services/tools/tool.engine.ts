import { Tool, ToolContext } from "./tool.interface";
import { toolRegistry } from "./tool.registry";

export class ToolEngine {
  // Maps intent engine classification outputs to registered tools
  selectTools(intents: string[]): Tool[] {
    const selected: Tool[] = [];
    
    // Map intents to capability requirements
    const intentMap: { [key: string]: string } = {
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
      vision_request: "vision"
    };

    for (const intent of intents) {
      const capability = intentMap[intent];
      if (capability) {
        const tools = toolRegistry.getToolsByCapability(capability);
        if (tools.length > 0 && tools[0].availability) {
          selected.push(tools[0]);
        }
      }
    }

    // Default to ChatTool if no tools matched or resolved
    if (selected.length === 0) {
      const chatTools = toolRegistry.getToolsByCapability("text_chat");
      if (chatTools.length > 0) {
        selected.push(chatTools[0]);
      }
    }

    // Sort by priority (lower number = higher priority)
    return selected.sort((a, b) => a.priority - b.priority);
  }

  // Executes a single tool with failover protection
  async executeTool(tool: Tool, input: string, context: ToolContext): Promise<any> {
    try {
      console.log(`[ToolEngine] Executing tool: ${tool.name}`);
      return await tool.execute(input, context);
    } catch (err: any) {
      console.error(`[ToolEngine] Tool execution failed for ${tool.name}:`, err.message);
      // Failover fallback to ChatTool
      const chatTool = toolRegistry.getToolsByCapability("text_chat")[0];
      if (tool.name !== chatTool.name) {
        console.log(`[ToolEngine] Falling back to: ${chatTool.name}`);
        return await chatTool.execute(input, context);
      }
      throw err;
    }
  }
}

export const toolEngine = new ToolEngine();
