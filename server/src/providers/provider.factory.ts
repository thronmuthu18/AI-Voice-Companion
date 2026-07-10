import { IAIProvider } from "./provider.interface";
import { ProviderName } from "./provider.types";
import { openaiProvider } from "./openai/openai.provider";
import { geminiProvider } from "./gemini/gemini.provider";

export class ProviderFactory {
  private static instances = new Map<ProviderName, IAIProvider>([
    ["openai", openaiProvider],
    ["gemini", geminiProvider],
  ]);

  /**
   * Returns the cached singleton provider instance.
   */
  static getProvider(name: ProviderName): IAIProvider {
    const provider = this.instances.get(name);
    if (!provider) {
      throw new Error(`AI Provider '${name}' is not supported or not initialized`);
    }
    return provider;
  }
}
