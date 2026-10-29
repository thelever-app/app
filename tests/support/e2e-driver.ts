import { SEED_DILEMMAS } from '@thelever-app/dilemmas/seed';
import {
  ClientMessageDto,
  CreateRoomResponseDto,
  JoinRoomResponseDto,
  ServerMessageDto,
  StartGameResponseDto,
  type GameStateDto,
} from '@thelever-app/protocol';
import { isDeepStrictEqual } from 'node:util';
import type { BrowserContext, Page, WebSocketRoute } from 'playwright';
import type { GameDriver } from './driver.ts';
import type { E2eStack } from './e2e-stack.ts';

/** Test data: the dilemmas of the seed, which the room server loads, in the order of the game. */
const DILEMMA_IDS = SEED_DILEMMAS.map(({ id }) => id);

/** What the driver looks for on screen, in the language of the browsers: es.json of the web. */
const SCREEN = {
  position: /Dilema (\d+) de \d+/,
  group: 'Progreso del grupo',
  progressCount: /(\d+)\/\d+/,
  showAll: 'Ver todos',
  close: 'Cerrar',
  disconnected: 'desconectado',
  back: 'Volver al dilema anterior',
  continue: 'Continuar',
} as const;

/** The narrowest phone the web supports: every scenario plays on it. */
const PHONE = { width: 320, height: 640 };
const WAIT_TIMEOUT_MS = 10_000;
/** Long enough for the longest wait between two attempts to reconnect, 10 s, and the attempt itself. */
const RECONNECTION_TIMEOUT_MS = 15_000;

/** One player of the scenario, with a browser context of their own: their own session and storage. */
interface E2ePlayer {
  readonly nickname: string;
  readonly context: BrowserContext;
  readonly page: Page;
  playerId: string | undefined;
  /** Every message the page sent to the room server, in order. */
  readonly sent: ClientMessageDto[];
  /** Every message the room server sent to the page, in order. */
  readonly received: ServerMessageDto[];
  /** The socket of the page and its other end at the room server, while both are open. */
  link: { readonly page: WebSocketRoute; readonly server: WebSocketRoute } | undefined;
  /** While false, the page cannot reach the room server, as with no network. */
  online: boolean;
}

/**
 * Drives the built web in a browser per player, against the room server and the Auth emulator.
 * Players act on screen and the driver reads what they see on screen; what they receive, it reads
 * from the socket of their page, which it sits on to cut it as a network would.
 *
 * Each action waits until its effect has reached every open screen, so a step that reads after it
 * does not race the room server.
 */
export class E2eDriver implements GameDriver {
  readonly #stack: E2eStack;
  /** In the order the scenario introduced them: the host first. */
  readonly #players = new Map<string, E2ePlayer>();
  /** The votes each player cast, in order, to look for them where they must not be. */
  readonly #votes = new Map<string, { readonly dilemmaId: string; readonly vote: string }[]>();
  #roomId: string | undefined;

  constructor(stack: E2eStack) {
    this.#stack = stack;
  }

  /** The screen of each player, to check what any player sees. */
  screens(): Page[] {
    return [...this.#players.values()].map(({ page }) => page);
  }

  async start(): Promise<void> {
    // Nothing to prepare: each player opens their browser when the scenario introduces them.
  }

  async stop(): Promise<void> {
    await Promise.all([...this.#players.values()].map(({ context }) => context.close()));
  }

  async hostRoom(host: string, players: string[]): Promise<void> {
    const [hostPlayer, ...others] = await Promise.all(
      [host, ...players].map((nickname) => this.#openBrowser(nickname)),
    );
    if (!hostPlayer) throw new Error('The scenario hosts a room without a host');

    const { roomId, playerId } = await this.#post(
      '/rooms',
      hostPlayer,
      { nickname: host },
      CreateRoomResponseDto,
    );
    this.#roomId = roomId;
    hostPlayer.playerId = playerId;
    for (const player of others) {
      const joined = await this.#post(
        `/rooms/${roomId}/players`,
        player,
        { nickname: player.nickname },
        JoinRoomResponseDto,
      );
      player.playerId = joined.playerId;
    }
  }

  async startDecisionPhase(): Promise<void> {
    const [host] = this.#players.values();
    if (!this.#roomId || !host) {
      throw new Error('The scenario starts the decision phase without a room');
    }

    const { gameId } = await this.#post(
      `/rooms/${this.#roomId}/games`,
      host,
      { dilemmaIds: DILEMMA_IDS },
      StartGameResponseDto,
    );
    // Every player opens the game, as they would from the link the host shares.
    await Promise.all(
      [...this.#players.values()].map(async (player) => {
        player.sent.length = 0;
        player.received.length = 0;
        await player.page.goto(`${this.#stack.webUrl}/games/${gameId}`);
        await player.page.getByText(SCREEN.position).waitFor();
      }),
    );
    for (const player of this.#players.values()) {
      await this.#untilOthersHear(player, 'is connected', ({ connected }) => connected);
    }
  }

