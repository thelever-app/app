import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import {
  CONTRACT_VERSION,
  CreateRoomResponseDto,
  type GameStateDto,
  ServerMessageDto,
  type ServerMessageDto as ServerMessage,
} from '@thelever-app/protocol';
import { SEED_DILEMMAS } from '@thelever-app/dilemmas/seed';

/**
 * Load test of the room server: many rooms at once, every player answering every round, and the
 * time from a player sending an answer to the news that they answered reaching each of the others,
 * measured in this one process, with one clock. The host moves everyone on from each reveal. `pnpm --filter @thelever-app/tests load`, against the local
 * stack (LOAD_TARGET=local, the default) or dev (LOAD_TARGET=dev, with APP_CHECK_DEBUG_TOKEN).
 */

interface Target {
  readonly realtime: string;
  /** An anonymous ID token for a new player, and the App Check token every call carries, if any. */
  readonly signUp: () => Promise<string>;
  readonly appCheckToken: () => Promise<string | undefined>;
}

/**
 * 3 rooms of 50 by default, 150 sockets, within the 500 dev takes today; LOAD_ROOMS=50 for the
 * whole of the requirement, once the room server is sized for it.
 */
const ROOMS = Number(process.env.LOAD_ROOMS ?? 3);
const PLAYERS = Number(process.env.LOAD_PLAYERS ?? 50);
/** How long a player reads, votes and predicts each dilemma, at random within this range, within its minute. */
const THINK_MS = [15000, 45000] as const;
/** How long the group comments on each reveal before the host moves on. */
const REVEAL_MS = 5000;
/** How many rooms are set up at once, so the setup does not measure itself. */
const SETUP_IN_PARALLEL = 10;

function localTarget(): Target {
  const auth = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
  return {
    realtime: process.env.LOAD_REALTIME ?? 'http://localhost:3000',
    signUp: () => signUp(`${auth}/accounts:signUp?key=demo-api-key`, {}),
    appCheckToken: async () => undefined,
  };
}

