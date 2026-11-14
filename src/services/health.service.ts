import { appConfig } from '../config/app.config.js';
import { databaseClient } from '../database/client.js';
import type { HealthCheckData } from '../entities/health.types.js';

export const healthService = {
  async getHealth(): Promise<HealthCheckData> {
    return {
      status: 'ok',
      service: appConfig.name,
      version: appConfig.version,
      environment: appConfig.env,
      apiVersion: appConfig.apiVersion,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      checks: {
        database: await databaseClient.ping(),
      },
    };
  },
};