  /** Answers the first `count` dilemmas of the game, in order, with their first option. */
  async answerDilemmas(player: string, count: number): Promise<void> {
    const screen = this.#playerCalled(player);
    for (const dilemmaId of DILEMMA_IDS.slice(0, count)) {
      const [first] = this.#dilemmaOn(screen, dilemmaId).options;
      if (!first) throw new Error(`The dilemma ${dilemmaId} has no options`);
      await this.#answer(screen, dilemmaId, first.optionId);
    }
  }

  async changeVote(player: string, position: number): Promise<void> {
    const screen = this.#playerCalled(player);
    const dilemmaId = this.#dilemmaIdAt(position);
    const [previous] = (await this.votesCastFor(player, position)).slice(-1);
    if (!previous) throw new Error(`The scenario changes a vote ${player} never cast`);
    const other = this.#dilemmaOn(screen, dilemmaId).options.find(
      ({ optionId }) => optionId !== previous,
    );
    if (!other) throw new Error(`The dilemma ${dilemmaId} has no other option`);

    // Back one dilemma at a time, as the player would.
    while ((await this.#positionOn(screen.page)) > position) {
      await screen.page.getByRole('button', { name: SCREEN.back }).click();
    }
    await this.#answer(screen, dilemmaId, other.optionId);
  }

