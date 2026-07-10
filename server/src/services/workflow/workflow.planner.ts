import { WorkflowPlan, WorkflowTask } from "./workflow.interface";
import { agentRegistry } from "../agents/agent.registry";
import { v4 as uuidv4 } from "uuid";

export class WorkflowPlanner {
  // Plan step sequences and dependency bindings
  planWorkflow(message: string, intents: string[], _context: any): WorkflowPlan {
    const tasks: WorkflowTask[] = [];
    const intentToTaskMap = new Map<string, string>(); // maps intent to task ID

    // Helper to resolve agent capabilities
    const getAgentForIntent = (intent: string) => {
      let capability = "general_chat";
      if (["programming", "code_generation", "code_debugging"].includes(intent)) {
        capability = "programming";
      } else if (["image_generation", "image_editing", "image_analysis", "vision_request"].includes(intent)) {
        capability = "image_generation";
      } else if (["document_analysis", "file_processing"].includes(intent)) {
        capability = "document_analysis";
      } else if (intent === "voice_request") {
        capability = "voice_request";
      } else if (["reasoning_request", "mathematics"].includes(intent)) {
        capability = "reasoning_request";
      } else if (["translation", "summarization", "general_chat", "creative_writing"].includes(intent)) {
        capability = "general_chat";
      }
      return agentRegistry.getAgentByCapability(capability);
    };

    // 1. Create a task for each active intent
    for (const intent of intents) {
      const agent = getAgentForIntent(intent);
      if (agent) {
        const taskId = uuidv4();
        intentToTaskMap.set(intent, taskId);

        tasks.push({
          id: taskId,
          name: `${agent.name} [${intent}]`,
          status: "pending",
          retryCount: 0,
          maxRetries: 2,
          dependencies: [],
          execute: async (ctx: any) => {
            return await agent.execute(message, ctx);
          }
        });
      }
    }

    // 2. Resolve dependencies between tasks
    // Example: Translation and Summarization depend on Document Analysis if a document context exists
    const docTaskId = intentToTaskMap.get("document_analysis") || intentToTaskMap.get("file_processing");
    if (docTaskId) {
      for (const intent of ["translation", "summarization"]) {
        const depTaskId = intentToTaskMap.get(intent);
        if (depTaskId) {
          const task = tasks.find((t) => t.id === depTaskId);
          if (task) {
            task.dependencies.push(docTaskId);
          }
        }
      }
    }

    // Example: Conversational explanation / general chat depends on Media tasks if generating a logo
    const mediaTaskId = intentToTaskMap.get("image_generation") || intentToTaskMap.get("image_editing");
    if (mediaTaskId) {
      const chatTaskId = intentToTaskMap.get("general_chat");
      if (chatTaskId) {
        const task = tasks.find((t) => t.id === chatTaskId);
        if (task) {
          task.dependencies.push(mediaTaskId);
        }
      }
    }

    // Ensure at least one fallback task
    if (tasks.length === 0) {
      const defaultAgent = agentRegistry.getAgent("Conversation Agent")!;
      tasks.push({
        id: uuidv4(),
        name: `${defaultAgent.name} [general_chat]`,
        status: "pending",
        retryCount: 0,
        maxRetries: 2,
        dependencies: [],
        execute: async (ctx: any) => {
          return await defaultAgent.execute(message, ctx);
        }
      });
    }

    return {
      id: uuidv4(),
      tasks,
      status: "pending",
      createdAt: new Date()
    };
  }
}

export const workflowPlanner = new WorkflowPlanner();
