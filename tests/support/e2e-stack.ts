import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  ConsoleLogger,
  type Database,
  migrateToLatest,
  openDatabase,
  PostgresDilemmaRepository,
} from '@thelever-app/db';
import { onServer, urlOf } from '@thelever-app/db/test';
import { loadSeedDilemmas } from '@thelever-app/dilemmas/seed';
import { chromium, type Browser } from 'playwright';
import { loadTestDilemmas } from './test-catalog.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
/**
 * The port of apps/web/public/config.json, which the build copies to dist: the web looks there.
 * Another one with E2E_REALTIME_PORT, when a room server for development already takes it; the
 * browsers of the scenarios are then pointed at it.
 */
const REALTIME_PORT = Number(process.env.E2E_REALTIME_PORT ?? 3000);
const WEB_PORT = 4173;
const READY_TIMEOUT_MS = 30_000;
/** Locally, DATABASE_URL comes from the .env of the repo; in CI, from the workflow. */
const ENV_FILE = `${ROOT}.env`;

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
  /** The database of the run, to read what the game keeps. */
  readonly databaseUrl: string;
  /** The Auth emulator, to sign in the players the scenario brings in without a screen. */
  readonly authEmulatorHost: string;
}

let running:
  | {
      readonly stack: E2eStack;
      readonly processes: readonly ChildProcess[];
      readonly database: string;
    }
  | undefined;

/**
 * A database of its own for the run, migrated and with the seed dilemmas, as the migrate job
 * leaves one, and the test data the scenarios check.
 */
async function createE2eDatabase(): Promise<string> {
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
  const name = `thelever_e2e_${randomUUID().replaceAll('-', '')}`;
  await onServer((quote) => `CREATE DATABASE ${quote(name)}`);
  const { db, close } = await openDatabase<Database>(
    { kind: 'url', url: urlOf(name) },
    { maxConnections: 1, logger: new ConsoleLogger() },
  );
  try {
    await migrateToLatest(db);
    await loadSeedDilemmas(new PostgresDilemmaRepository(db));
    await loadTestDilemmas(new PostgresDilemmaRepository(db));
  } finally {
    await close();
  }
  return name;
}

async function dropE2eDatabase(name: string): Promise<void> {
  await onServer((quote) => `DROP DATABASE IF EXISTS ${quote(name)} WITH (FORCE)`);
}

export async function startE2eStack(): Promise<void> {
  const authEmulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!authEmulator) throw new Error('No Auth emulator: run the e2e profile with pnpm test:e2e');

  const realtimeUrl = `http://localhost:${REALTIME_PORT}`;
  const webUrl = `http://localhost:${WEB_PORT}`;
  const database = await createE2eDatabase();
  const processes = [
    start('node', ['apps/realtime/src/server.ts'], {
      PORT: String(REALTIME_PORT),
      FIREBASE_PROJECT_ID: 'demo-thelever',
      FIREBASE_AUTH_EMULATOR_HOST: authEmulator,
      DATABASE_URL: urlOf(database),
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
    running = {
      stack: {
        browser,
        realtimeUrl,
        webUrl,
        databaseUrl: urlOf(database),
        authEmulatorHost: authEmulator,
      },
      processes,
      database,
    };
  } catch (error) {
    await Promise.all(processes.map(stop));
    await dropE2eDatabase(database);
    throw error;
  }
}

export async function stopE2eStack(): Promise<void> {
  if (!running) return;
  const { stack, processes, database } = running;
  running = undefined;
  await stack.browser.close();
  await Promise.all(processes.map(stop));
  await dropE2eDatabase(database);
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

/** Sends SIGTERM to the group and waits until the process exits, as the room server first leaves cleanly. */
async function stop(child: ChildProcess): Promise<void> {
  if (child.pid === undefined || child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once('exit', resolve));
  process.kill(-child.pid, 'SIGTERM');
  await exited;
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
