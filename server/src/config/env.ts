import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Known weak/placeholder secrets that must not be used in production
const WEAK_SECRETS = new Set([
  'secret', 'change_me', 'changeme', 'your_secret', 'super_secret',
  'super_secret_key', 'super_secret_key_change_in_production',
  'super_secret_refresh_key_change_in_production',
  'generate_a_long_random_secret', 'generate_a_different_long_random_secret',
  'jwt_secret', 'jwt_refresh_secret', 'password', 'test', 'dev',
]);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGO_URI: z.string().default('mongodb://localhost:27017/ai-os'),
  CLIENT_URL: z.string().url().default('http://localhost:3000').transform(v => v.trim()),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),

  // Free Tier Limits
  FREE_TEXT_LIMIT: z.coerce.number().default(200),
  FREE_IMAGE_GENERATE_LIMIT: z.coerce.number().default(4),
  FREE_IMAGE_EDIT_LIMIT: z.coerce.number().default(4),
  FREE_IMAGE_ANALYZE_LIMIT: z.coerce.number().default(4),
  FREE_VIDEO_LIMIT: z.coerce.number().default(4),
  FREE_UPLOAD_LIMIT: z.coerce.number().default(4),
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
  GEMINI_API_KEY: z.string().default(''), // allow optional/empty in development
  GEMINI_CHAT_MODEL: z.string().default('gemini-flash-lite-latest'),
  GEMINI_FAST_MODEL: z.string().default('gemini-flash-lite-latest'),
  OPENAI_IMAGE_MODEL: z.string().default('dall-e-3'),
  DEFAULT_CHAT_PROVIDER: z.string().default('gemini'),
  DEFAULT_ANALYSIS_PROVIDER: z.string().default('gemini'),
  DEFAULT_IMAGE_PROVIDER: z.string().default('openai'),
  DEFAULT_IMAGE_EDIT_PROVIDER: z.string().default('openai'),
  ENABLE_PROVIDER_ROUTER: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),

  OPENAI_API_KEY: z.string().default(''),

  // Email Verification & Google Auth Configs
  RESEND_API_KEY: z.string().default(''),
  EMAIL_FROM_ADDRESS: z.string().default('noreply@champai.app'),
  EMAIL_FROM_NAME: z.string().default('Champ.ai'),
  GOOGLE_CLIENT_ID: z.string().default(''),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    // Log field names only, never values
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const errorFields = Object.keys(fieldErrors);
    console.error(`[Config] Invalid environment configuration. Check these variables: ${errorFields.join(', ')}`);
    process.exit(1);
  }

  const env = parsed.data;
  const isProd = env.NODE_ENV === 'production';

  // Production-only secret validation
  if (isProd) {
    const secretsToCheck: [string, string][] = [
      ['JWT_SECRET', env.JWT_SECRET],
      ['JWT_REFRESH_SECRET', env.JWT_REFRESH_SECRET],
    ];

    for (const [name, value] of secretsToCheck) {
      if (WEAK_SECRETS.has(value.toLowerCase().trim())) {
        console.error(`[Config] CRITICAL: ${name} appears to be a weak placeholder secret. Use a strong unique value in production.`);
        process.exit(1);
      }
    }

    // JWT_SECRET and JWT_REFRESH_SECRET must not be identical
    if (env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
      console.error('[Config] CRITICAL: JWT_SECRET and JWT_REFRESH_SECRET must be different values.');
      process.exit(1);
    }

    // In production, GEMINI_API_KEY is required if using Gemini provider
    if (env.DEFAULT_CHAT_PROVIDER === 'gemini' && !env.GEMINI_API_KEY) {
      console.error('[Config] CRITICAL: GEMINI_API_KEY is required when DEFAULT_CHAT_PROVIDER=gemini.');
      process.exit(1);
    }

    if (!env.MONGO_URI || env.MONGO_URI === 'mongodb://localhost:27017/ai-os') {
      console.error('[Config] CRITICAL: A valid MONGO_URI is required in production.');
      process.exit(1);
    }

    if (!env.RESEND_API_KEY) {
      console.error('[Config] CRITICAL: RESEND_API_KEY is required in production.');
      process.exit(1);
    }

    if (!env.GOOGLE_CLIENT_ID) {
      console.error('[Config] CRITICAL: GOOGLE_CLIENT_ID is required in production.');
      process.exit(1);
    }
  }

  return env;
}

export const env = loadEnv();
