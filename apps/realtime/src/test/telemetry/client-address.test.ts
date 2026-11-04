import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  TracerProvider,
} from '@opentelemetry/sdk-trace';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { httpInstrumentation } from '../../telemetry/telemetry.ts';

const exporter = new InMemorySpanExporter();
const instrumentation = httpInstrumentation();
let url: string;
let close: () => Promise<void>;

beforeAll(async () => {
  instrumentation.setTracerProvider(
    new TracerProvider({ spanProcessors: [new SimpleSpanProcessor({ exporter })] }),
  );
  instrumentation.enable();
  // Required after the instrumentation is on, as `node --import` arranges in Cloud Run.
  const http = createRequire(import.meta.url)('node:http') as typeof import('node:http');
  const server = http.createServer((_request, response) => response.end('ok'));
  await new Promise<void>((resolve) => server.listen(0, resolve));
  url = `http://localhost:${(server.address() as AddressInfo).port}`;
  close = () => new Promise((resolve) => server.close(() => resolve()));
});

afterAll(async () => {
  await close();
  instrumentation.disable();
});

describe('the HTTP instrumentation of the room server', () => {
  it('should keep the address and the browser of the client out of its spans', async () => {
    // Act
    await fetch(`${url}/rooms`, {
      headers: { 'X-Forwarded-For': '203.0.113.7, 198.51.100.2', 'User-Agent': 'TestBrowser/1.0' },
    });

    // Assert
    const [span] = exporter.getFinishedSpans();
    expect(span).toBeDefined();
    const attributes = JSON.stringify(span?.attributes);
    expect(attributes).not.toContain('203.0.113.7');
    expect(attributes).not.toContain('TestBrowser');
    expect(span?.attributes).not.toHaveProperty('network.peer.address');
  });

  it('should not trace the health check of Cloud Run', async () => {
    // Arrange
    exporter.reset();

    // Act
    await fetch(`${url}/health`);

    // Assert
    expect(exporter.getFinishedSpans()).toEqual([]);
  });
});
