import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser } from 'playwright';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
/** The port of apps/web/public/config.json, which the build copies to dist: the web looks there. */
const REALTIME_PORT = 3000;
const WEB_PORT = 4173;
const READY_TIMEOUT_MS = 30_000;

/**
 * The system the e2e scenarios play against, all of it on this machine: the room server, the
 * built web and a browser. The Auth emulator runs outside, around the whole test run.
 */
export interface E2eStack {
  readonly browser: Browser;
  /** Where the room server listens, for HTTP. */
  readonly realtimeUrl: string;
  /** Where the built web is served. */
  readonly webUrl: string;
}

let running: { readonly stack: E2eStack; readonly processes: readonly ChildProcess[] } | undefined;

export async function startE2eStack(): Promise<void> {
  const authEmulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!authEmulator) throw new Error('No Auth emulator: run the e2e profile with pnpm test:e2e');

  const realtimeUrl = `http://localhost:${REALTIME_PORT}`;
  const webUrl = `http://localhost:${WEB_PORT}`;
  const processes = [
    start('node', ['apps/realtime/src/server.ts'], {
      PORT: String(REALTIME_PORT),
      FIREBASE_PROJECT_ID: 'demo-thelever',
      FIREBASE_AUTH_EMULATOR_HOST: authEmulator,
    }),
    start('pnpm', [
      '--filter',
      '@thelever-app/web',
      'exec',
      'vite',
      'preview',
      '--port',
      String(WEB_PORT),
      '--strictPort',
    ]),
  ];
  try {
    await Promise.all([ready(`${realtimeUrl}/health`), ready(webUrl)]);
    const browser = await chromium.launch();
    running = { stack: { browser, realtimeUrl, webUrl }, processes };
  } catch (error) {
    for (const child of processes) stop(child);
    throw error;
  }
}

export async function stopE2eStack(): Promise<void> {
  if (!running) return;
  const { stack, processes } = running;
  running = undefined;
  await stack.browser.close();
  for (const child of processes) stop(child);
}

/** The stack a scenario plays against, once the test run has started it. */
export function e2eStack(): E2eStack {
  if (!running) throw new Error('The e2e stack is not running');
  return running.stack;
}

/** In a group of its own, so stopping it also stops what it started, as pnpm starts vite. */
function start(command: string, args: string[], env: Record<string, string> = {}): ChildProcess {
  return spawn(command, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    detached: true,
    stdio: ['ignore', 'ignore', 'inherit'],
  });
}

function stop(child: ChildProcess): void {
  if (child.pid === undefined || child.exitCode !== null) return;
  process.kill(-child.pid, 'SIGTERM');
}

async function ready(url: string): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`${url} did not answer in ${READY_TIMEOUT_MS / 1000} s`);
}
