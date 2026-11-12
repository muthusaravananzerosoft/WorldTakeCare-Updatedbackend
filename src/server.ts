import type { Server } from 'node:http';
import { createApp } from './app.js';
import { appConfig } from './config/app.config.js';

const app = createApp();

const server: Server = app.listen(appConfig.port, () => {
  console.info(
    `${appConfig.name} listening on http://localhost:${appConfig.port}${appConfig.apiPrefix} (${appConfig.env})`,
  );
  if (appConfig.docs.enabled) {
    console.info(`Swagger UI: http://localhost:${appConfig.port}${appConfig.docs.uiPath}`);
  }
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') console.error(`Port ${appConfig.port} is already in use`);
  else console.error('Server failed to start:', error);
  process.exit(1);
});

let shuttingDown = false;

function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`${signal} received, closing HTTP server...`);

  const forceExit = setTimeout(() => {
    console.error(`Shutdown timed out after ${appConfig.shutdownTimeoutMs}ms, forcing exit`);
    process.exit(1);
  }, appConfig.shutdownTimeoutMs);
  forceExit.unref();

  // Future: close database pool, WebSocket server and queues here.
  server.close((error) => {
    if (error) {
      console.error('Error while closing server:', error);
      process.exit(1);
    }
    console.info('HTTP server closed');
    process.exit(0);
  });
  server.closeIdleConnections();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception, shutting down:', error);
  process.exit(1);
});
