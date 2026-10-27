/** The Firebase project of the environment. The apiKey identifies the project; it is not a secret. */
export interface FirebaseWebConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly appId: string;
}

/** What changes from one environment to another; the deployment writes it as /config.json. */
export interface WebConfig {
  /** The room server, on its own domain because Firebase Hosting does not proxy WebSockets. */
  readonly realtimeUrl: string;
  readonly firebase: FirebaseWebConfig;
  /** Only in local development: the Auth emulator the player signs in against. */
  readonly authEmulatorUrl?: string;
}

const FIREBASE_KEYS = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;

/**
 * Reads /config.json, so the same build runs in every environment: the deployment of each one
 * writes its own file next to the build.
 */
export async function loadWebConfig(fetchConfig: typeof fetch = fetch): Promise<WebConfig> {
  const response = await fetchConfig('/config.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`/config.json answered ${response.status}`);

  const raw = (await response.json()) as Record<string, unknown>;
  const realtimeUrl = urlWithProtocol(raw.realtimeUrl, ['ws:', 'wss:'], 'realtimeUrl');
  const firebase = firebaseConfig(raw.firebase);
  if (raw.authEmulatorUrl === undefined) return { realtimeUrl, firebase };

  const authEmulatorUrl = urlWithProtocol(raw.authEmulatorUrl, ['http:'], 'authEmulatorUrl');
  return { realtimeUrl, firebase, authEmulatorUrl };
}

function urlWithProtocol(value: unknown, protocols: readonly string[], name: string): string {
  if (typeof value !== 'string' || !URL.canParse(value)) {
    throw new Error(`/config.json has no valid ${name}`);
  }
  if (!protocols.includes(new URL(value).protocol)) {
    throw new Error(`${name} in /config.json must use ${protocols.join(' or ')}`);
  }
  return value;
}

function firebaseConfig(value: unknown): FirebaseWebConfig {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  const missing = FIREBASE_KEYS.filter((key) => typeof raw[key] !== 'string' || raw[key] === '');
  if (missing.length > 0) {
    throw new Error(`/config.json has no firebase.${missing.join(', firebase.')}`);
  }
  return Object.fromEntries(
    FIREBASE_KEYS.map((key) => [key, raw[key]]),
  ) as unknown as FirebaseWebConfig;
}
