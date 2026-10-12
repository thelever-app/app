import express, { type Express } from "express";

/**
 * Builds the Express app without starting it, so tests can exercise it
 * in memory and server.ts decides how and where it listens.
 */
export function createApp(): Express {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}
