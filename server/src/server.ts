import http from 'http';
import fs from 'fs';
import path from 'path';
import { connectDB } from './config/database';
import { env } from './config/env';
import { createApp } from './app';
import { createSocketServer } from './sockets';

async function bootstrap(): Promise<void> {
  console.log("=== Launching Startup Configuration Checks ===");
  
  // 1. Database Connection check
  await connectDB();
  console.log("✔ Startup Check: Database Connection Active");

  // 2. Validate Uploads Directory existence
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log("✔ Startup Check: Uploads directory created");
  } else {
    console.log("✔ Startup Check: Uploads directory verified");
  }

  // 3. Environment schema validation status
  console.log("✔ Startup Check: Environment configuration verified");

  // 4. Verify AI Providers Health & Scaffolding
  console.log("=== Verifying AI Provider Scaffolding & Health ===");
  const { ProviderFactory } = require("./providers/provider.factory");
  
  try {
    const openaiProv = ProviderFactory.getProvider("openai");
    const openaiHealth = await openaiProv.healthCheck();
    console.log(`✔ Provider Check: OpenAI status = ${openaiHealth.status} (${openaiHealth.latency}ms)`);
  } catch (err: any) {
    console.warn(`⚠ Provider Check Warning: OpenAI status check failed: ${err.message}`);
  }

  try {
    const geminiProv = ProviderFactory.getProvider("gemini");
    const geminiHealth = await geminiProv.healthCheck();
    console.log(`✔ Provider Check: Gemini status = ${geminiHealth.status} (${geminiHealth.latency}ms)`);
  } catch (err: any) {
    console.warn(`⚠ Provider Check Warning: Gemini status check failed: ${err.message}`);
  }

  const app = createApp();
  const httpServer = http.createServer(app);
  createSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log(`Server listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
    console.log("==============================================");
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
