import { appConfig } from '../../config/app.config.js';
import type { HealthCheckData } from './health.types.js';

export const healthService = {
  getHealth(): HealthCheckData {
    return {
      status: 'ok',
      service: appConfig.name,
      version: appConfig.version,
      environment: appConfig.env,
      apiVersion: appConfig.apiVersion,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      checks: {
        database: 'not_configured',
      },
    };
  },
};