  async votesCastFor(player: string, position: number): Promise<string[]> {
    const dilemmaId = this.#dilemmaIdAt(position);
    return (this.#votes.get(player) ?? [])
      .filter((cast) => cast.dilemmaId === dilemmaId)
      .map(({ vote }) => vote);
  }

  /** What the room server last told `player` it keeps for them. */
  async voteRecordedFor(player: string, position: number): Promise<string | undefined> {
    const dilemmaId = this.#dilemmaIdAt(position);
    return lastStateOf(this.#playerCalled(player))?.answers.find(
      (answer) => answer.dilemmaId === dilemmaId,
    )?.vote;
  }

  /** What the room server last told `player` it keeps for them, in the order of the dilemmas. */
  async votesRecordedFor(player: string): Promise<string[]> {
    const answers = lastStateOf(this.#playerCalled(player))?.answers ?? [];
    return answers
      .toSorted((a, b) => DILEMMA_IDS.indexOf(a.dilemmaId) - DILEMMA_IDS.indexOf(b.dilemmaId))
      .map(({ vote }) => vote);
  }

  async disconnect(player: string): Promise<void> {
    const screen = this.#playerCalled(player);
    const { link } = screen;
    if (!link) throw new Error(`The scenario disconnects ${player}, who is not connected`);

    screen.online = false;
    screen.link = undefined;
    link.server.close();
    link.page.close();
    await this.#untilOthersHear(screen, 'is disconnected', ({ connected }) => !connected);
  }

  /** The page connects again by itself, as soon as its next attempt finds the network back. */
  async reconnect(player: string): Promise<void> {
    const screen = this.#playerCalled(player);
    const statesBefore = screen.received.filter(isGameState).length;
    screen.online = true;

    await waitUntil(
      () => screen.received.filter(isGameState).length > statesBefore || undefined,
      `${player} gets a fresh state from the room server`,
      RECONNECTION_TIMEOUT_MS,
    );
    await this.#untilOthersHear(screen, 'is connected', ({ connected }) => connected);
  }

  async dilemmaShownTo(player: string): Promise<number> {
    const { page } = this.#playerCalled(player);
    return steady(() => this.#positionOn(page));
  }

  /** Whether `viewer` sees `player` as connected, in the sheet with the whole group. */
  async connectionSeenBy(viewer: string, player: string): Promise<boolean | undefined> {
    const { page } = this.#playerCalled(viewer);
    await page.getByRole('button', { name: SCREEN.showAll }).click();
    const sheet = page.getByRole('dialog');
    const row = sheet.getByRole('listitem').filter({ hasText: player });
    const text = await steady(async () =>
      (await row.count()) === 0 ? undefined : await row.textContent(),
    );
    await sheet.getByRole('button', { name: SCREEN.close, exact: true }).click();
    await sheet.waitFor({ state: 'hidden' });

    if (text === undefined || text === null) return undefined;
    return !text.includes(SCREEN.disconnected);
  }

  /** The progress of `player` in the strip at the top of the screen of `viewer`. */
  async progressSeenBy(viewer: string, player: string): Promise<number | undefined> {
    const { page } = this.#playerCalled(viewer);
    const row = page
      .getByRole('region', { name: SCREEN.group })
      .getByRole('listitem')
      .filter({ hasText: player });
    const text = await steady(async () =>
      (await row.count()) === 0 ? undefined : await row.textContent(),
    );
    const count = text?.match(SCREEN.progressCount)?.[1];
    return count === undefined ? undefined : Number(count);
  }

  /**
   * Everything the room server sent every other player after the state each one got on connecting.
   * That state lists every option of every dilemma, and only the answers of whoever gets it.
   */
  async messagesReceivedByOthers(player: string): Promise<object[]> {
    return this.#othersThan(this.#playerCalled(player)).flatMap(({ received }) =>
      received.filter((message) => !isGameState(message)),
    );
  }

  async votesCastBy(player: string): Promise<string[]> {
    return (this.#votes.get(player) ?? []).map(({ vote }) => vote);
  }

  /**
   * A browser of its own for the player. The web signs in anonymously as soon as it opens a game,
   * so the driver opens one that does not exist and takes the token from its first message.
   */
  async #openBrowser(nickname: string): Promise<E2ePlayer> {
    const context = await this.#stack.browser.newContext({ viewport: PHONE, locale: 'es-ES' });
    // Below the timeout of a step, so a failure names what the screen did not show.
    context.setDefaultTimeout(WAIT_TIMEOUT_MS);
    const player: E2ePlayer = {
      nickname,
      context,
      page: await context.newPage(),
      playerId: undefined,
      sent: [],
      received: [],
      link: undefined,
      online: true,
    };
    this.#players.set(nickname, player);

    const realtime = new URL(this.#stack.realtimeUrl);
    await context.routeWebSocket(
      (url) => url.host === realtime.host,
      (socket) => this.#link(player, socket),
    );
    await player.page.goto(`${this.#stack.webUrl}/games/not-a-game`);
    await waitUntil(() => tokenOf(player), `the browser of ${nickname} signs in`);
    return player;
  }

  /** Joins the socket of the page to the room server, keeping what goes through it. */
  #link(player: E2ePlayer, socket: WebSocketRoute): void {
    if (!player.online) {
      socket.close();
      return;
    }
    const server = socket.connectToServer();
    const link = { page: socket, server };
    player.link = link;

    socket.onMessage((message) => {
      const parsed = ClientMessageDto.safeParse(JSON.parse(String(message)));
      if (parsed.success) player.sent.push(parsed.data);
      server.send(message);
    });
    server.onMessage((message) => {
      const parsed = ServerMessageDto.safeParse(JSON.parse(String(message)));
      if (parsed.success) player.received.push(parsed.data);
      socket.send(message);
    });
    // Either end closing closes the other, as with no driver in between.
    socket.onClose(() => {
      if (player.link === link) player.link = undefined;
      server.close();
    });
    server.onClose(() => {
      if (player.link === link) player.link = undefined;
      socket.close();
    });
  }

  /** Chooses the option on screen and continues, then waits until the room has the vote. */
  async #answer(player: E2ePlayer, dilemmaId: string, vote: string): Promise<void> {
    const dilemma = this.#dilemmaOn(player, dilemmaId);
    const option = dilemma.options.find(({ optionId }) => optionId === vote);
    if (!option) throw new Error(`The dilemma ${dilemmaId} has no option ${vote}`);

    const isNew = !lastStateOf(player)?.answers.some((answer) => answer.dilemmaId === dilemmaId);
    const { page } = player;
    await page.getByRole('heading', { level: 1, name: dilemma.text }).waitFor();
    await page.getByRole('radio', { name: option.text, exact: true }).click();
    await page.getByRole('button', { name: SCREEN.continue }).click();
    this.#votes.set(player.nickname, [
      ...(this.#votes.get(player.nickname) ?? []),
      { dilemmaId, vote },
    ]);

    await waitUntil(
      () =>
        lastStateOf(player)?.answers.some(
          (answer) => answer.dilemmaId === dilemmaId && answer.vote === vote,
        ),
      `the room keeps the vote of ${player.nickname} for ${dilemmaId}`,
    );
    // A changed vote tells the others nothing: only a new answer moves the progress they see.
    if (!isNew) return;
    const progress = heardAbout(player, this.#playerIdOf(player))?.progress;
    await this.#untilOthersHear(
      player,
      `has answered ${progress} dilemmas`,
      (heard) => heard.progress === progress,
    );
  }

