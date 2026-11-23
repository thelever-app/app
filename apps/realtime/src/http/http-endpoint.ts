import type { Request, Response } from 'express';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

/** One route of the app: its method, its path and what it does. The app mounts it without knowing more. */
export interface HttpEndpoint {
  readonly method: HttpMethod;
  readonly path: string;
  /** Whether only callers with a valid token may use it; their identity is then on the response. */
  readonly authenticated: boolean;
  /**
   * How many times a minute each identity may call it, in each instance, for a route whose abuse
   * costs: sweeping room codes, creating rooms, sending notices. Only on authenticated routes.
   */
  readonly perIdentityPerMinute?: number;
  /** Answers the request, or throws for the error handler to answer. */
  handle(req: Request, res: Response): Promise<void>;
}
