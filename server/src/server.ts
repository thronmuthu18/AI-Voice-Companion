import http from 'http';
import { connectDB } from './config/database';
import { env } from './config/env';
import { createApp } from './app';
import { createSocketServer } from './sockets';

async function bootstrap(): Promise<void> {
  await connectDB();

  const app = createApp();
  const httpServer = http.createServer(app);
  createSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log(`Server listening on port ${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
