import type { AddressInfo } from 'node:net';
import { ConsoleLogger, type Logger } from '@thelever-app/db';
import {
  CONTRACT_VERSION,
  ServerMessageDto,
  type ClientMessageDto,
  type ServerMessageDto as ServerMessage,
} from '@thelever-app/protocol';
import WebSocket from 'ws';
import { SEED_DILEMMAS } from '@thelever-app/dilemmas/seed';
import { composeRealtimeServer, type Storage } from '../../composition/index.ts';
import { type AccessGate, OpenAccess } from '../../identity/access-gate.ts';
import { type AppCheckVerifier, UncheckedAppCheck } from '../../identity/app-check-verifier.ts';
import type { TokenVerifier } from '../../identity/token-verifier.ts';
import { FakeTokenVerifier, tokenOf } from './fake-token-verifier.ts';

/** The origin of the web in the tests, which may read the answers of the HTTP routes. */
export const WEB_ORIGIN = 'http://localhost:5173';

/** What a test room is created with when the test does not say. */
export const ROOM_CHOICES = {
  avatar: { face: 'face-01', color: 'khaki' },
  groupNature: 'friends',
  place: 'together',
  dilemmaLanguage: 'es',
};

/** The avatar every test player chooses before joining, which nobody else with their nickname has. */
export const JOIN_AVATAR = { face: 'face-02', color: 'teal' };

/** The HTTP server of the room server, as the composition root builds it but with the fake token verifier. */
export async function composedHttpServer() {
  const { http } = await composeRealtimeServer({
    tokenVerifier: new FakeTokenVerifier(),
    appCheckVerifier: new UncheckedAppCheck(),
    accessGate: new OpenAccess(),
    pingIntervalMs: 30_000,
    storage: { kind: 'memory' },
    logger: new ConsoleLogger(),
    webOrigins: [WEB_ORIGIN],
  });
  return http;
}

/** The token header of an identity, as the fake verifier understands it. */
export function bearer(identity: string): string {
  return `Bearer ${tokenOf(identity)}`;
}

/**
 * The room server, as the composition root builds it but with the fake token verifier, on a free port;
 * in memory unless it is given another storage.
 */
export async function startRoomServer({
  pingIntervalMs = 30_000,
  tokenVerifier = new FakeTokenVerifier() as TokenVerifier,
  appCheckVerifier = new UncheckedAppCheck() as AppCheckVerifier,
  accessGate = new OpenAccess() as AccessGate,
  storage = { kind: 'memory' } as Storage,
  logger = new ConsoleLogger() as Logger,
} = {}) {
  const composed = await composeRealtimeServer({
    tokenVerifier,
    appCheckVerifier,
    accessGate,
    pingIntervalMs,
    storage,
    logger,
    webOrigins: [WEB_ORIGIN],
  });
  const { http: server, sockets } = composed;
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `ws://localhost:${port}`,
    http: `http://localhost:${port}`,
    /** How many sockets the server still has open: a socket leaves as soon as the server handles its close. */
    openSockets: () => sockets.clients.size,
    async stop() {
      for (const client of sockets.clients) client.terminate();
      await new Promise((resolve) => sockets.close(resolve));
      await new Promise((resolve) => server.close(resolve));
    },
    /** Leaves as on SIGTERM. */
    shutdown: () => composed.shutdown(),
    /** Stops at once, as a process that dies would. */
    close: () => composed.close(),
  };
}

export async function post(
  url: string,
  identity: string,
  body: object,
): Promise<Record<string, string>> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenOf(identity)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return (await response.json()) as Record<string, string>;
}

/** Ana hosts a room with Luis and Marta, all of them in the lobby and nobody connected. */
export async function lobbyOfThree(http: string) {
  const { roomId, code } = await post(`${http}/rooms`, 'ana', { nickname: 'Ana', ...ROOM_CHOICES });
  await post(`${http}/rooms/${roomId}/players`, 'luis', { nickname: 'Luis', avatar: JOIN_AVATAR });
  await post(`${http}/rooms/${roomId}/players`, 'marta', {
    nickname: 'Marta',
    avatar: JOIN_AVATAR,
  });
  return { roomId: roomId!, code: code! };
}

/**
 * The same lobby, and Ana has picked the seed dilemmas and started the game from her socket, which
 * then closed: the game is in the decision phase and nobody is connected. It returns the dilemmas
 * in the order the game plays them, which the server shuffles.
 */
export async function gameInDecisionPhase(server: {
  readonly url: string;
  readonly http: string;
  readonly openSockets: () => number;
}) {
  const { roomId } = await lobbyOfThree(server.http);
  const ana = await TestClient.connected(server.url, 'ana', roomId, 'room-state');
  // Anonymous, so an answer is only the vote.
  ana.send({ type: 'change-settings', changes: { variant: 'anonymous' } });
  await ana.next('room-state');
  ana.send({ type: 'pick-dilemmas', dilemmaIds: SEED_DILEMMAS.map(({ id }) => id) });
  await ana.next('room-state');
  ana.send({ type: 'start-game' });
  const { gameId, dilemmas } = await ana.next('game-state');
  const before = server.openSockets();
  ana.socket.close();
  await ana.closed();
  while (server.openSockets() >= before) await new Promise((resolve) => setTimeout(resolve, 5));
  return { roomId, gameId, dilemmas };
}

/** A client of the room server that keeps every message it receives, already validated. */
export class TestClient {
  readonly received: ServerMessage[] = [];
  readonly socket: WebSocket;
  readonly #waiters: (() => void)[] = [];

  private constructor(socket: WebSocket) {
    this.socket = socket;
    socket.on('message', (data) => {
      this.received.push(ServerMessageDto.parse(JSON.parse(String(data))));
      for (const wake of this.#waiters.splice(0)) wake();
    });
  }

  static async open(url: string, options: WebSocket.ClientOptions = {}): Promise<TestClient> {
    const socket = new WebSocket(url, options);
    await new Promise((resolve, reject) => {
      socket.once('open', resolve);
      socket.once('error', reject);
    });
    return new TestClient(socket);
  }

  /**
   * Opens a client and connects it to the room as `identity`, then waits for the state it gets
   * first: that of the game in progress, unless told otherwise.
   */
  static async connected(
    url: string,
    identity: string,
    roomId: string,
    first: 'game-state' | 'room-state' = 'game-state',
  ): Promise<TestClient> {
    const client = await TestClient.open(url);
    client.send({
      type: 'connect',
      contractVersion: CONTRACT_VERSION,
      token: tokenOf(identity),
      roomId,
      language: 'es',
    });
    await client.next(first);
    return client;
  }

  send(message: ClientMessageDto | object | string): void {
    this.socket.send(typeof message === 'string' ? message : JSON.stringify(message));
  }

  /** Waits for the next message of that type that has not been waited for yet. */
  async next<T extends ServerMessage['type']>(
    type: T,
    timeoutMs = 2000,
  ): Promise<Extract<ServerMessage, { type: T }>> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const index = this.received.findIndex((message) => message.type === type);
      if (index !== -1) {
        return this.received.splice(index, 1)[0] as Extract<ServerMessage, { type: T }>;
      }
      if (Date.now() > deadline) throw new Error(`no ${type} message arrived`);
      await new Promise<void>((resolve) => {
        this.#waiters.push(resolve);
        setTimeout(resolve, 20);
      });
    }
  }

  async closed(): Promise<void> {
    if (this.socket.readyState === WebSocket.CLOSED) return;
    await new Promise((resolve) => this.socket.once('close', resolve));
  }
}
