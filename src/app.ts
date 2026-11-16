import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { appConfig } from './config/app.config.js';
import { corsOptions } from './config/cors.config.js';
import { openApiDocument } from './routes/openapi.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { notFoundMiddleware } from './middleware/not-found.middleware.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import { requestLoggerMiddleware } from './middleware/request-logger.middleware.js';
import { apiLimiter } from './middleware/rate-limit.middleware.js';
import { apiRouter } from './routes/index.js';

/**
 * Builds the Express application without starting a server, so tests can
 * exercise it with supertest and server.ts owns the network lifecycle.
 */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', appConfig.trustProxy);

  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(express.json({ limit: appConfig.jsonBodyLimit }));
  app.use(express.urlencoded({ extended: false, limit: appConfig.jsonBodyLimit }));

  if (appConfig.docs.enabled) {
    app.get(appConfig.docs.jsonPath, (_req, res) => {
      res.json(openApiDocument);
    });
    // Swagger UI ships inline scripts/styles, so relax CSP for the docs route only.
    app.use(
      appConfig.docs.uiPath,
      helmet({ contentSecurityPolicy: false }),
      swaggerUi.serve,
      swaggerUi.setup(openApiDocument, { customSiteTitle: `${appConfig.name} Docs` }),
    );
  }

  app.use(appConfig.apiPrefix, apiLimiter, apiRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
