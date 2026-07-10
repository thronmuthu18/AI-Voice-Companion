export type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface WorkflowTask {
  id: string;
  name: string;
  status: TaskStatus;
  retryCount: number;
  maxRetries: number;
  dependencies: string[]; // IDs of tasks that must complete first
  execute(context: any): Promise<any>;
  result?: any;
  error?: string;
  executionTime?: number;
}

export interface WorkflowPlan {
  id: string;
  tasks: WorkflowTask[];
  status: TaskStatus;
  createdAt: Date;
}