function devTarget(): Target {
  const config = JSON.parse(
    readFileSync(new URL('../../apps/web/config/dev.json', import.meta.url), 'utf8'),
  ) as { realtimeUrl: string; firebase: { apiKey: string; appId: string; projectId: string } };
  const debugToken = process.env.APP_CHECK_DEBUG_TOKEN;
  if (!debugToken) throw new Error('APP_CHECK_DEBUG_TOKEN is not set (see .env)');
  // The browser key only takes calls from the web's own addresses.
  const referer = { Referer: `https://${config.firebase.projectId}.web.app/` };
  const { apiKey, appId, projectId } = config.firebase;
  let appCheck: Promise<string> | undefined;
  return {
    realtime: config.realtimeUrl.replace('wss://', 'https://'),
    signUp: async () =>
      signUp(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
        ...referer,
        'X-Firebase-AppCheck': await (appCheck ??= exchangeDebugToken()),
      }),
    appCheckToken: () => (appCheck ??= exchangeDebugToken()),
  };

  async function exchangeDebugToken(): Promise<string> {
    const response = await fetch(
      `https://firebaseappcheck.googleapis.com/v1/projects/${projectId}/apps/${appId}:exchangeDebugToken?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...referer },
        body: JSON.stringify({ debugToken }),
      },
    );
    if (!response.ok) {
      throw new Error(`exchangeDebugToken ${response.status} ${await response.text()}`);
    }
    return ((await response.json()) as { token: string }).token;
  }
}

async function signUp(url: string, headers: Record<string, string>): Promise<string> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  if (!response.ok) throw new Error(`signUp ${response.status} ${await response.text()}`);
  return ((await response.json()) as { idToken: string }).idToken;
}

const traceparent = () =>
  `00-${randomBytes(16).toString('hex')}-${randomBytes(8).toString('hex')}-01`;

/** A player of the test: their socket, their id once connected, and what they have sent. */
interface LoadPlayer {
  readonly token: string;
  socket?: WebSocket;
  playerId?: string;
  /** The last state of the game the player got. */
  state?: GameStateDto;
  /** Resolves once the player has the state of the game, when the host starts it. */
  started?: Promise<void>;
  /** Called with every new state of the game, to wait for a round or its reveal. */
  onState?: (() => void) | undefined;
}

/** What the run measured. */
const latencies: number[] = [];
const rejections = new Map<string, number>();
let socketFailures = 0;
/** Frames that do not follow the contract: they are counted, never thrown from a listener. */
let unreadableMessages = 0;
let answersSent = 0;
/** When each player sent each answer, by `playerId:position` of the round. */
const sentAt = new Map<string, number>();

async function post<T>(
  target: Target,
  path: string,
  token: string,
  body: unknown,
  parse: (value: unknown) => T,
): Promise<T> {
  const appCheck = await target.appCheckToken();
  const response = await fetch(`${target.realtime}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      traceparent: traceparent(),
      ...(appCheck ? { 'X-Firebase-AppCheck': appCheck } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${path} ${response.status} ${await response.text()}`);
  return parse(await response.json());
}

/** Every player of the load test wears the same avatar: their nicknames already tell them apart. */
const LOAD_AVATAR = { face: 'face-01', color: 'khaki' };

/** Sets up one room with every player in it, in the lobby; returns the room. */
async function setUpRoom(target: Target, players: readonly LoadPlayer[]): Promise<string> {
  const [host, ...others] = players;
  const { roomId } = await post(
    target,
    '/rooms',
    host!.token,
    {
      nickname: 'Host',
      avatar: LOAD_AVATAR,
      groupNature: 'friends',
      place: 'together',
      dilemmaLanguage: 'es',
    },
    (value) => CreateRoomResponseDto.parse(value),
  );
  await Promise.all(
    others.map((player, index) =>
      post(
        target,
        `/rooms/${roomId}/players`,
        player.token,
        { nickname: `P${index}`, avatar: LOAD_AVATAR },
        () => {},
      ),
    ),
  );
  return roomId;
}

/** The host picks every dilemma of the seed, so the game has as many as it can, and starts it. */
function startGame([host]: readonly LoadPlayer[]): void {
  const socket = host!.socket!;
  socket.send(
    JSON.stringify({
      type: 'pick-dilemmas',
      dilemmaIds: SEED_DILEMMAS.map(({ id }) => id),
      traceparent: traceparent(),
    }),
  );
  socket.send(JSON.stringify({ type: 'start-game', traceparent: traceparent() }));
}

/**
 * Connects one player to the room and resolves once they see the lobby; `started` resolves with
 * the state of the game. Every answer of another is timed.
 */
async function connect(target: Target, player: LoadPlayer, roomId: string): Promise<void> {
  const socket = new WebSocket(target.realtime.replace(/^http/, 'ws'));
  player.socket = socket;
  const appCheckToken = await target.appCheckToken();
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener('error', () => {
      socketFailures += 1;
      reject(new Error('socket failed'));
    });
    socket.addEventListener('open', () => {
      socket.send(
        JSON.stringify({
          type: 'connect',
          contractVersion: CONTRACT_VERSION,
          token: player.token,
          ...(appCheckToken ? { appCheckToken } : {}),
          roomId,
          language: 'es',
          traceparent: traceparent(),
        }),
      );
    });
    let gameStarted: () => void = () => {};
    player.started = new Promise((started) => {
      gameStarted = started;
    });
    socket.addEventListener('message', ({ data }) => {
      const message = readMessage(data);
      if (!message) return;
      if (message.type === 'room-state') {
        player.playerId = message.playerId;
        resolve();
      } else if (message.type === 'game-state') {
        player.state = message;
        gameStarted();
        player.onState?.();
      } else if (message.type === 'player-answered') {
        const at = sentAt.get(`${message.playerId}:${player.state?.round.position}`);
        if (at !== undefined) latencies.push(performance.now() - at);
      } else if (message.type === 'error') {
        rejections.set(message.code, (rejections.get(message.code) ?? 0) + 1);
        if (message.command === 'connect') reject(new Error(`connect rejected: ${message.code}`));
      }
    });
  });
}

function readMessage(data: unknown): ServerMessage | undefined {
  try {
    return ServerMessageDto.parse(JSON.parse(String(data)));
  } catch {
    unreadableMessages += 1;
    return undefined;
  }
}

/** Resolves once the last state of the game the player got is such. */
function until(player: LoadPlayer, reached: (state: GameStateDto) => boolean): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      if (!player.state || !reached(player.state)) return;
      player.onState = undefined;
      resolve();
    };
    player.onState = check;
    check();
  });
}

/**
 * Answers every round in full, thinking a while before each one: the vote and, in this nominal
 * room, every prediction. The host moves everyone on from each reveal, but the last.
 */
async function play(player: LoadPlayer, isHost: boolean): Promise<void> {
  const { dilemmas } = player.state!;
  for (const [position, dilemma] of dilemmas.entries()) {
    await until(player, ({ round }) => round.position === position);
    const [min, max] = THINK_MS;
    await new Promise((resolve) => setTimeout(resolve, min + Math.random() * (max - min)));
    const vote = dilemma.options[0]!.optionId;
    sentAt.set(`${player.playerId}:${position}`, performance.now());
    answersSent += 1;
    player.socket!.send(
      JSON.stringify({
        type: 'answer-dilemma',
        dilemmaId: dilemma.dilemmaId,
        vote,
        votePredictions: player.state!.playersToPredict.map((playerId) => ({ playerId, vote })),
        traceparent: traceparent(),
      }),
    );
    await until(player, ({ round }) => round.position === position && round.phase === 'reveal');
    if (!isHost || position === dilemmas.length - 1) continue;
    await new Promise((resolve) => setTimeout(resolve, REVEAL_MS));
    player.socket!.send(
      JSON.stringify({ type: 'move-on', fromPosition: position, traceparent: traceparent() }),
    );
  }
}

function percentile(sorted: readonly number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] ?? NaN;
}

const target = process.env.LOAD_TARGET === 'dev' ? devTarget() : localTarget();
const started = performance.now();

// The same players fill every room: an identity is only once in each room.
const tokens = await Promise.all(Array.from({ length: PLAYERS }, () => target.signUp()));
const rooms = Array.from({ length: ROOMS }, () => tokens.map((token): LoadPlayer => ({ token })));
const roomIds: string[] = [];
for (let index = 0; index < rooms.length; index += SETUP_IN_PARALLEL) {
  roomIds.push(
    ...(await Promise.all(
      rooms.slice(index, index + SETUP_IN_PARALLEL).map((players) => setUpRoom(target, players)),
    )),
  );
}
console.log(`set up ${ROOMS} rooms of ${PLAYERS} in ${Math.round(performance.now() - started)} ms`);

await Promise.all(
  rooms.flatMap((players, room) =>
    players.map((player) => connect(target, player, roomIds[room]!)),
  ),
);
console.log(`connected ${ROOMS * PLAYERS} sockets`);
for (const players of rooms) startGame(players);
await Promise.all(rooms.flat().map((player) => player.started));
console.log(`started ${ROOMS} games`);

const playing = performance.now();
await Promise.all(
  rooms.flatMap((players) => players.map((player, index) => play(player, index === 0))),
);
// Room for the last answers to be heard.
await new Promise((resolve) => setTimeout(resolve, 3000));
for (const player of rooms.flat()) player.socket?.close();

const sorted = [...latencies].sort((a, b) => a - b);
const expected = answersSent * (PLAYERS - 1);
console.log(
  JSON.stringify(
    {
      target: process.env.LOAD_TARGET ?? 'local',
      rooms: ROOMS,
      playersPerRoom: PLAYERS,
      sockets: ROOMS * PLAYERS,
      socketFailures,
      unreadableMessages,
      answersSent,
      deliveries: { expected, received: latencies.length },
      latencyMs: {
        p50: Math.round(percentile(sorted, 50)),
        p95: Math.round(percentile(sorted, 95)),
        p99: Math.round(percentile(sorted, 99)),
        max: Math.round(sorted.at(-1) ?? NaN),
      },
      rejections: Object.fromEntries(rejections),
      playingSeconds: Math.round((performance.now() - playing) / 1000),
    },
    null,
    2,
  ),
);
