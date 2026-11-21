import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';

/**
 * Applies the log-based metrics, the dashboard and the alert policies of the room server to one
 * environment, with the credentials of whoever runs it: `node ops/monitoring/apply.ts dev`. Each
 * one is found by its name, or its display name, and updated, or created if it does not exist
 * yet, so running it again changes only what changed here. The log-based metrics go first, so
 * their alerts exist before their first log line. An alert on a metric of the room server that
 * does not exist yet is skipped, and created by a later run. The alerts go by email to the owner
 * of the projects.
 */

const ALERTS_EMAIL = 'devopsrdc@gmail.com';
const MONITORING = 'https://monitoring.googleapis.com';
const LOGGING = 'https://logging.googleapis.com';

const environment = process.argv[2];
if (environment !== 'dev' && environment !== 'prod') {
  throw new Error('usage: node ops/monitoring/apply.ts dev|prod');
}
const project = `thelever-app-${environment}`;
const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();

interface Named {
  readonly name: string;
  readonly displayName: string;
}

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-goog-user-project': project,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`${method} ${url}: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
}

function read(file: string): Record<string, unknown> & { readonly displayName: string } {
  return JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8')) as Record<
    string,
    unknown
  > & { readonly displayName: string };
}

async function emailChannel(): Promise<string> {
  const { notificationChannels = [] } = await call<{
    notificationChannels?: (Named & { labels: { email_address?: string } })[];
  }>('GET', `${MONITORING}/v3/projects/${project}/notificationChannels?filter=type%3D%22email%22`);
  const existing = notificationChannels.find(({ labels }) => labels.email_address === ALERTS_EMAIL);
  if (existing) return existing.name;
  const created = await call<Named>(
    'POST',
    `${MONITORING}/v3/projects/${project}/notificationChannels`,
    {
      type: 'email',
      displayName: `Alerts to ${ALERTS_EMAIL}`,
      labels: { email_address: ALERTS_EMAIL },
    },
  );
  return created.name;
}

/** Each log-based metric is created, or updated if it exists: PUT does both. */
async function applyMetrics(): Promise<void> {
  const files = readdirSync(new URL('./metrics/', import.meta.url)).filter((file) =>
    file.endsWith('.json'),
  );
  for (const file of files.sort()) {
    const metric = JSON.parse(
      readFileSync(new URL(`./metrics/${file}`, import.meta.url), 'utf8'),
    ) as Record<string, unknown> & { readonly name: string };
    await call('PUT', `${LOGGING}/v2/projects/${project}/metrics/${metric.name}`, metric);
    console.log(`applied log-based metric "${metric.name}"`);
  }
}

async function applyDashboard(): Promise<void> {
  const dashboard = read('./dashboard.json');
  const { dashboards = [] } = await call<{ dashboards?: (Named & { etag: string })[] }>(
    'GET',
    `${MONITORING}/v1/projects/${project}/dashboards`,
  );
  const existing = dashboards.find(({ displayName }) => displayName === dashboard.displayName);
  if (existing) {
    // The etag of the version it replaces, so an edit made meanwhile is not lost without a word.
    await call('PATCH', `${MONITORING}/v1/${existing.name}`, {
      ...dashboard,
      name: existing.name,
      etag: existing.etag,
    });
    console.log(`updated dashboard "${dashboard.displayName}"`);
  } else {
    await call('POST', `${MONITORING}/v1/projects/${project}/dashboards`, dashboard);
    console.log(`created dashboard "${dashboard.displayName}"`);
  }
}

async function applyAlerts(channel: string): Promise<void> {
  const { alertPolicies = [] } = await call<{ alertPolicies?: Named[] }>(
    'GET',
    `${MONITORING}/v3/projects/${project}/alertPolicies`,
  );
  const files = readdirSync(new URL('./alerts/', import.meta.url)).filter((file) =>
    file.endsWith('.json'),
  );
  for (const file of files.sort()) {
    const policy = withChannel(read(`./alerts/${file}`), channel);
    const existing = alertPolicies.find(({ displayName }) => displayName === policy.displayName);
    try {
      await applyAlert(policy, existing);
    } catch (error) {
      if (!isMissingMetric(error)) throw error;
      // A metric exists once the room server first records it: the first game, the first error.
      console.log(`skipped alert "${policy.displayName}": its metric does not exist yet`);
    }
  }
}

async function applyAlert(
  policy: { readonly displayName: string },
  existing: Named | undefined,
): Promise<void> {
  if (existing) {
    await call('PATCH', `${MONITORING}/v3/${existing.name}`, { ...policy, name: existing.name });
    console.log(`updated alert "${policy.displayName}"`);
  } else {
    await call('POST', `${MONITORING}/v3/projects/${project}/alertPolicies`, policy);
    console.log(`created alert "${policy.displayName}"`);
  }
}

/** The policy sends its notifications, and those it repeats, to the email of the alerts. */
function withChannel<Policy extends { readonly displayName: string }>(
  policy: Policy & { readonly alertStrategy?: { readonly notificationChannelStrategy?: object[] } },
  channel: string,
): Policy {
  const strategy = policy.alertStrategy;
  return {
    ...policy,
    notificationChannels: [channel],
    ...(strategy?.notificationChannelStrategy && {
      alertStrategy: {
        ...strategy,
        notificationChannelStrategy: strategy.notificationChannelStrategy.map((each) => ({
          ...each,
          notificationChannelNames: [channel],
        })),
      },
    }),
  };
}

/** Cloud Monitoring refuses an alert on a metric that no one has written yet. */
function isMissingMetric(error: unknown): boolean {
  return error instanceof Error && error.message.includes('Cannot find metric');
}

const channel = await emailChannel();
await applyMetrics();
await applyDashboard();
await applyAlerts(channel);
