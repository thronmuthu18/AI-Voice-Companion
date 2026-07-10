import { Agent, AgentContext } from "./agent.interface";
import { agentRegistry } from "./agent.registry";
import { workflowPlanner } from "../workflow/workflow.planner";
import { workflowExecutor } from "../workflow/workflow.executor";

export interface OrchestrationResult {
  content: string;
  attachments?: any[];
  plan: string[];
  history?: string[];
}

export class CoordinatorAgent {
  // Plan task execution list (delegates list sorting mapping to agent Registry)
  planTasks(intents: string[]): Agent[] {
    const requiredAgents = new Map<string, Agent>();

    for (const intent of intents) {
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

      const agent = agentRegistry.getAgentByCapability(capability);
      if (agent && agent.availability) {
        requiredAgents.set(agent.name, agent);
      }
    }

    if (requiredAgents.size === 0) {
      const defaultAgent = agentRegistry.getAgent("Conversation Agent");
      if (defaultAgent) {
        requiredAgents.set(defaultAgent.name, defaultAgent);
      }
    }

    return Array.from(requiredAgents.values()).sort((a, b) => a.priority - b.priority);
  }

  // Executes orchestration via the Autonomous Workflow Engine
  async coordinate(message: string, intents: string[], context: AgentContext): Promise<OrchestrationResult> {
    console.log(`[CoordinatorAgent] Initiating Autonomous Workflow Planning...`);
    
    // 1. Build workflow plan
    const plan = workflowPlanner.planWorkflow(message, intents, context);
    
    // 2. Execute plan using WorkflowExecutor
    const executionResult = await workflowExecutor.executePlan(plan, context);

    const planNames = plan.tasks.map((t) => t.name);

    return {
      content: executionResult.content,
      attachments: executionResult.attachments,
      plan: planNames,
      history: executionResult.history
    };
  }
}

export const coordinatorAgent = new CoordinatorAgent();
