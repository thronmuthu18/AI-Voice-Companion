export interface AgentContext {
  chatId: string;
  attachments?: any[];
  latestImage?: any;
  latestDocument?: any;
  latestAudio?: any;
}

export interface AgentResponse {
  content: string;
  attachments?: any[];
}

export interface Agent {
  name: string;
  capabilities: string[];
  priority: number;
  availability: boolean;
  execute(task: string, context: AgentContext): Promise<AgentResponse>;
}
