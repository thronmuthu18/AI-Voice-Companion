import { env } from "../config/env";
import { ProviderName } from "./provider.types";

export const providerConfig = {
  enableRouter: env.ENABLE_PROVIDER_ROUTER,
  
  defaults: {
    chat: env.DEFAULT_CHAT_PROVIDER as ProviderName,
    analysis: env.DEFAULT_ANALYSIS_PROVIDER as ProviderName,
    image: env.DEFAULT_IMAGE_PROVIDER as ProviderName,
    imageEdit: env.DEFAULT_IMAGE_EDIT_PROVIDER as ProviderName,
  },

  gemini: {
    apiKey: env.GEMINI_API_KEY,
    models: {
      chat: env.GEMINI_CHAT_MODEL,
      fast: env.GEMINI_FAST_MODEL,
    }
  },

  openai: {
    apiKey: env.OPENAI_API_KEY,
    models: {
      image: env.OPENAI_IMAGE_MODEL,
    }
  }
};
