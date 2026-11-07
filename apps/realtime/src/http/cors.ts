import type { RequestHandler } from 'express';

/** What the web sends: the token, the body, the proof that it is the app and the trace. */
const ALLOWED_HEADERS = 'Authorization, Content-Type, X-Firebase-AppCheck, traceparent';

/**
 * Lets the web, served from another origin than the room server, call its HTTP routes: the browser
 * only reads an answer that names its origin. A request from any other origin gets no such header,
 * and one from no browser is left as it comes. The WebSocket is not affected.
 */
export function cors(allowedOrigins: readonly string[]): RequestHandler {
  const allowed = new Set(allowedOrigins);
  return (req, res, next) => {
    // The answer depends on the origin: a cache must not give one origin's answer to another.
    res.vary('Origin');
    const origin = req.get('Origin');
    if (!origin || !allowed.has(origin)) {
      next();
      return;
    }
    res.set('Access-Control-Allow-Origin', origin);
    if (req.method !== 'OPTIONS') {
      next();
      return;
    }
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', ALLOWED_HEADERS);
    // The browser asks again at most once a day.
    res.set('Access-Control-Max-Age', '86400');
    res.status(204).end();
  };
}
