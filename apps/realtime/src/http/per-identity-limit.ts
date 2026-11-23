import type { HttpErrorDto } from '@thelever-app/protocol';
import type { RequestHandler } from 'express';
import { identityOf } from './authentication.ts';

const MINUTE_MS = 60_000;
/** Past this many identities counted, the windows that ended are dropped. */
const PRUNE_ABOVE = 10_000;

/**
 * Lets each identity call the route that many times a minute, counted in this instance; the next
 * call of the minute is answered too-many-requests. Node runs one call at a time, so calls sent
 * together are counted one by one.
 */
export function perIdentityLimit(perMinute: number, now = () => Date.now()): RequestHandler {
  const windows = new Map<string, { readonly startedAt: number; calls: number }>();
  return (_req, res, next) => {
    const identity = identityOf(res);
    const at = now();
    const window = windows.get(identity);
    if (!window || at - window.startedAt >= MINUTE_MS) {
      if (windows.size > PRUNE_ABOVE) {
        for (const [key, { startedAt }] of windows) {
          if (at - startedAt >= MINUTE_MS) windows.delete(key);
        }
      }
      windows.set(identity, { startedAt: at, calls: 1 });
      next();
      return;
    }
    if (window.calls >= perMinute) {
      const body: HttpErrorDto = { code: 'too-many-requests' };
      res.status(429).json(body);
      return;
    }
    window.calls += 1;
    next();
  };
}
