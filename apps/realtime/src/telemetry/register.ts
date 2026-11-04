import { register } from 'node:module';
import { CloudLoggingLogger } from './cloud-logging-logger.ts';
import { startTelemetry } from './telemetry.ts';

/**
 * Loaded with `node --import` before the server, so the instrumentations see every module the
 * server loads: the hook patches ES modules as they load (Express, pg). Only on Cloud Run, which
 * sets K_SERVICE: locally and in the tests nothing leaves the process.
 */
function telemetryOnCloudRun() {
  if (!process.env.K_SERVICE) return undefined;
  register('@opentelemetry/instrumentation/hook.mjs', import.meta.url);
  // The Firebase project of each environment is its Google Cloud project.
  const projectId = process.env.FIREBASE_PROJECT_ID!;
  return startTelemetry({
    projectId,
    sampleRatio: Number(process.env.OTEL_TRACES_SAMPLER_ARG ?? 1),
    logger: new CloudLoggingLogger({ projectId }),
  });
}

const telemetry = telemetryOnCloudRun();

/** Sends what is still buffered: on SIGTERM, before the process exits. */
export async function shutdownTelemetry(): Promise<void> {
  await telemetry?.shutdown();
}
