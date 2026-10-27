import type { Request, Response } from 'express';
import type { HttpEndpoint } from './http-endpoint.ts';

/** GET /health: tells Cloud Run and the deployment that the service is up. */
export class HealthEndpoint implements HttpEndpoint {
  readonly method = 'get';
  readonly path = '/health';
  readonly authenticated = false;

  async handle(_req: Request, res: Response): Promise<void> {
    res.json({ status: 'ok' });
  }
}
