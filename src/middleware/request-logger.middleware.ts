import type { Request } from 'express';
import morgan from 'morgan';
import { appConfig } from '../config/app.config.js';

morgan.token('id', (req) => (req as Request).id);

const format =
  appConfig.logFormat === 'dev'
    ? ':id :method :url :status :response-time ms'
    : appConfig.logFormat;

/** HTTP access log. Silent during tests to keep test output readable. */
export const requestLoggerMiddleware = morgan(format, {
  skip: () => appConfig.isTest,
});
