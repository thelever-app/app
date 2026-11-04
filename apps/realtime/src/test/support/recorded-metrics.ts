import { metrics } from '@opentelemetry/api';
import {
  AggregationTemporality,
  InMemoryMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader,
  type DataPoint,
} from '@opentelemetry/sdk-metrics';
import { afterAll, beforeAll } from 'vitest';

/** Records the metrics the tests of a file make, as the SDK does on Cloud Run but in memory. */
export function recordMetrics(): {
  /** The points of that metric, read now. */
  readonly pointsOf: (name: string) => Promise<readonly DataPoint<unknown>[]>;
} {
  const exporter = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
  const reader = new PeriodicExportingMetricReader({ exporter, exportIntervalMillis: 60_000 });

  beforeAll(() => {
    metrics.setGlobalMeterProvider(new MeterProvider({ readers: [reader] }));
  });

  afterAll(() => metrics.disable());

  return {
    pointsOf: async (name) => {
      await reader.forceFlush();
      const metric = exporter
        .getMetrics()
        .at(-1)
        ?.scopeMetrics.flatMap(({ metrics: all }) => all)
        .find(({ descriptor }) => descriptor.name === name);
      exporter.reset();
      return metric?.dataPoints ?? [];
    },
  };
}
