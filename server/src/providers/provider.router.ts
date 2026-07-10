import { IAIProvider } from "./provider.interface";
import { ProviderFactory } from "./provider.factory";
import { providerConfig } from "./provider.config";

export type RoutingAction = "chat" | "analysis" | "image" | "imageEdit";

export class ProviderRouter {
  /**
   * Routes the task execution request to the appropriate IAIProvider based on defaults.
   */
  static getProviderForAction(action: RoutingAction): IAIProvider {
    if (!providerConfig.enableRouter) {
      // If router is explicitly disabled, fallback to openai as standard default
      return ProviderFactory.getProvider("openai");
    }

    const defaultProviderName = providerConfig.defaults[action];
    if (!defaultProviderName) {
      throw new Error(`No default provider configured for action type: ${action}`);
    }

    return ProviderFactory.getProvider(defaultProviderName);
  }
}
