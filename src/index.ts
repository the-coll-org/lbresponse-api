import 'dotenv/config';
import app from './app';
import { logger } from './lib/logger';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, 'API server listening');
});

// Graceful shutdown — let in-flight requests finish before the process exits.
// Docker sends SIGTERM on `compose up` recreate / `stop`; without this, active
// requests are dropped on every redeploy.
function shutdown(signal: string): void {
  logger.info({ signal }, 'Shutting down');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  // Hard cap so a stuck connection can't block shutdown forever.
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
  process.exit(1);
});
