import { WorkflowPlan } from "./workflow.interface";

export interface WorkflowResult {
  content: string;
  attachments?: any[];
  history: string[];
}

export class WorkflowExecutor {
  // Execute a planned workflow with parallel and serial runs matching dependency trees
  async executePlan(plan: WorkflowPlan, context: any): Promise<WorkflowResult> {
    plan.status = "running";
    const completedTaskIds = new Set<string>();
    const executionHistory: string[] = [];

    let combinedContent = "";
    const combinedAttachments: any[] = [];

    // Loop until all tasks are executed or failed/cancelled
    while (completedTaskIds.size < plan.tasks.length) {
      // Find tasks that are ready for execution (status is pending AND all dependencies are completed)
      const runnableTasks = plan.tasks.filter((t) =>
        t.status === "pending" && t.dependencies.every((depId) => completedTaskIds.has(depId))
      );

      if (runnableTasks.length === 0) {
        // Check if there are any remaining running tasks (waiting for them)
        const hasRunning = plan.tasks.some((t) => t.status === "running");
        if (!hasRunning) {
          // Circular dependency or dead lock detected
          console.warn("[WorkflowExecutor] Deadlock detected or all runnable tasks exhausted.");
          break;
        }
        // Yield execution loop slightly
        await new Promise((resolve) => setTimeout(resolve, 50));
        continue;
      }

      // Execute ready tasks in parallel
      const executionPromises = runnableTasks.map(async (task) => {
        task.status = "running";
        const startTime = Date.now();
        executionHistory.push(`Task Started: ${task.name}`);

        let success = false;
        while (task.retryCount <= task.maxRetries && !success) {
          try {
            const result = await task.execute(context);
            task.result = result;
            task.status = "completed";
            task.executionTime = Date.now() - startTime;
            success = true;
            completedTaskIds.add(task.id);
            executionHistory.push(`Task Completed: ${task.name} (${task.executionTime}ms)`);

            // Accumulate response outputs
            if (result.content) {
              if (combinedContent && !combinedContent.includes(result.content)) {
                combinedContent += "\n\n";
              }
              if (!combinedContent.includes(result.content)) {
                combinedContent += result.content;
              }
            }
            if (result.attachments && result.attachments.length > 0) {
              combinedAttachments.push(...result.attachments);
            }
          } catch (err: any) {
            task.retryCount++;
            task.error = err.message;
            executionHistory.push(`Task Failed (Attempt ${task.retryCount}): ${task.name} - ${err.message}`);
            if (task.retryCount > task.maxRetries) {
              task.status = "failed";
              completedTaskIds.add(task.id); // Add to avoid blocking dependent runs in soft-fail architectures
            }
          }
        }
      });

      await Promise.all(executionPromises);
    }

    plan.status = plan.tasks.some((t) => t.status === "failed") ? "failed" : "completed";

    return {
      content: combinedContent || "No output returned by workflow execution.",
      attachments: combinedAttachments.length > 0 ? combinedAttachments : undefined,
      history: executionHistory
    };
  }
}

export const workflowExecutor = new WorkflowExecutor();
