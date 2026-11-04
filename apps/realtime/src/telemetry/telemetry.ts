import { randomUUID } from 'node:crypto';
import { type Attributes, diag, DiagLogLevel } from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { gcpDetector } from '@opentelemetry/resource-detector-gcp';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor, ParentBasedSampler } from '@opentelemetry/sdk-trace';
import type { Logger } from '@thelever-app/db';
import { GoogleAuth } from 'google-auth-library';
import { GameSampler } from './game-sampler.ts';

/** Where the room server runs, and where its telemetry is taken in and kept (ADR 0005). */
const REGION = 'europe-southwest1';
const TELEMETRY_ENDPOINT = `https://telemetry.${REGION}.rep.googleapis.com`;
/** How long sending what is still buffered may take when the instance leaves. */
const SHUTDOWN_TIMEOUT_MS = 2000;

/**
 * The address of the player and their browser never reach a span: the hook runs after the
 * instrumentation computes its attributes, and the SDK drops the ones left undefined.
 */
const WITHOUT_THE_CLIENT: Attributes = {
  'client.address': undefined,
  'network.peer.address': undefined,
  'network.peer.port': undefined,
  'user_agent.original': undefined,
};

/** HTTP, without the client in its spans and without the health check of Cloud Run. */
export function httpInstrumentation(): HttpInstrumentation {
  return new HttpInstrumentation({
    ignoreIncomingRequestHook: (request) => request.url === '/health',
    startIncomingSpanHook: () => WITHOUT_THE_CLIENT,
    // Calls nobody asked for (token keys, the Cloud SQL connector) are not traces of their own.
    requireParentforOutgoingSpans: true,
  });
}

/** What the telemetry of the process needs to know about its environment. */
export interface TelemetryOptions {
  /** The Google Cloud project that receives it, and pays for it. */
  readonly projectId: string;
  /** The share of games whose traces are kept, from 0 to 1. */
  readonly sampleRatio: number;
  /** Where the SDK says what fails, such as an export the Telemetry API turns down. */
  readonly logger: Logger;
}

/**
 * Starts tracing and metrics for the room server, sent with OTLP to the Telemetry API with the
 * credentials of the service account; logs go to stdout instead (CloudLoggingLogger).
 */
export function startTelemetry({ projectId, sampleRatio, logger }: TelemetryOptions): {
  readonly shutdown: () => Promise<void>;
} {
  const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
  // A fresh token for every export: it lasts an hour, and the library renews it.
  const headers = async () => ({
    ...Object.fromEntries(await auth.getRequestHeaders()),
    'x-goog-user-project': projectId,
  });
  const games = new GameSampler(sampleRatio);
  diag.setLogger(
    {
      // A fixed message, so the errors of the SDK count as one kind; what failed goes as its cause.
      // The SDK puts the name of its component first, then a text, then the error, if any.
      error: (message, ...args) =>
        logger.error(
          'telemetry failed',
          args.find((arg) => arg instanceof Error) ?? [message, ...args].join(' '),
        ),
      warn: (message, ...args) =>
        logger.warn(`telemetry: ${message}`, {
          ...(args.length > 0 ? { detail: JSON.stringify(args).slice(0, 2000) } : {}),
        }),
      info: () => {},
      debug: () => {},
      verbose: () => {},
    },
    DiagLogLevel.WARN,
  );

  const sdk = new NodeSDK({
    serviceName: 'realtime',
    // The Telemetry API turns down a resource without its project, and a metric without the
    // instance that measured it and a region that matches the endpoint.
    resource: resourceFromAttributes({
      'gcp.project_id': projectId,
      'service.instance.id': randomUUID(),
      'cloud.region': REGION,
    }),
    resourceDetectors: [gcpDetector],
    // The client may start a trace, but the server decides which games are kept.
    sampler: new ParentBasedSampler({
      root: games,
      remoteParentSampled: games,
      remoteParentNotSampled: games,
    }),
    spanProcessors: [
      new BatchSpanProcessor({
        exporter: new OTLPTraceExporter({ url: `${TELEMETRY_ENDPOINT}/v1/traces`, headers }),
      }),
    ],
    metricReaders: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: `${TELEMETRY_ENDPOINT}/v1/metrics`, headers }),
        exportIntervalMillis: 60_000,
      }),
    ],
    // Without processors the SDK would send logs to an OTLP endpoint on localhost.
    logRecordProcessors: [],
    instrumentations: [
      httpInstrumentation(),
      new ExpressInstrumentation(),
      // The beat, LISTEN and the cleaning of dead instances query on their own, every few seconds.
      new PgInstrumentation({ requireParentSpan: true }),
    ],
  });
  sdk.start();
  return {
    // Cloud Run waits 10 s after SIGTERM: what is still buffered gets 2 of them, and no more.
    shutdown: () =>
      Promise.race([
        sdk.shutdown(),
        new Promise<void>((resolve) => setTimeout(resolve, SHUTDOWN_TIMEOUT_MS).unref()),
      ]),
  };
}
