import { Agent, AgentContext, AgentResponse } from "./agent.interface";
import { toolEngine } from "../tools/tool.engine";
import { toolRegistry } from "../tools/tool.registry";

// Conversation Agent
export class ConversationAgent implements Agent {
  name = "Conversation Agent";
  capabilities = ["general_chat", "creative_writing", "translation", "summarization"];
  priority = 10;
  availability = true;
  async execute(task: string, context: AgentContext): Promise<AgentResponse> {
    const chatTool = toolRegistry.getToolsByCapability("text_chat")[0];
    const content = await toolEngine.executeTool(chatTool, task, context);
    return { content };
  }
}

// Programming Agent
export class ProgrammingAgent implements Agent {
  name = "Programming Agent";
  capabilities = ["programming", "code_generation", "code_debugging"];
  priority = 2;
  availability = true;
  async execute(task: string, context: AgentContext): Promise<AgentResponse> {
    const chatTool = toolRegistry.getToolsByCapability("text_chat")[0];
    const content = await toolEngine.executeTool(chatTool, task, context);
    return { content };
  }
}

// Media Agent
export class MediaAgent implements Agent {
  name = "Media Agent";
  capabilities = ["image_generation", "image_editing", "image_analysis", "vision_request"];
  priority = 1;
  availability = true;
  async execute(task: string, context: AgentContext): Promise<AgentResponse> {
    const hasImageGen = /\b(generate|create|draw|make)\b/i.test(task) && !context.latestImage;
    
    if (hasImageGen) {
      const tool = toolRegistry.getTool("Image Generation Tool")!;
      const url = await toolEngine.executeTool(tool, task, context);
      return {
        content: `Here is the generated image for: "${task}"`,
        attachments: [{ name: "generated_image.png", mimeType: "image/png", url, size: 100000 }]
      };
    }

    if (context.latestImage) {
      const tool = toolRegistry.getTool("Image Editing Tool")!;
      const url = await toolEngine.executeTool(tool, task, context);
      return {
        content: `Here is the edited image for: "${task}"`,
        attachments: [{ name: `edited_${context.latestImage.name}`, mimeType: "image/png", url, size: 100000 }]
      };
    }

    const chatTool = toolRegistry.getToolsByCapability("text_chat")[0];
    const content = await toolEngine.executeTool(chatTool, task, context);
    return { content };
  }
}

// Document Agent
export class DocumentAgent implements Agent {
  name = "Document Agent";
  capabilities = ["document_analysis", "file_processing"];
  priority = 3;
  availability = true;
  async execute(task: string, context: AgentContext): Promise<AgentResponse> {
    const chatTool = toolRegistry.getToolsByCapability("text_chat")[0];
    const content = await toolEngine.executeTool(chatTool, task, context);
    return { content };
  }
}

// Voice Agent
export class VoiceAgent implements Agent {
  name = "Voice Agent";
  capabilities = ["voice_request"];
  priority = 4;
  availability = true;
  async execute(task: string, context: AgentContext): Promise<AgentResponse> {
    const chatTool = toolRegistry.getToolsByCapability("text_chat")[0];
    const content = await toolEngine.executeTool(chatTool, task, context);
    return { content };
  }
}

// Reasoning Agent
export class ReasoningAgent implements Agent {
  name = "Reasoning Agent";
  capabilities = ["reasoning_request", "mathematics"];
  priority = 5;
  availability = true;
  async execute(task: string, context: AgentContext): Promise<AgentResponse> {
    const chatTool = toolRegistry.getToolsByCapability("text_chat")[0];
    const content = await toolEngine.executeTool(chatTool, task, context);
    return { content };
  }
}

// Centralized Agent Registry
export class AgentRegistry {
  private registry = new Map<string, Agent>();

  constructor() {
    this.register(new ConversationAgent());
    this.register(new ProgrammingAgent());
    this.register(new MediaAgent());
    this.register(new DocumentAgent());
    this.register(new VoiceAgent());
    this.register(new ReasoningAgent());
  }

  register(agent: Agent) {
    this.registry.set(agent.name, agent);
  }

  getAgent(name: string): Agent | undefined {
    return this.registry.get(name);
  }

  getAgentByCapability(capability: string): Agent | undefined {
    const agents = Array.from(this.registry.values()).filter((a) =>
      a.capabilities.includes(capability)
    );
    return agents.sort((a, b) => a.priority - b.priority)[0];
  }

  getAllAgents(): Agent[] {
    return Array.from(this.registry.values());
  }
}

export const agentRegistry = new AgentRegistry();