  /** Waits until every other player with the game open has heard that about `player`. */
  async #untilOthersHear(
    player: E2ePlayer,
    what: string,
    heard: (about: HeardAbout) => boolean,
  ): Promise<void> {
    const playerId = this.#playerIdOf(player);
    await waitUntil(
      () =>
        this.#othersThan(player).every((other) => {
          const about = heardAbout(other, playerId);
          return !other.link || (about !== undefined && heard(about));
        }) || undefined,
      `everyone else hears that ${player.nickname} ${what}`,
    );
  }

  async #post<T>(
    path: string,
    caller: E2ePlayer,
    body: object,
    response: { parse(data: unknown): T },
  ): Promise<T> {
    const token = tokenOf(caller);
    if (!token) throw new Error(`${caller.nickname} is not signed in`);
    const answer = await fetch(this.#stack.realtimeUrl + path, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json: unknown = await answer.json();
    if (!answer.ok) {
      throw new Error(`POST ${path} answered ${answer.status}: ${JSON.stringify(json)}`);
    }
    return response.parse(json);
  }

  /** The position (from 1) of the dilemma on the screen of the page. */
  async #positionOn(page: Page): Promise<number> {
    const text = await page.getByText(SCREEN.position).textContent();
    const position = text?.match(SCREEN.position)?.[1];
    if (position === undefined) throw new Error('The screen shows no dilemma');
    return Number(position);
  }

  /** The dilemma as the room server sent it to the player, with the ids and texts of its options. */
  #dilemmaOn(player: E2ePlayer, dilemmaId: string): GameStateDto['dilemmas'][number] {
    const dilemma = lastStateOf(player)?.dilemmas.find((d) => d.dilemmaId === dilemmaId);
    if (!dilemma) throw new Error(`${player.nickname} did not get the dilemma ${dilemmaId}`);
    return dilemma;
  }

  /** The scenario counts dilemmas from 1, as people do. */
  #dilemmaIdAt(position: number): string {
    const dilemmaId = DILEMMA_IDS[position - 1];
    if (!dilemmaId) throw new Error(`The game has no dilemma in position ${position}`);
    return dilemmaId;
  }

  #othersThan(player: E2ePlayer): E2ePlayer[] {
    return [...this.#players.values()].filter((other) => other !== player);
  }

  #playerIdOf(player: E2ePlayer): string {
    if (!player.playerId) throw new Error(`${player.nickname} is not in the room`);
    return player.playerId;
  }

  /** A nickname that no step introduced is a mistake in the scenario, not in the game. */
  #playerCalled(nickname: string): E2ePlayer {
    const player = this.#players.get(nickname);
    if (!player) throw new Error(`No player called "${nickname}" in this scenario`);
    return player;
  }
}

function isGameState(message: ServerMessageDto): message is GameStateDto {
  return message.type === 'game-state';
}

function lastStateOf({ received }: E2ePlayer): GameStateDto | undefined {
  return received.findLast(isGameState);
}

/** The token the page sent with its last `connect`. */
function tokenOf({ sent }: E2ePlayer): string | undefined {
  return sent.findLast((message) => message.type === 'connect')?.token;
}

/** What a player knows about another one. */
interface HeardAbout {
  readonly connected: boolean;
  readonly progress: number;
}

/** What the player knows about the one with that id, from every message they received. */
function heardAbout({ received }: E2ePlayer, playerId: string): HeardAbout | undefined {
  let about: HeardAbout | undefined;
  for (const message of received) {
    if (message.type === 'game-state') {
      about = message.players.find((player) => player.playerId === playerId);
    } else if (message.type === 'progress-updated' && message.playerId === playerId && about) {
      about = { ...about, progress: message.progress };
    } else if (message.type === 'connection-changed' && message.playerId === playerId && about) {
      about = { ...about, connected: message.connected };
    }
  }
  return about;
}

/** Checks again and again until `check` gives something, and returns it. */
async function waitUntil<T>(
  check: () => T | undefined | false,
  what: string,
  timeoutMs = WAIT_TIMEOUT_MS,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const found = check();
    if (found !== undefined && found !== false) return found;
    if (Date.now() > deadline) throw new Error(`Timed out waiting until ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

/** Reads the screen until two reads in a row agree, so a render on its way is not taken for the answer. */
async function steady<T>(read: () => Promise<T>): Promise<T> {
  let previous = await read();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const current = await read();
    if (isDeepStrictEqual(current, previous)) return current;
    previous = current;
  }
  return previous;
}
