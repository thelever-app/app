import type { AddressInfo } from 'node:net';
import { SEED_DILEMMAS } from '@thelever-app/dilemmas/seed';
import {
  CONTRACT_VERSION,
  ServerMessageDto,
  type ClientMessageDto,
  type ServerMessageDto as ServerMessage,
} from '@thelever-app/protocol';
import WebSocket from 'ws';
import { composeRealtimeServer } from '../../composition.ts';
import type { TokenVerifier } from '../../identity/token-verifier.ts';
import { FakeTokenVerifier, tokenOf } from './fake-token-verifier.ts';

/** The HTTP server of the room server, as the composition root builds it but with the fake token verifier. */
export async function composedHttpServer() {
  const { http } = await composeRealtimeServer({
    tokenVerifier: new FakeTokenVerifier(),
    pingIntervalMs: 30_000,
  });
  return http;
}

/** The token header of an identity, as the fake verifier understands it. */
export function bearer(identity: string): string {
  return `Bearer ${tokenOf(identity)}`;
}

/** The room server, as the composition root builds it but with the fake token verifier, on a free port. */
export async function startRoomServer({
  pingIntervalMs = 30_000,
  tokenVerifier = new FakeTokenVerifier() as TokenVerifier,
} = {}) {
  const { http: server, sockets } = await composeRealtimeServer({ tokenVerifier, pingIntervalMs });
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
  };
}

async function post(url: string, identity: string, body: object): Promise<Record<string, string>> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenOf(identity)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return (await response.json()) as Record<string, string>;
}

/** Ana hosts a room with Luis and Marta, and the game is in the decision phase, with the seed dilemmas. */
export async function gameInDecisionPhase(http: string) {
  const { roomId } = await post(`${http}/rooms`, 'ana', { nickname: 'Ana' });
  await post(`${http}/rooms/${roomId}/players`, 'luis', { nickname: 'Luis' });
  await post(`${http}/rooms/${roomId}/players`, 'marta', { nickname: 'Marta' });
  const { gameId } = await post(`${http}/rooms/${roomId}/games`, 'ana', {
    dilemmaIds: SEED_DILEMMAS.map(({ id }) => id),
  });
  return { roomId: roomId!, gameId: gameId! };
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

  /** Opens a client and connects it to the game as `identity`, then waits for its game state. */
  static async connected(url: string, identity: string, gameId: string): Promise<TestClient> {
    const client = await TestClient.open(url);
    client.send({
      type: 'connect',
      contractVersion: CONTRACT_VERSION,
      token: tokenOf(identity),
      gameId,
      language: 'es',
    });
    await client.next('game-state');
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
