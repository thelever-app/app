import type { ErrorCodeDto, HttpErrorDto } from '@thelever-app/protocol';
import type { ErrorRequestHandler } from 'express';
import { InvalidBodyError } from './parse-body.ts';

/** The status each code is answered with; any other code a client causes is a conflict. */
const STATUS: Partial<Record<ErrorCodeDto, number>> = {
  'invalid-message': 400,
  'nickname-missing': 400,
  'duplicate-dilemma': 400,
  'invalid-token': 401,
  'room-not-found': 404,
  'dilemma-not-found': 404,
};

/** Whether Express could not read the body as JSON. */
function isUnreadableBody(error: unknown): boolean {
  return (error as { type?: unknown } | null)?.type === 'entity.parse.failed';
}

/**
 * Answers every error a client can cause with its stable code, the same one the sockets send.
 * `codeOf` tells which errors those are; the rest is a fault of the server and goes on to Express.
 */
export function httpErrorHandler(
  codeOf: (error: unknown) => ErrorCodeDto | undefined,
): ErrorRequestHandler {
  return (error, _req, res, next) => {
    const code =
      error instanceof InvalidBodyError || isUnreadableBody(error)
        ? 'invalid-message'
        : codeOf(error);
    if (!code) {
      next(error);
      return;
    }
    const body: HttpErrorDto = { code };
    res.status(STATUS[code] ?? 409).json(body);
  };
}
