import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGO_URI: z.string().default('mongodb://localhost:27017/ai-os'),
  CLIENT_URL: z.string().url().default('http://localhost:3000'),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1d'),

  // Free Tier Limits
  FREE_TEXT_LIMIT: z.coerce.number().default(500),
  FREE_IMAGE_GENERATE_LIMIT: z.coerce.number().default(3),
  FREE_IMAGE_EDIT_LIMIT: z.coerce.number().default(3),
  FREE_IMAGE_ANALYZE_LIMIT: z.coerce.number().default(3),
  FREE_VIDEO_LIMIT: z.coerce.number().default(3),
  FREE_UPLOAD_LIMIT: z.coerce.number().default(3),
  FREE_AUDIO_LIMIT: z.coerce.number().default(5),
  FREE_TRANSCRIBE_LIMIT: z.coerce.number().default(10),

  // Pro Tier Limits
  PRO_TEXT_LIMIT: z.coerce.number().default(5000),
  PRO_IMAGE_GENERATE_LIMIT: z.coerce.number().default(50),
  PRO_IMAGE_EDIT_LIMIT: z.coerce.number().default(50),
  PRO_IMAGE_ANALYZE_LIMIT: z.coerce.number().default(50),
  PRO_VIDEO_LIMIT: z.coerce.number().default(50),
  PRO_UPLOAD_LIMIT: z.coerce.number().default(50),
  PRO_AUDIO_LIMIT: z.coerce.number().default(100),
  PRO_TRANSCRIBE_LIMIT: z.coerce.number().default(200),

  // Hybrid AI Provider Configs
  GEMINI_API_KEY: z.string().default(''), // allow optional/empty
  GEMINI_CHAT_MODEL: z.string().default('gemini-flash-lite-latest'),
  GEMINI_FAST_MODEL: z.string().default('gemini-flash-lite-latest'),
  OPENAI_IMAGE_MODEL: z.string().default('dall-e-3'),
  DEFAULT_CHAT_PROVIDER: z.string().default('gemini'),
  DEFAULT_ANALYSIS_PROVIDER: z.string().default('gemini'),
  DEFAULT_IMAGE_PROVIDER: z.string().default('openai'),
  DEFAULT_IMAGE_EDIT_PROVIDER: z.string().default('openai'),
  ENABLE_PROVIDER_ROUTER: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),

  OPENAI_API_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();
