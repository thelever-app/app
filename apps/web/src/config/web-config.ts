/** What changes from one environment to another; the deployment writes it as /config.json. */
export interface WebConfig {
  /** The room server, on its own domain because Firebase Hosting does not proxy WebSockets. */
  readonly realtimeUrl: string;
}

/**
 * Reads /config.json, so the same build runs in every environment: the deployment of each one
 * writes its own file next to the build.
 */
export async function loadWebConfig(fetchConfig: typeof fetch = fetch): Promise<WebConfig> {
  const response = await fetchConfig('/config.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`/config.json answered ${response.status}`);

  const { realtimeUrl } = (await response.json()) as { realtimeUrl?: unknown };
  if (typeof realtimeUrl !== 'string' || !URL.canParse(realtimeUrl)) {
    throw new Error('/config.json has no valid realtimeUrl');
  }
  const { protocol } = new URL(realtimeUrl);
  if (protocol !== 'ws:' && protocol !== 'wss:') {
    throw new Error('realtimeUrl in /config.json is not a WebSocket URL');
  }
  return { realtimeUrl };
}
