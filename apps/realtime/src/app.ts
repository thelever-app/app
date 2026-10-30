import express, { type ErrorRequestHandler, type Express, type RequestHandler } from 'express';
import type { HttpEndpoint } from './http/http-endpoint.ts';

export interface AppOptions {
  /** Runs before every endpoint that asks for authentication. */
  readonly authenticate: RequestHandler;
  /** Answers whatever an endpoint throws. */
  readonly errorHandler: ErrorRequestHandler;
}

/**
 * Builds the Express app without starting it, with the endpoints it is given.
 * It knows nothing about what they do: the composition root decides which ones there are.
 */
export function createApp(
  endpoints: readonly HttpEndpoint[],
  { authenticate, errorHandler }: AppOptions,
): Express {
  const app = express();

  app.use(express.json());

  for (const endpoint of endpoints) {
    const guards = endpoint.authenticated ? [authenticate] : [];
    app[endpoint.method](endpoint.path, ...guards, (req, res) => endpoint.handle(req, res));
  }

  app.use(errorHandler);

  return app;
}
