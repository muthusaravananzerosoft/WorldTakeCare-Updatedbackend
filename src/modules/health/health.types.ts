export type DependencyStatus = 'up' | 'down' | 'not_configured';

export interface HealthCheckData {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  environment: string;
  apiVersion: string;
  uptimeSeconds: number;
  timestamp: string;
  checks: {
    /** Becomes 'up' | 'down' once a database client is wired in (see src/database/README.md). */
    database: DependencyStatus;
  };
}
