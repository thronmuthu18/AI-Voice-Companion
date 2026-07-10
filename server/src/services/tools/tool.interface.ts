export interface ToolContext {
  chatId: string;
  attachments?: any[];
  latestImage?: any;
  latestDocument?: any;
  latestAudio?: any;
}

export interface Tool {
  name: string;
  description: string;
  capabilities: string[];
  inputSchema: any;
  outputSchema: any;
  priority: number;
  availability: boolean;
  execute(input: string, context: ToolContext): Promise<any>;
}
