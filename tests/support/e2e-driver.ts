import { type Database, type DatabaseClient, ConsoleLogger, openDatabase } from '@thelever-app/db';
import {
  ClientMessageDto,
  GAP_MARKER,
  JoinRoomResponseDto,
  RoomPreviewResponseDto,
  ServerMessageDto,
  type GameStateDto,
  type RoomStateDto,
} from '@thelever-app/protocol';
import { isDeepStrictEqual } from 'node:util';
import type {
  BrowserContext,
  BrowserContextOptions,
  Locator,
  Page,
  WebSocketRoute,
} from 'playwright';
import type {
  AnswerPlan,
  CatalogEntry,
  GameDriver,
  GameSettingsView,
  InvitationMethod,
  JoinRefusal,
  PlayerView,
  RecordedAnswer,
  ReportReason,
  RevealView,
  RoomChoices,
  RoomPreview,
  SettingsView,
} from './driver.ts';
import type { E2eStack } from './e2e-stack.ts';
import { catalogEntryOf, explorationSlotsFor, TWO_OPTION_DILEMMA_IDS } from './test-catalog.ts';

/** What the driver looks for on screen, in the language of the browsers: es.json of the web. */
const SCREEN = {
  create: 'Crear sala',
  joinWithCode: 'Unirme con un código',
  nickname: 'Tu apodo',
  natureGroup: '¿Con quién vas a jugar?',
  natures: { family: 'Familia', friends: 'Amigos', work: 'Compañeros', mixed: 'Mezcla' },
  places: { together: 'En el mismo sitio', remote: 'A distancia' },
  code: 'Código de la sala',
  enter: 'Entrar en la sala',
  settingsTitle: 'Ajustes de la partida',
  someoneInTheGroup: 'alguien del grupo',
  changeAvatar: 'Cambiar avatar',
  missingAvatar: 'Elige otro avatar',
  namesake: /^(.+) ya está en la sala; os distinguirá el avatar\.$/,
  host: 'Anfitrión',
  share: 'Compartir enlace',
  copied: 'Enlace copiado',
  showQr: 'Mostrar QR',
  qr: (code: string) => `Código QR de la sala ${code}`,
  close: 'Cerrar',
  videoCall: 'videollamada',
  change: 'Cambiar',
  save: 'Guardar',
  variants: { nominal: 'Nominal', anonymous: 'Anónimo' },
  switches: {
    adultsOnly: 'Solo mayores de 18',
    newDilemmas: 'Incluir dilemas nuevos',
  },
  language: 'Idioma de los dilemas',
  byCategories: 'Por categorías',
  categories: 'Categorías',
  allCategories: 'Todas',
  categoryNames: {
    'life-and-death': 'Vida y muerte',
    honesty: 'Honestidad',
    loyalty: 'Lealtad',
    justice: 'Justicia',
    'love-and-relationships': 'Amor y relaciones',
    'work-and-money': 'Trabajo y dinero',
    'technology-and-the-future': 'Tecnología y futuro',
  } as Readonly<Record<string, string>>,
  dilemmaCount: 'Dilemas',
  timePerDilemma: 'Tiempo por dilema',
  dilemmasPerPlayer: 'Dilemas que añade cada jugador',
  noDilemmas: 'Ninguno',
  pick: 'Elegir dilemas uno a uno',
  changePicked: 'Cambiar',
  search: 'Buscar dilemas',
  play: (count: number) => (count === 1 ? 'Jugar este' : `Jugar estos ${count}`),
  add: 'Añadir un dilema',
  remove: 'Quitar este dilema',
  addedTitle: /^Dilemas añadidos/,
  toExpel: (nickname: string) => `${nickname}. Toca para expulsar`,
  expel: 'Expulsar',
  expelled: 'Te han sacado de la sala',
  toChangeAvatar: /Toca para cambiar tu avatar$/,
  face: (number: number) => `Cara ${number}`,
  colors: {
    khaki: 'Caqui',
    teal: 'Verde azulado',
    brown: 'Marrón',
    slate: 'Pizarra',
    cyan: 'Cian',
    rust: 'Óxido',
    olive: 'Oliva',
    stone: 'Piedra',
  },
  useAvatar: 'Usar este',
  start: 'Empezar la partida',
  refusals: {
    'Esa sala no existe': 'room-does-not-exist',
    'Esa sala ya no existe': 'room-does-not-exist',
    'Esta sala está completa': 'room-full',
    'No puedes volver a entrar en esta partida': 'expelled',
  } as Readonly<Record<string, JoinRefusal>>,
  roomOf: /^Sala de (.+) · [A-Z0-9]{5}$/,
  inTheRoom: /^(\d+) en la sala$/,
  anonymous: 'Sala anónima',
  position: /Dilema (\d+) de \d+/,
  positionOf: (position: number) => new RegExp(`Dilema ${position} de \\d+`),
  disconnected: 'desconectado',
  showGroup: 'Ver el grupo',
  groupTitle: 'El grupo',
  done: 'Listo',
  doneCount: /Han? respondido · (\d+)/,
  doneRegion: /^Han? respondido · /,
  answeredCount: /(?:Han? respondido (\d+))|(?:^|\D)(\d+) han? respondido/,
  anonymousNote: 'En sala anónima nadie ve quién ha respondido, solo cuántos.',
  timeLeft: /Quedan (\d+):(\d{2})/,
  waiting: 'Esperando a los demás',
  changeAnswer: 'Cambiar mi respuesta',
  revealEarly: 'Revelar ya',
  revealEarlyTitle: '¿Revelar el dilema ya?',
  movedOn: /(.+) pasó al siguiente/,
  previous: /anterior/i,
  points: /\bpuntos?\b/i,
  back: 'Volver a tu voto',
  continue: 'Continuar',
  choose: 'Elige una opción',
  predictQuestion: '¿Qué votó cada uno?',
  voteOf: (nickname: string) => `El voto de ${nickname}`,
  next: 'Siguiente dilema',
  moreOptions: 'Más opciones',
  report: 'Reportar este dilema',
  reasons: { offensive: 'Ofensivo', confusing: 'Confuso' },
  sendReport: 'Enviar reporte',
  skip: 'Saltar dilema',
  leave: 'Salir de la partida',
  reveal: 'Reveal',
} as const;

/** Where the web keeps the last nickname on the device (identity/last-nickname.ts). */
const LAST_NICKNAME_KEY = 'thelever.lastNickname';

/** The language of each device a scenario names, as the browser announces it. */
const LOCALES: Readonly<Record<string, string>> = { es: 'es-ES', en: 'en-US', fr: 'fr-FR' };
/** The language of the browsers when a scenario does not name one. */
const SPANISH = 'es-ES';

/** The narrowest phone the web supports: every scenario plays on it. */
const PHONE = { width: 320, height: 640 };
const WAIT_TIMEOUT_MS = 10_000;
/** How long the strip of the web says who moved everyone on (components/progress-strip.tsx). */
const MOVED_ON_NOTICE_MS = 3000;
/** Long enough for the longest wait between two attempts to reconnect, 10 s, and the attempt itself. */
const RECONNECTION_TIMEOUT_MS = 15_000;
/**
 * The players with a screen of their own. A Given that fills a room brings in the rest over HTTP,
 * without a browser: fifty browsers do not fit in a test.
 */
const MAX_SCREENS = 6;

/** The browser of a player: their own session and storage, and what goes through their socket. */
interface PlayerScreen {
  readonly context: BrowserContext;
  readonly page: Page;
  /** Every message the page sent to the room server, in order. */
  readonly sent: ClientMessageDto[];
  /** Every message the room server sent to the page, in order. */
  readonly received: ServerMessageDto[];
  /** The socket of the page and its other end at the room server, while both are open. */
  link: { readonly page: WebSocketRoute; readonly server: WebSocketRoute } | undefined;
  /** While false, the page cannot reach the room server, as with no network. */
  online: boolean;
}

/** One player of the scenario, by the name the scenario gives them. */
interface E2ePlayer {
  readonly name: string;
  nickname: string;
  /** Their player in the room, once they entered it. */
  playerId: string | undefined;
  /** None for the players a Given brings in over HTTP. */
  readonly screen: PlayerScreen | undefined;
  preview: RoomPreview | undefined;
  refusal: JoinRefusal | undefined;
  /** Whether the screen asked them to choose another avatar, since someone with their nickname has it. */
  askedForAnotherAvatar: boolean;
  /** Whether they are on the screen to create a room, which they opened before creating it. */
  creatingRoom: boolean;
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
  #host: string | undefined;
  /** When a step last set the time of the round, by the clock of the test. */
  #timeSetAt: number | undefined;
  /** Whether the host gave the nickname and the nature of the group on the same screen. */
  #askedTogether = false;
  #fillers = 0;

  constructor(stack: E2eStack) {
    this.#stack = stack;
  }

  /** The screen of each player, to check what any player sees. */
  screens(): Page[] {
    return [...this.#players.values()].flatMap(({ screen }) => (screen ? [screen.page] : []));
  }

  async start(): Promise<void> {
    // Nothing to prepare: each player opens their browser when the scenario introduces them.
  }

  async stop(): Promise<void> {
    await Promise.all(
      [...this.#players.values()].map(async ({ screen }) => screen?.context.close()),
    );
  }

  // Lobby

  async openRoomCreation(host: string, deviceLanguage = 'es'): Promise<void> {
    const player = await this.#withScreen(host, LOCALES[deviceLanguage] ?? SPANISH);
    if (player.creatingRoom) return;
    const { page } = screenOf(player);
    await page.goto(`${this.#stack.webUrl}/`);
    await page.getByRole('button', { name: SCREEN.create }).click();
    await page.getByRole('button', { name: SCREEN.changeAvatar }).waitFor();
    player.creatingRoom = true;
  }

  async createRoom(host: string, choices: RoomChoices = {}): Promise<void> {
    await this.openRoomCreation(host, choices.deviceLanguage);
    const player = this.#playerCalled(host);
    const { page } = screenOf(player);

    const nickname = page.getByRole('textbox', { name: SCREEN.nickname });
    const natures = page.getByRole('group', { name: SCREEN.natureGroup });
    this.#askedTogether = (await nickname.isVisible()) && (await natures.isVisible());
    await nickname.fill(host);
    await chooseOption(page, SCREEN.natures[(choices.groupNature ?? 'friends') as 'friends']);
    await chooseOption(page, SCREEN.places[(choices.place ?? 'together') as 'together']);
    await page.getByRole('button', { name: SCREEN.create }).click();

    await page.waitForURL(/\/rooms\//);
    await waitUntil(() => lastLobbyOf(player), `${host} gets the lobby of their room`);
    player.creatingRoom = false;
    player.nickname = host;
    this.#host = host;
  }

  async nicknameAndGroupNatureAskedTogether(): Promise<boolean> {
    return this.#askedTogether;
  }

  /** The screen marks the host next to their own row. */
  async isHost(player: string): Promise<boolean> {
    const seen = this.#playerCalled(player);
    const { page } = screenOf(seen);
    const own = page.locator(`li[data-player-id="${this.#playerIdOf(seen)}"]`);
    return (await own.textContent())?.includes(SCREEN.host) ?? false;
  }

  async roomCodeSeenBy(player: string): Promise<string> {
    const { page } = screenOf(this.#playerCalled(player));
    return (await page.getByTestId('room-code').textContent()) ?? '';
  }

  /** The link the screen copies opens the room for whoever follows it. */
  async canShareInvitationLink(player: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(player));
    await page.getByRole('button', { name: SCREEN.share }).click();
    await page.getByRole('button', { name: SCREEN.copied }).waitFor();
    const link = String(await page.evaluate('navigator.clipboard.readText()'));
    return this.#opensTheRoom(link, await this.roomCodeSeenBy(player));
  }

  /** The QR at full screen carries a link that opens the room. */
  async canShowQrFullScreen(player: string): Promise<boolean> {
    const link = await this.#qrLinkOf(player);
    return this.#opensTheRoom(link, await this.roomCodeSeenBy(player));
  }

  async videoCallAdviceSeenBy(player: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(player));
    const advice = page.getByRole('note').filter({ hasText: SCREEN.videoCall });
    return steady(async () => (await advice.count()) > 0);
  }

  /** As the room keeps it, and every game of the room copies when it starts. */
  async placeRecorded(): Promise<string> {
    return this.#lobbyOf(this.#hostName()).place;
  }

  /** Where the web keeps it on the device, as if the player had entered a room with it. */
  async lastPlayedAs(player: string, nickname: string): Promise<void> {
    const { context } = screenOf(await this.#withScreen(player));
    await context.addInitScript(
      ([key, value]) => {
        localStorage.setItem(key, value);
      },
      [LAST_NICKNAME_KEY, nickname] as const,
    );
  }

  async nicknameFieldSeenBy(player: string): Promise<string> {
    const { page } = screenOf(this.#playerCalled(player));
    return page.getByRole('textbox', { name: SCREEN.nickname }).inputValue();
  }

  async openInvitation(player: string, method: InvitationMethod): Promise<void> {
    // Once the game started, the lobby that showed the code is gone: it is the one it showed.
    const lobby = screenOf(this.#playerCalled(this.#hostName())).received.findLast(
      (message): message is RoomStateDto => message.type === 'room-state',
    );
    const code =
      lastGameOf(this.#playerCalled(this.#hostName())) && lobby
        ? lobby.code
        : await this.roomCodeSeenBy(this.#hostName());
    if (method === 'code') {
      await this.typeRoomCode(player, code);
      return;
    }
    const link =
      method === 'QR'
        ? await this.#qrLinkOf(this.#hostName())
        : `${this.#stack.webUrl}/join/${code}`;
    const opener = await this.#withScreen(player);
    await screenOf(opener).page.goto(link);
    await this.#readJoinScreen(opener);
  }

  /** On the start screen, with no button: the field goes through once the code is complete. */
  async typeRoomCode(player: string, code: string): Promise<void> {
    const opener = await this.#withScreen(player);
    const { page } = screenOf(opener);
    await page.goto(`${this.#stack.webUrl}/`);
    await page.getByRole('button', { name: SCREEN.joinWithCode }).click();
    await page.getByRole('textbox', { name: SCREEN.code }).fill(code);
    await this.#readJoinScreen(opener);
  }

  async roomPreviewSeenBy(player: string): Promise<RoomPreview | undefined> {
    return this.#playerCalled(player).preview;
  }

  async typeNickname(player: string, nickname: string): Promise<void> {
    const { page } = screenOf(this.#playerCalled(player));
    await page.getByRole('textbox', { name: SCREEN.nickname }).fill(nickname);
  }

  async namesakeWarningSeenBy(player: string): Promise<string | undefined> {
    const { page } = screenOf(this.#playerCalled(player));
    const warning = page.getByTestId('namesake');
    if (!(await steady(async () => (await warning.count()) > 0))) return undefined;
    return (await warning.textContent())?.match(SCREEN.namesake)?.[1];
  }

  async confirmNickname(player: string, nickname: string): Promise<void> {
    const joiner = this.#playerCalled(player);
    const { page, received } = screenOf(joiner);
    const statesBefore = received.filter(isState).length;
    await page.getByRole('textbox', { name: SCREEN.nickname }).fill(nickname);
    // Someone with that nickname has the avatar: the button asks for another one instead.
    const askedForAvatar = page.getByRole('button', { name: SCREEN.missingAvatar });
    if (await askedForAvatar.isVisible()) {
      joiner.askedForAnotherAvatar = true;
      return;
    }
    await page.getByRole('button', { name: SCREEN.enter }).click();

    // Who comes back to a game in progress, having left it, gets the game instead of the lobby.
    const inGame = page.getByText(SCREEN.position);
    await page.locator('[data-testid="room-code"], [role="alert"] h1').or(inGame).first().waitFor();
    if ((await inGame.count()) > 0) {
      await waitUntil(
        () => received.filter(isState).length > statesBefore || undefined,
        `${player} gets the game again`,
      );
      return;
    }
    const refusal = await this.#refusalOn(page);
    joiner.refusal = refusal;
    if (refusal) return;
    joiner.nickname = nickname;
    await waitUntil(() => lastLobbyOf(joiner), `${player} gets the lobby`);
    await this.#untilEveryoneSees(`${player} is in the room`, (lobby) =>
      lobby.players.some(({ playerId }) => playerId === joiner.playerId),
    );
  }

  async joinRoom(player: string, nickname = player): Promise<void> {
    if (this.screens().length >= MAX_SCREENS && !this.#players.has(player)) {
      await this.#joinWithoutScreen(player, nickname);
      return;
    }
    await this.tryToJoinRoom(player, nickname);
    const { refusal } = this.#playerCalled(player);
    if (refusal) throw new Error(`The scenario has ${player} join, but the room says ${refusal}`);
  }

  async tryToJoinRoom(player: string, nickname = player): Promise<void> {
    await this.openInvitation(player, 'code');
    if (this.#playerCalled(player).refusal) return;
    await this.confirmNickname(player, nickname);
  }

  async joinRefusalSeenBy(player: string): Promise<JoinRefusal | undefined> {
    return this.#playerCalled(player).refusal;
  }

  /** As the host sees the room: whoever left it or never entered is not there. */
  async isInTheRoom(player: string): Promise<boolean> {
    const { playerId } = this.#playerCalled(player);
    if (!playerId) return false;
    return this.#playersOfTheRoom().some((seen) => seen.playerId === playerId);
  }

  async isInTheLobby(player: string): Promise<boolean> {
    if (!(await this.isInTheRoom(player))) return false;
    const { page } = screenOf(this.#playerCalled(player));
    return page.getByTestId('room-code').isVisible();
  }

  /** The rows of the lobby on the screen of `viewer`: who, and the face and colour they show. */
  async playersSeenBy(viewer: string): Promise<PlayerView[]> {
    const { page } = screenOf(this.#playerCalled(viewer));
    return steady(() =>
      page.locator('li[data-player-id]').evaluateAll((rows) =>
        rows.map((row) => {
          const avatar = row.querySelector('[data-face]');
          return {
            nickname: row.getAttribute('data-nickname') ?? '',
            avatar: `${avatar?.getAttribute('data-face')}/${avatar?.getAttribute('data-color')}`,
          };
        }),
      ),
    );
  }

  /** In the room, the avatar of their row; before entering, the one on the button that changes it. */
  async avatarSeenBy(player: string): Promise<string> {
    const seen = this.#playerCalled(player);
    const { page } = screenOf(seen);
    const avatar = seen.playerId
      ? page.locator(`li[data-player-id="${seen.playerId}"] [data-face]`).first()
      : page.getByRole('button', { name: SCREEN.changeAvatar });
    return `${await avatar.getAttribute('data-face')}/${await avatar.getAttribute('data-color')}`;
  }

  /** In the picker: the first colour and face that nobody in the room shows, the player included. */
  async chooseAnotherAvatar(player: string): Promise<string> {
    const chooser = this.#playerCalled(player);
    const inside = chooser.playerId
      ? (await this.playersSeenBy(player)).map(({ avatar }) => avatar)
      : (chooser.preview?.avatars ?? []);
    const taken = new Set([...inside, await this.avatarSeenBy(player)]);
    for (const color of Object.keys(SCREEN.colors)) {
      for (let number = 1; number <= 12; number += 1) {
        const avatar = `face-${String(number).padStart(2, '0')}/${color}`;
        if (taken.has(avatar)) continue;
        await this.chooseAvatar(player, avatar);
        if (chooser.askedForAnotherAvatar) continue;
        return avatar;
      }
    }
    throw new Error('The room has no free avatar left');
  }

  /** In the picker, which leaves out the avatars of whoever has the same nickname. */
  async chooseAvatar(player: string, avatar: string): Promise<void> {
    const chooser = this.#playerCalled(player);
    const { page } = screenOf(chooser);
    const [face = '', color = ''] = avatar.split('/');
    const opener = chooser.playerId ? SCREEN.toChangeAvatar : SCREEN.changeAvatar;
    await page.getByRole('button', { name: opener }).click();
    const picker = page.getByRole('dialog');
    const colorName = SCREEN.colors[color as keyof typeof SCREEN.colors];
    await picker.getByRole('button', { name: colorName, exact: true }).click();
    const number = Number(face.replace('face-', ''));
    const button = picker.getByRole('button', { name: SCREEN.face(number), exact: true });
    chooser.askedForAnotherAvatar = await button.isDisabled();
    if (chooser.askedForAnotherAvatar) {
      await page.keyboard.press('Escape');
      await picker.waitFor({ state: 'hidden' });
      return;
    }
    await button.click();
    await picker.getByRole('button', { name: SCREEN.useAvatar }).click();
    if (!chooser.playerId) return;
    const playerId = chooser.playerId;
    await this.#untilEveryoneSees(`${player} has the avatar ${avatar}`, (lobby) =>
      lobby.players.some(
        (seen) =>
          seen.playerId === playerId && `${seen.avatar.face}/${seen.avatar.color}` === avatar,
      ),
    );
  }

  async askedToChooseAnotherAvatar(player: string): Promise<boolean> {
    return this.#playerCalled(player).askedForAnotherAvatar;
  }

  /** As the lobby on the device has it, from the last state the room server sent. */
  async settingsSeenBy(viewer: string): Promise<SettingsView> {
    return this.#lobbyOf(viewer).settings;
  }

  async changeSettings(host: string, changes: Partial<SettingsView>): Promise<void> {
    const { page } = screenOf(this.#playerCalled(host));
    await page.getByRole('button', { name: SCREEN.change, exact: true }).click();
    const sheet = page.getByRole('dialog');

    for (const [setting, value] of Object.entries(changes)) {
      if (setting === 'variant') {
        await chooseOption(sheet, SCREEN.variants[value as 'nominal']);
      } else if (setting in SCREEN.switches) {
        const name = SCREEN.switches[setting as keyof typeof SCREEN.switches];
        await sheet
          .getByRole('switch', { name: new RegExp(`^${escaped(name)}`) })
          .setChecked(Boolean(value));
      } else if (setting === 'dilemmaLanguage') {
        await sheet.getByLabel(SCREEN.language).selectOption(String(value));
      } else if (setting === 'categories') {
        const chips = sheet.getByRole('group', { name: SCREEN.categories });
        const chip = (category: string) => {
          const name = SCREEN.categoryNames[category];
          if (!name) throw new Error(`The driver does not know the category ${category}`);
          return chips.getByRole('checkbox', { name, exact: true });
        };
        // «Todas» first: from there, marking one plays only that one, and unmarking it, none.
        await chips.getByRole('checkbox', { name: SCREEN.allCategories, exact: true }).click();
        const categories = value as readonly string[] | null;
        if (categories?.length === 0) {
          await chip('life-and-death').click();
          await chip('life-and-death').click();
        }
        for (const category of categories ?? []) await chip(category).click();
      } else if (setting === 'dilemmasPerPlayer') {
        const group = sheet.getByRole('radiogroup', { name: SCREEN.dilemmasPerPlayer });
        await chooseOption(group, value === 0 ? SCREEN.noDilemmas : String(value));
      } else if (setting === 'dilemmaCount') {
        const group = sheet.getByRole('group', { name: SCREEN.dilemmaCount, exact: true });
        await chooseOption(group, String(value));
      } else if (setting === 'timePerDilemmaSeconds') {
        const group = sheet.getByRole('group', { name: SCREEN.timePerDilemma });
        await chooseOption(group, `${value} s`);
      } else {
        throw new Error(`The driver cannot change ${setting} on screen`);
      }
    }
    await sheet.getByRole('button', { name: SCREEN.save }).click();
    await sheet.waitFor({ state: 'hidden' });
    await this.#untilEveryoneSees('the new configuration', (lobby) =>
      Object.entries(changes).every(([setting, value]) =>
        isDeepStrictEqual(lobby.settings[setting as keyof SettingsView], value),
      ),
    );
  }

  async canChangeSettings(player: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(player));
    const change = page.getByRole('button', { name: SCREEN.change, exact: true });
    return steady(async () => (await change.count()) > 0);
  }

  /** The first dilemma the search of the screen offers that nobody added yet. */
  async addDilemma(player: string): Promise<void> {
    const adder = this.#playerCalled(player);
    const { page } = screenOf(adder);
    const added = new Set(await this.addedDilemmasSeenBy(player));
    const answer = this.#nextSearchOn(page);
    await page.getByRole('button', { name: SCREEN.add }).click();
    const first = (await answer).find(({ dilemmaId }) => !added.has(dilemmaId));
    if (!first) throw new Error('The catalog has no other dilemma suitable for the room');

    await page
      .getByRole('dialog')
      .getByRole('button', { name: new RegExp(`^${escaped(listedText(first))}`) })
      .click();
    await waitUntil(
      () => lastLobbyOf(adder)?.ownAddedDilemmaIds.includes(first.dilemmaId),
      `${player} has added ${first.dilemmaId}`,
    );
    await this.#untilEveryoneSees(`${first.dilemmaId} is added`, (lobby) =>
      lobby.addedDilemmas.some(({ dilemmaId }) => dilemmaId === first.dilemmaId),
    );
  }

  /** The screen offers no way to add more than the room allows. */
  async tryToAddAnotherDilemma(player: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(player));
    const add = page.getByRole('button', { name: SCREEN.add });
    if (!(await steady(async () => (await add.count()) > 0))) return false;
    await this.addDilemma(player);
    return true;
  }

  async addedDilemmasSeenBy(viewer: string): Promise<string[]> {
    return this.#lobbyOf(viewer).addedDilemmas.map(({ dilemmaId }) => dilemmaId);
  }

  /** From everything the device has of the added dilemmas: what the screen shows and what it got. */
  async authorsOfAddedDilemmasSeenBy(viewer: string): Promise<string[]> {
    const { page } = screenOf(this.#playerCalled(viewer));
    const lobby = this.#lobbyOf(viewer);
    const section = page.getByRole('region', { name: SCREEN.addedTitle });
    const shown = (await section.count()) > 0 ? await section.textContent() : '';
    const seen = `${shown} ${JSON.stringify(lobby.addedDilemmas)}`;
    return lobby.players
      .filter(({ playerId, nickname }) => seen.includes(playerId) || seen.includes(nickname))
      .map(({ nickname }) => nickname);
  }

  /** The host sees every added dilemma with a way to remove it; anyone else, only their own. */
  async removeAddedDilemma(player: string): Promise<void> {
    const { page } = screenOf(this.#playerCalled(player));
    const before = this.#lobbyOf(player).addedDilemmas.length;
    await page.getByRole('button', { name: SCREEN.remove }).first().click();
    await this.#untilEveryoneSees(
      'one dilemma less is added',
      (lobby) => lobby.addedDilemmas.length === before - 1,
    );
  }

  /**
   * The host searches where they pick the dilemmas of the game; any other player, where they add
   * one. The ids are those of what the room server answered and the screen shows.
   */
  async searchDilemmas(player: string, text?: string): Promise<string[]> {
    const { page } = screenOf(this.#playerCalled(player));
    let answer = this.#nextSearchOn(page);
    if (player === this.#hostName()) {
      await this.#openPickSheet(player);
    } else {
      await page.getByRole('button', { name: SCREEN.add }).click();
    }
    let found = await answer;
    if (text) {
      // The screen searches once the player stops typing; filling the field types it all at once.
      answer = this.#nextSearchOn(page, 'q=');
      await page.getByRole('searchbox', { name: SCREEN.search }).fill(text);
      found = await answer;
    }
    const sheet = page.getByRole('dialog');
    const [first] = found;
    if (first) await sheet.getByText(listedText(first), { exact: true }).waitFor();
    await page.keyboard.press('Escape');
    if (player === this.#hostName()) await this.#leaveTheSettings(player);
    await sheet.waitFor({ state: 'hidden' });
    return found.map(({ dilemmaId }) => dilemmaId);
  }

  async pickDilemmas(host: string, dilemmaIds: string[]): Promise<void> {
    const { page } = screenOf(this.#playerCalled(host));
    const answer = this.#nextSearchOn(page);
    await this.#openPickSheet(host);
    const found = await answer;

    const sheet = page.getByRole('dialog');
    for (const dilemmaId of dilemmaIds) {
      const dilemma = found.find((candidate) => candidate.dilemmaId === dilemmaId);
      if (!dilemma) throw new Error(`The search of the host does not offer ${dilemmaId}`);
      await sheet
        .getByRole('checkbox', { name: new RegExp(`^${escaped(listedText(dilemma))}`) })
        .click();
    }
    await sheet.getByRole('button', { name: SCREEN.play(dilemmaIds.length) }).click();
    await this.#leaveTheSettings(host);
    await this.#untilEveryoneSees('the picked dilemmas', (lobby) =>
      isDeepStrictEqual(
        lobby.pickedDilemmas.map(({ dilemmaId }) => dilemmaId).toSorted(),
        dilemmaIds.toSorted(),
      ),
    );
  }

  /** Leaving the screen to pick dilemmas goes back to the settings, which the host closes. */
  async #leaveTheSettings(host: string): Promise<void> {
    const { page } = screenOf(this.#playerCalled(host));
    const settings = page.getByRole('dialog', { name: SCREEN.settingsTitle });
    await settings.waitFor();
    await page.keyboard.press('Escape');
    await settings.waitFor({ state: 'hidden' });
  }

  /** «Por categorías» in the settings leaves the picked dilemmas in one tap. */
  async playByCategories(host: string): Promise<void> {
    const { page } = screenOf(this.#playerCalled(host));
    await page.getByRole('button', { name: SCREEN.change, exact: true }).click();
    const sheet = page.getByRole('dialog');
    await chooseOption(sheet, SCREEN.byCategories);
    await sheet.getByRole('button', { name: SCREEN.save }).click();
    await sheet.waitFor({ state: 'hidden' });
    await this.#untilEveryoneSees(
      'no picked dilemma',
      (lobby) => lobby.pickedDilemmas.length === 0,
    );
  }

  async pickedDilemmasSeenBy(viewer: string): Promise<string[]> {
    return this.#lobbyOf(viewer).pickedDilemmas.map(({ dilemmaId }) => dilemmaId);
  }

  catalogEntryOf(dilemmaId: string): CatalogEntry {
    return catalogEntryOf(dilemmaId);
  }

  async expel(host: string, player: string): Promise<void> {
    const expelled = this.#playerCalled(player);
    const { page } = screenOf(this.#playerCalled(host));
    await page.getByRole('button', { name: SCREEN.toExpel(expelled.nickname) }).click();
    await page.getByRole('dialog').getByRole('button', { name: SCREEN.expel, exact: true }).click();

    await this.#untilEveryoneSees(
      `${player} is out`,
      (lobby) => !lobby.players.some(({ playerId }) => playerId === expelled.playerId),
    );
    await expelled.screen?.page.getByRole('heading', { name: SCREEN.expelled }).waitFor();
  }

  async canExpel(host: string, player: string): Promise<boolean> {
    const { nickname } = this.#playerCalled(player);
    const { page } = screenOf(this.#playerCalled(host));
    const expel = page.getByRole('button', { name: SCREEN.toExpel(nickname) });
    return steady(async () => (await expel.count()) > 0);
  }

  /** The room says how many it needs: the driver brings in the missing ones before starting. */
  async startGame(host: string): Promise<void> {
    const { players, minimumPlayers } = this.#lobbyOf(host);
    for (let count = players.length; count < minimumPlayers; count++) {
      this.#fillers += 1;
      await this.joinRoom(`Filler ${this.#fillers}`);
    }
    await this.#start(host);
  }

  /** The screen only offers to start once the room has the players it needs. */
  async tryToStartGame(host: string): Promise<void> {
    const { page } = screenOf(this.#playerCalled(host));
    const start = page.getByRole('button', { name: SCREEN.start });
    if (await steady(async () => (await start.count()) > 0)) await this.#start(host);
  }

  async currentGameSeenBy(player: string): Promise<string | undefined> {
    const { screen } = this.#playerCalled(player);
    const last = screen?.received.findLast(isState);
    if (last?.type === 'game-state') return last.gameId;
    return last?.currentGameId ?? undefined;
  }

  async dilemmasOfTheGame(): Promise<string[]> {
    return this.#gameOf(this.#hostName()).dilemmas.map(({ dilemmaId }) => dilemmaId);
  }

  /** As the game keeps it in the database: the room may change after the game started. */
  async settingsOfTheGame(): Promise<GameSettingsView> {
    const { gameId } = this.#gameOf(this.#hostName());
    const { db, close } = await openDatabase<Database>(
      { kind: 'url', url: this.#stack.databaseUrl },
      { maxConnections: 1, logger: new ConsoleLogger() },
    );
    try {
      const game = await db
        .selectFrom('games')
        .select(['variant', 'place', 'dilemma_language', 'time_per_dilemma_seconds'])
        .where('id', '=', gameId)
        .executeTakeFirstOrThrow();
      return {
        variant: game.variant,
        place: game.place,
        dilemmaLanguage: game.dilemma_language,
        timePerDilemmaSeconds: game.time_per_dilemma_seconds,
      };
    } finally {
      await close();
    }
  }

  newDilemmasSetForGamesOf(dilemmaCount: number): number {
    return explorationSlotsFor(dilemmaCount);
  }

  // Rounds

  /**
   * By categories, the game would also draw the dilemmas of the seed the database starts with,
   * whose options are not those the scenarios name: unless a step picked them, the host picks as
   * many of the test data as the game plays besides the added ones.
   */
  async startDecisionPhase(dilemmaCount?: number): Promise<void> {
    const host = this.#hostName();
    const { pickedDilemmas, addedDilemmas, settings } = this.#lobbyOf(host);
    const missing = (dilemmaCount ?? settings.dilemmaCount) - addedDilemmas.length;
    if (pickedDilemmas.length === 0 && missing > 0) {
      await this.pickDilemmas(host, TWO_OPTION_DILEMMA_IDS.slice(0, missing));
    }
    await this.startGame(host);
  }

  /**
   * Everything the room server sent every other player after the state each one got on connecting.
   * That state lists every option of every dilemma, and only the answers of whoever gets it.
   */
  async messagesReceivedByOthers(player: string): Promise<object[]> {
    return this.#othersThan(this.#playerCalled(player)).flatMap(({ screen }) =>
      (screen?.received ?? []).filter((message) => message.type !== 'game-state'),
    );
  }

  async votesCastBy(player: string): Promise<string[]> {
    return (this.#votes.get(player) ?? []).map(({ vote }) => vote);
  }

  /** On screen: the vote and, in a nominal room, the predictions of the plan, confirmed with «Listo». */
  async answer(player: string, plan: AnswerPlan = {}): Promise<void> {
    const answerer = this.#playerCalled(player);
    const dilemma = await this.#roundDilemmaOn(answerer);
    const option = plan.vote ? optionCalled(dilemma, plan.vote) : firstOptionOf(dilemma);
    const wasAnswered = await this.hasAnswered(player);
    const heard = this.#answeredCountsHeardByOthers(answerer);
    await this.#chooseAndContinue(answerer, dilemma, option.optionId);
    const { playersToPredict } = this.#gameOf(player);
    if (playersToPredict.length === 0) {
      if (!wasAnswered) await this.#untilOthersHearAnswer(answerer, heard);
      return;
    }

    const { page } = screenOf(answerer);
    const complete = plan.votePredictions !== false;
    if (complete) {
      for (const playerId of playersToPredict) {
        await this.#tapVotePrediction(answerer, dilemma, playerId, option.optionId);
      }
    }
    await page.getByRole('button', { name: complete ? SCREEN.done : SCREEN.back }).click();
    await this.#untilRoomKeeps(answerer, dilemma.dilemmaId, (answer) =>
      complete
        ? answer.votePredictions.length === playersToPredict.length
        : answer.vote === option.optionId,
    );
    if (complete && !wasAnswered) await this.#untilOthersHearAnswer(answerer, heard);
  }

  /** On screen: the option and «Continuar», or «Listo» in an anonymous room. */
  async vote(player: string, option?: string): Promise<void> {
    const voter = this.#playerCalled(player);
    const dilemma = await this.#roundDilemmaOn(voter);
    const chosen = option ? optionCalled(dilemma, option) : firstOptionOf(dilemma);
    const wasAnswered = await this.hasAnswered(player);
    const heard = this.#answeredCountsHeardByOthers(voter);
    await this.#chooseAndContinue(voter, dilemma, chosen.optionId);
    const anonymous = this.#gameOf(player).playersToPredict.length === 0;
    if (anonymous && !wasAnswered) await this.#untilOthersHearAnswer(voter, heard);
  }

  /**
   * Back to the vote, from the waiting screen or from the predictions, which the screen sends as
   * they are; the new option; and on, keeping the predictions made.
   */
  async changeVote(player: string, option?: string): Promise<void> {
    const voter = this.#playerCalled(player);
    const { page } = screenOf(voter);
    const dilemma = await this.#roundDilemmaOn(voter);
    const previous = lastGameOf(voter)?.answers.find(
      (answer) => answer.dilemmaId === dilemma.dilemmaId,
    );
    if (!previous) throw new Error(`The scenario changes a vote ${player} never cast`);
    const chosen = option
      ? optionCalled(dilemma, option)
      : dilemma.options.find(({ optionId }) => optionId !== previous.vote);
    if (!chosen) throw new Error(`The dilemma ${dilemma.dilemmaId} has no other option`);

    const change = page.getByRole('button', { name: SCREEN.changeAnswer });
    const back = page.getByRole('button', { name: SCREEN.back });
    if ((await change.count()) > 0) await change.click();
    else if ((await back.count()) > 0) await back.click();
    await this.#chooseAndContinue(voter, dilemma, chosen.optionId);
    if (this.#gameOf(player).playersToPredict.length === 0) return;
    await this.#leavePredictions(voter);
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
    return this.#gameOf(player).answers.find((answer) => answer.dilemmaId === dilemmaId)?.vote;
  }

  /** Whether the screen offers the options of the dilemma of the round, or to change the answer. */
  async canAnswer(player: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(player));
    return steady(
      async () =>
        (await page.getByRole('main', { name: SCREEN.reveal }).count()) === 0 &&
        ((await page.getByRole('main').getByRole('radio').count()) > 0 ||
          (await page.getByRole('button', { name: SCREEN.changeAnswer }).count()) > 0),
    );
  }

  /** As the room server last told the player about their own answer to the dilemma of the round. */
  async hasAnswered(player: string): Promise<boolean> {
    const answerer = this.#playerCalled(player);
    const game = lastGameOf(answerer);
    if (!game) return false;
    const self = game.players.find(({ playerId }) => playerId === answerer.playerId);
    if (self?.answered !== null && self?.answered !== undefined) return self.answered;
    const { dilemmaId } = game.dilemmas[game.round.position]!;
    return game.answers.some((answer) => answer.dilemmaId === dilemmaId);
  }

  /** In the list of the group of `viewer`: under «Han respondido», or not; null if it says no names. */
  async answeredSeenBy(viewer: string, player: string): Promise<boolean | null> {
    const { nickname } = this.#playerCalled(player);
    return this.#readGroup(viewer, async (group) => {
      if ((await group.getByText(SCREEN.anonymousNote).count()) > 0) return null;
      const done = group.getByRole('region', { name: SCREEN.doneRegion });
      return (await done.getByRole('listitem').filter({ hasText: nickname }).count()) > 0;
    });
  }

  /** As the strip, the waiting screen or the list of the group of `viewer` count it. */
  async answeredCountSeenBy(viewer: string): Promise<number> {
    return this.#readGroup(viewer, async (group) => {
      const text = (await group.textContent()) ?? '';
      const anonymous = text.match(SCREEN.answeredCount);
      const count = anonymous?.[1] ?? anonymous?.[2] ?? text.match(SCREEN.doneCount)?.[1];
      return count === undefined ? 0 : Number(count);
    });
  }

  /** Who answered travels as a message of its own, or as whether each one answered in the state. */
  async whoAnsweredIsSent(): Promise<boolean> {
    return this.#withScreens().some(({ screen }) =>
      (screen?.received ?? []).some(
        (message) =>
          message.type === 'player-answered' ||
          (message.type === 'game-state' &&
            message.players.some(({ answered }) => answered !== null)),
      ),
    );
  }

  async isWaiting(player: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(player));
    const waiting = page.getByRole('heading', { name: SCREEN.waiting });
    await waiting.waitFor({ timeout: WAIT_TIMEOUT_MS }).catch(() => undefined);
    return (await waiting.count()) > 0;
  }

  /**
   * What the timer of `viewer` shows, plus the whole seconds that went by since a step set the
   * time, counted as the screen counts them: a real screen keeps counting while the test reads it.
   */
  async timeLeftSeenBy(viewer: string): Promise<number> {
    const { page } = screenOf(this.#playerCalled(viewer));
    const timer = page.getByRole('timer');
    // Read just after the screen ticks, when the second it counts from is the current one.
    const before = await timer.getAttribute('aria-label');
    let label = before;
    for (const deadline = Date.now() + WAIT_TIMEOUT_MS; label === before;) {
      if (Date.now() > deadline) throw new Error('Timed out waiting until the timer ticks');
      await new Promise((resolve) => setTimeout(resolve, 20));
      label = await timer.getAttribute('aria-label');
    }
    const [, minutes, seconds] = (label ?? '').match(SCREEN.timeLeft) ?? [];
    if (minutes === undefined || seconds === undefined) {
      throw new Error('The screen shows no timer');
    }
    const passed =
      this.#timeSetAt === undefined
        ? 0
        : Math.floor(Date.now() / 1000) - Math.ceil(this.#timeSetAt / 1000);
    return Number(minutes) * 60 + Number(seconds) + passed;
  }

  async disconnect(player: string): Promise<void> {
    const disconnecting = this.#playerCalled(player);
    const screen = screenOf(disconnecting);
    const { link } = screen;
    if (!link) throw new Error(`The scenario disconnects ${player}, who is not connected`);

    screen.online = false;
    screen.link = undefined;
    link.server.close();
    link.page.close();
    await this.#untilOthersHear(disconnecting, 'is disconnected', ({ connected }) => !connected);
  }

  /** The page connects again by itself, as soon as its next attempt finds the network back. */
  async reconnect(player: string): Promise<void> {
    const reconnecting = this.#playerCalled(player);
    const screen = screenOf(reconnecting);
    const statesBefore = screen.received.filter(isState).length;
    screen.online = true;

    await waitUntil(
      () => screen.received.filter(isState).length > statesBefore || undefined,
      `${player} gets a fresh state from the room server`,
      RECONNECTION_TIMEOUT_MS,
    );
    await this.#untilOthersHear(reconnecting, 'is connected', ({ connected }) => connected);
  }

  /** The position the screen of `player` says, on the dilemma, the waiting screen or the reveal. */
  async dilemmaShownTo(player: string): Promise<number> {
    const { page } = screenOf(this.#playerCalled(player));
    await page.getByText(SCREEN.position).first().waitFor();
    return steady(() => positionOn(page));
  }

  /** Whether `viewer` sees `player` as connected, in the list of the group. */
  async connectionSeenBy(viewer: string, player: string): Promise<boolean | undefined> {
    const { nickname } = this.#playerCalled(player);
    const text = await this.#readGroup(viewer, async (group) => {
      const row = group.getByRole('listitem').filter({ hasText: nickname });
      return (await row.count()) === 0 ? undefined : ((await row.first().textContent()) ?? '');
    });
    return text === undefined ? undefined : !text.includes(SCREEN.disconnected);
  }

  /** What the heading of the dilemma says on screen, with the nickname in the gap. */
  async dilemmaTextSeenBy(player: string, position: number): Promise<string> {
    const page = await this.#onRound(this.#playerCalled(player), position);
    return steady(async () => (await page.getByRole('heading', { level: 1 }).textContent()) ?? '');
  }

  async optionsSeenBy(player: string, position: number): Promise<string[]> {
    const page = await this.#onRound(this.#playerCalled(player), position);
    return steady(() => page.getByRole('main').getByRole('radio').allTextContents());
  }

  async peopleInTheGap(): Promise<Map<number, string>> {
    const { dilemmas } = this.#gameOf(this.#hostName());
    return new Map(
      dilemmas.flatMap(({ personInTheGap }, index) =>
        personInTheGap ? [[index + 1, this.#nameOf(personInTheGap)] as const] : [],
      ),
    );
  }

  /** As the game keeps it in the database. */
  async positionAddedBy(player: string): Promise<number> {
    const playerId = this.#playerIdOf(this.#playerCalled(player));
    const { gameId, dilemmas } = this.#gameOf(this.#hostName());
    const row = await this.#withDatabase((db) =>
      db
        .selectFrom('game_dilemmas')
        .select('dilemma_id')
        .where('game_id', '=', gameId)
        .where('added_by_player_id', '=', playerId)
        .executeTakeFirst(),
    );
    const index = dilemmas.findIndex(({ dilemmaId }) => dilemmaId === row?.dilemma_id);
    if (index === -1) throw new Error(`${player} added no dilemma of the game`);
    return index + 1;
  }

  async textKeptFor(): Promise<string> {
    throw new Error('Only the application keeps the text: the scenario must not be @ui');
  }

  /** As the game keeps it in the database, with the texts the player got of each option. */
  async answerRecordedFor(player: string, position: number): Promise<RecordedAnswer | undefined> {
    const answerer = this.#playerCalled(player);
    const dilemmaId = this.#dilemmaIdAt(position);
    const { gameId } = this.#gameOf(this.#hostName());
    const row = await this.#withDatabase((db) =>
      db
        .selectFrom('answers')
        .selectAll()
        .where('game_id', '=', gameId)
        .where('player_id', '=', this.#playerIdOf(answerer))
        .where('dilemma_id', '=', dilemmaId)
        .executeTakeFirst(),
    );
    if (!row) return undefined;
    const textOf = (optionId: string) =>
      this.#dilemmaOn(answerer, dilemmaId).options.find((option) => option.optionId === optionId)
        ?.text ?? optionId;
    return {
      vote: textOf(row.vote),
      votePredictions: row.vote_predictions.map((prediction) => ({
        player: this.#nameOf(prediction.playerId),
        vote: textOf(prediction.vote),
      })),
      optionOrder: row.option_order.map(textOf),
      responseTimeSeconds: row.response_time_ms === null ? null : row.response_time_ms / 1000,
      voterInTheGap: row.voter_in_the_gap,
      researchConsent: row.research_consent_version !== null,
      commercialLicenceConsent: row.commercial_licence_consent_version !== null,
      underEighteen: row.under_eighteen,
    };
  }

  /** As the game keeps it in the database, also for a player who is not connected. */
  async didNotVoteRecordedFor(player: string): Promise<number[]> {
    const playerId = this.#playerIdOf(this.#playerCalled(player));
    const { gameId, dilemmas } = this.#gameOf(this.#hostName());
    const rows = await this.#withDatabase((db) =>
      db
        .selectFrom('game_player_dilemmas')
        .select('dilemma_id')
        .where('game_id', '=', gameId)
        .where('player_id', '=', playerId)
        .where('did_not_vote', 'is not', null)
        .execute(),
    );
    const order = dilemmas.map(({ dilemmaId }) => dilemmaId);
    return rows.map(({ dilemma_id }) => order.indexOf(dilemma_id) + 1).toSorted((a, b) => a - b);
  }

  async everythingPlayersSee(): Promise<object[]> {
    throw new Error('The scenario looks at everything the application gives: it must not be @ui');
  }

  async declare(): Promise<void> {
    throw new Error('The first access does not exist yet: the scenario must not be @ui');
  }

  /**
   * The round in progress started that long ago, in the database of the run, and every screen
   * opens the game again to get its new time.
   */
  async letTimePass(seconds: number): Promise<void> {
    const { gameId } = this.#gameOf(this.#hostName());
    const now = Date.now();
    await this.#withDatabase(async (db) => {
      const game = await db
        .selectFrom('games')
        .select('time_per_dilemma_seconds')
        .where('id', '=', gameId)
        .executeTakeFirstOrThrow();
      const startedAt = now - seconds * 1000;
      await db
        .updateTable('games')
        .set({
          round_started_at: new Date(startedAt),
          round_ends_at: new Date(startedAt + game.time_per_dilemma_seconds * 1000),
        })
        .where('id', '=', gameId)
        .execute();
    });
    this.#timeSetAt = now;
    await this.#reopenEveryScreen();
  }

  /**
   * The end of the round comes now in the database of the run, and a screen opens the room again:
   * the room server finds its time over, as its timer would, and reveals the dilemma to everyone.
   */
  async runOutRound(): Promise<void> {
    const { gameId } = this.#gameOf(this.#hostName());
    await this.#withDatabase((db) =>
      db
        .updateTable('games')
        .set({ round_ends_at: new Date(Date.now() - 1000) })
        .where('id', '=', gameId)
        .execute(),
    );
    const online = this.#withScreens().filter(({ screen }) => screen?.link);
    const [opener] = online;
    if (!opener) throw new Error('Nobody has the game open to notice the time is over');
    // A second tab of the same player notices it on connecting; reloading would disconnect them.
    const { page } = screenOf(opener);
    const tab = await page.context().newPage();
    await tab.goto(page.url());
    await this.#untilEveryoneGetsTheReveal();
    await tab.close();
  }

  /** From the waiting screen, or from the menu of the dilemma, and confirmed. */
  async revealEarly(host: string): Promise<void> {
    const { page } = screenOf(this.#playerCalled(host));
    const fromWaiting = page.locator('footer').getByRole('button', { name: SCREEN.revealEarly });
    if ((await fromWaiting.count()) > 0) {
      await fromWaiting.click();
    } else {
      await page.getByRole('button', { name: SCREEN.moreOptions }).click();
      await page.getByRole('dialog').getByRole('button', { name: SCREEN.revealEarly }).click();
    }
    await page
      .getByRole('dialog', { name: SCREEN.revealEarlyTitle })
      .getByRole('button', { name: SCREEN.revealEarly, exact: true })
      .click();
    await this.#untilEveryoneGetsTheReveal();
  }

  /**
   * Whether the screen offers it: on the waiting screen, or in the menu of a dilemma. On a reveal
   * nothing is left to reveal, so the role is what tells it: the screen of the next round offers it.
   */
  async canRevealEarly(player: string): Promise<boolean> {
    const viewer = this.#playerCalled(player);
    const { page } = screenOf(viewer);
    if (lastGameOf(viewer)?.round.phase === 'reveal') {
      return steady(async () => this.#gameOf(player).hostId === viewer.playerId);
    }
    const footer = page.locator('footer').getByRole('button', { name: SCREEN.revealEarly });
    if (await steady(async () => (await footer.count()) > 0)) return true;
    const menu = page.getByRole('button', { name: SCREEN.moreOptions });
    if ((await menu.count()) === 0) return false;
    await menu.click();
    const item = page.getByRole('dialog').getByRole('button', { name: SCREEN.revealEarly });
    const offered = await steady(async () => (await item.count()) > 0);
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    return offered;
  }

  /**
   * Once the screen of `viewer` shows the reveal of a dilemma, what the room server sent it of that
   * reveal, by the names of the scenario; and whether the screen says anything about points.
   */
  async revealSeenBy(viewer: string): Promise<RevealView | undefined> {
    const watcher = this.#playerCalled(viewer);
    const { page } = screenOf(watcher);
    const region = page.getByRole('main', { name: SCREEN.reveal });
    const shown = await steady(async () =>
      lastGameOf(watcher)?.round.phase === 'reveal' ? true : (await region.count()) > 0,
    );
    if (!shown) return undefined;
    await region.waitFor();
    const reveal = this.#gameOf(viewer).reveal;
    if (!reveal) throw new Error(`${viewer} sees a reveal the room server did not send`);
    const { dilemmaId } = reveal;
    const textOf = (optionId: string) =>
      this.#dilemmaOn(watcher, dilemmaId).options.find((option) => option.optionId === optionId)
        ?.text ?? optionId;
    return {
      position: reveal.position + 1,
      distribution:
        reveal.distribution?.map(({ optionId, count }) => ({ option: textOf(optionId), count })) ??
        null,
      tooFewVotes: reveal.tooFewVotes,
      didNotVoteCount: reveal.didNotVoteCount,
      votes: reveal.votes.map(({ playerId, vote }) => ({
        player: this.#nameOf(playerId),
        vote: vote && textOf(vote),
      })),
      votePredictions: reveal.votePredictions.map(({ playerId, aboutId, right }) => ({
        player: this.#nameOf(playerId),
        about: this.#nameOf(aboutId),
        right,
      })),
      personInTheGap: reveal.personInTheGap && this.#nameOf(reveal.personInTheGap),
      addedBy: reveal.addedBy && this.#nameOf(reveal.addedBy),
      showsPoints: SCREEN.points.test((await page.locator('body').textContent()) ?? ''),
    };
  }

  /** «Siguiente dilema» on the reveal, and every screen gets the next round. */
  async moveOn(player: string): Promise<void> {
    const { page } = screenOf(this.#playerCalled(player));
    const from = this.#gameOf(player).round.position;
    await page.getByRole('button', { name: SCREEN.next }).click();
    await this.#untilEveryoneIsOnRound(from + 1);
  }

  /** Both tap «Siguiente dilema» at once. */
  async moveOnTogether(players: readonly string[]): Promise<void> {
    const from = this.#gameOf(players[0]!).round.position;
    await Promise.all(
      players.map((player) =>
        screenOf(this.#playerCalled(player))
          .page.getByRole('button', { name: SCREEN.next })
          .click(),
      ),
    );
    await this.#untilEveryoneIsOnRound(from + 1);
  }

  /** Who the notice in the strip of `viewer` says moved on, while it lasts. */
  async movedOnSeenBy(viewer: string): Promise<string | null> {
    const notice = this.#moveOnNoticeOf(viewer);
    await notice.waitFor({ timeout: MOVED_ON_NOTICE_MS }).catch(() => undefined);
    if ((await notice.count()) === 0) return null;
    const nickname = (await notice.textContent())?.match(SCREEN.movedOn)?.[1];
    const mover = [...this.#players.values()].find((player) => player.nickname === nickname);
    return mover?.name ?? null;
  }

  /** The notice sits in the strip: it overlaps neither the dilemma nor anything that can be tapped. */
  async moveOnNoticeCoversNothing(viewer: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(viewer));
    const notice = this.#moveOnNoticeOf(viewer);
    await notice.waitFor();
    const box = await notice.boundingBox();
    if (!box) return false;
    const others = [
      page.getByRole('main'),
      page.getByRole('timer'),
      page.getByRole('button', { name: SCREEN.moreOptions }),
    ];
    for (const other of others) {
      const covered = await other.boundingBox();
      if (covered && overlap(box, covered)) return false;
    }
    return true;
  }

  async moveOnNoticeDisappears(viewer: string): Promise<boolean> {
    const notice = this.#moveOnNoticeOf(viewer);
    return notice
      .waitFor({ state: 'hidden', timeout: WAIT_TIMEOUT_MS })
      .then(() => true)
      .catch(() => false);
  }

  /** Neither the dilemma nor the reveal offers a way back to an earlier round. */
  async canGoBack(player: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(player));
    return steady(
      async () => (await page.getByRole('button', { name: SCREEN.previous }).count()) > 0,
    );
  }

  /** The screen offers no prediction before a vote: there is nothing to tap but the options. */
  async canMakePredictions(player: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(player));
    return steady(
      async () =>
        (await page.getByText(SCREEN.predictQuestion).count()) > 0 ||
        (await page.getByRole('button', { name: SCREEN.choose }).count()) === 0,
    );
  }

  /** On the predictions; then «Listo» if the answer is complete, or back to the vote if not. */
  async predictVotes(
    player: string,
    predictions: readonly { readonly player: string; readonly vote: string }[],
  ): Promise<void> {
    const predictor = this.#playerCalled(player);
    const dilemma = await this.#roundDilemmaOn(predictor);
    await this.#toPredictions(predictor);
    for (const prediction of predictions) {
      const predicted = this.#playerCalled(prediction.player);
      const option = optionCalled(dilemma, prediction.vote);
      await this.#tapVotePrediction(
        predictor,
        dilemma,
        this.#playerIdOf(predicted),
        option.optionId,
      );
    }
    await this.#leavePredictions(predictor);
    await this.#untilRoomKeeps(
      predictor,
      dilemma.dilemmaId,
      (answer) => answer.votePredictions.length >= predictions.length,
    );
  }

  /** As the room server last told `player`. */
  async playersToPredictBy(player: string): Promise<string[]> {
    return this.#gameOf(player).playersToPredict.map((playerId) => this.#nameOf(playerId));
  }

  async pointsOf(): Promise<{ readonly position: number; readonly points: number | null }[]> {
    throw new Error('The scenario reads the points of the application: it must not be @ui');
  }

  async report(player: string, reason: ReportReason): Promise<void> {
    const reporter = this.#playerCalled(player);
    const { page } = screenOf(reporter);
    const { dilemmaId } = await this.#roundDilemmaOn(reporter);
    await page.getByRole('button', { name: SCREEN.moreOptions }).click();
    await page.getByRole('button', { name: SCREEN.report }).click();
    await page.getByRole('radio', { name: SCREEN.reasons[reason], exact: true }).click();
    await page.getByRole('button', { name: SCREEN.sendReport }).click();
    await waitUntil(
      () => lastGameOf(reporter)?.reports.some((report) => report.dilemmaId === dilemmaId),
      `the room keeps the report of ${player}`,
    );
  }

  async skipReportedDilemma(player: string): Promise<void> {
    const skipper = this.#playerCalled(player);
    const { page } = screenOf(skipper);
    const { dilemmaId } = await this.#roundDilemmaOn(skipper);
    await page.getByRole('button', { name: SCREEN.skip }).click();
    await waitUntil(
      () => lastGameOf(skipper)?.didNotVote.some((record) => record.dilemmaId === dilemmaId),
      `the room records that ${player} skipped the dilemma`,
    );
    await page.getByRole('heading', { name: SCREEN.waiting }).waitFor();
  }

  /** Who the room server last told `viewer` hosts the game, once it stops changing. */
  async hostSeenBy(viewer: string): Promise<string> {
    const watcher = this.#playerCalled(viewer);
    return steady(async () => this.#nameOf(this.#gameOf(watcher.name).hostId));
  }

  /** From the menu of the game: the screen goes back home, and the others hear it. */
  async leave(player: string): Promise<void> {
    const leaver = this.#playerCalled(player);
    const { page } = screenOf(leaver);
    const playerId = this.#playerIdOf(leaver);
    await page.getByRole('button', { name: SCREEN.moreOptions }).click();
    await page.getByRole('button', { name: SCREEN.leave }).click();
    await page.getByRole('button', { name: SCREEN.create }).waitFor();
    await waitUntil(
      () =>
        this.#othersThan(leaver).every((other) => {
          if (!other.screen?.link) return true;
          return lastGameOf(other)?.players.some((seen) => seen.playerId === playerId && seen.left);
        }) || undefined,
      `everyone else hears that ${player} left`,
    );
  }

  /** The dilemma of the round the screen of the player is on, as the room server sent it. */
  async #roundDilemmaOn(player: E2ePlayer): Promise<GameStateDto['dilemmas'][number]> {
    const position = await this.dilemmaShownTo(player.name);
    const dilemma = this.#gameOf(player.name).dilemmas[position - 1];
    if (!dilemma) throw new Error(`The game has no dilemma in position ${position}`);
    return dilemma;
  }

  /** The screen of the player on the round of that position (from 1), which the scenario reached. */
  async #onRound(player: E2ePlayer, position: number): Promise<Page> {
    const shown = await this.dilemmaShownTo(player.name);
    if (shown !== position) {
      throw new Error(`${player.name} is on the dilemma ${shown}, not on the ${position}`);
    }
    return screenOf(player).page;
  }

  /** Chooses the option on screen and goes on, then waits until the room has the vote. */
  async #chooseAndContinue(
    player: E2ePlayer,
    dilemma: GameStateDto['dilemmas'][number],
    vote: string,
  ): Promise<void> {
    const { page } = screenOf(player);
    const game = lastGameOf(player);
    const option = dilemma.options.find(({ optionId }) => optionId === vote)!;
    await page
      .getByRole('heading', { level: 1, name: textOnScreen(dilemma, game, dilemma) })
      .waitFor();
    await page
      .getByRole('radio', { name: textOnScreen(option, game, dilemma), exact: true })
      .click();
    const anonymous = (game?.playersToPredict.length ?? 0) === 0;
    await page.getByRole('button', { name: anonymous ? SCREEN.done : SCREEN.continue }).click();
    this.#votes.set(player.name, [
      ...(this.#votes.get(player.name) ?? []),
      { dilemmaId: dilemma.dilemmaId, vote },
    ]);
    await this.#untilRoomKeeps(player, dilemma.dilemmaId, (answer) => answer.vote === vote);
  }

  /** From the vote with its option chosen, or from the waiting screen, on to the predictions. */
  async #toPredictions(player: E2ePlayer): Promise<void> {
    const { page } = screenOf(player);
    if ((await page.getByText(SCREEN.predictQuestion).count()) > 0) return;
    const change = page.getByRole('button', { name: SCREEN.changeAnswer });
    if ((await change.count()) > 0) await change.click();
    await page.getByRole('button', { name: SCREEN.continue }).click();
    await page.getByText(SCREEN.predictQuestion).waitFor();
  }

  /** «Listo» once the predictions are complete, which only then says so; back to the vote if not. */
  async #leavePredictions(player: E2ePlayer): Promise<void> {
    const { page } = screenOf(player);
    const done = page.getByRole('button', { name: SCREEN.done, exact: true });
    const back = page.getByRole('button', { name: SCREEN.back });
    await ((await done.count()) > 0 ? done : back).click();
  }

  async #tapVotePrediction(
    player: E2ePlayer,
    dilemma: GameStateDto['dilemmas'][number],
    predictedId: string,
    vote: string,
  ): Promise<void> {
    const { page } = screenOf(player);
    const game = this.#gameOf(player.name);
    const predicted = game.players.find(({ playerId }) => playerId === predictedId)!;
    const option = dilemma.options.find(({ optionId }) => optionId === vote)!;
    await page
      .getByRole('radiogroup', { name: SCREEN.voteOf(predicted.nickname) })
      .getByRole('radio', { name: textOnScreen(option, game, dilemma), exact: true })
      .click();
  }

  /** How many each other player knows answered the round, before `player` answers it. */
  #answeredCountsHeardByOthers(player: E2ePlayer): ReadonlyMap<E2ePlayer, number> {
    return new Map(this.#othersThan(player).map((other) => [other, heardAnsweredCount(other)]));
  }

  /**
   * Waits until everyone else with the game open heard the player answered, or got the reveal: in
   * an anonymous room, as one more than they had heard before.
   */
  async #untilOthersHearAnswer(
    player: E2ePlayer,
    counts: ReadonlyMap<E2ePlayer, number>,
  ): Promise<void> {
    const playerId = this.#playerIdOf(player);
    await waitUntil(
      () =>
        this.#othersThan(player).every((other) => {
          if (!other.screen?.link) return true;
          if (lastGameOf(other)?.round.phase === 'reveal') return true;
          const about = heardAbout(other, playerId);
          if (about?.answered === true) return true;
          return about?.answered === null && heardAnsweredCount(other) > (counts.get(other) ?? 0);
        }) || undefined,
      `everyone else hears that ${player.name} answered`,
    );
  }

  async #untilEveryoneGetsTheReveal(): Promise<void> {
    await waitUntil(
      () =>
        this.#withScreens()
          .filter(({ screen }) => screen?.link)
          .every((player) => lastGameOf(player)?.round.phase === 'reveal') || undefined,
      'everyone gets the reveal',
      RECONNECTION_TIMEOUT_MS,
    );
  }

  /** Every screen with the game open is on the decision of the round in that position (from 0). */
  async #untilEveryoneIsOnRound(position: number): Promise<void> {
    const online = this.#withScreens().filter(({ screen }) => screen?.link);
    await waitUntil(
      () =>
        online.every(
          (player) =>
            lastGameOf(player)?.round.position === position &&
            lastGameOf(player)?.round.phase === 'decision',
        ) || undefined,
      `everyone gets the round of the dilemma ${position + 1}`,
    );
    await Promise.all(
      online.map(({ screen }) =>
        screen!.page
          .getByText(SCREEN.positionOf(position + 1))
          .first()
          .waitFor(),
      ),
    );
  }

  /** Every screen with the game open opens it again, and gets its state afresh. */
  async #reopenEveryScreen(): Promise<void> {
    const online = this.#withScreens().filter(({ screen }) => screen?.link);
    const before = new Map(online.map((player) => [player, screenOf(player).received.length]));
    await Promise.all(online.map((player) => screenOf(player).page.reload()));
    await waitUntil(
      () =>
        online.every((player) =>
          screenOf(player)
            .received.slice(before.get(player))
            .some((message) => message.type === 'game-state'),
        ) || undefined,
      'every screen gets the game again',
      RECONNECTION_TIMEOUT_MS,
    );
    await Promise.all(
      online.map((player) => screenOf(player).page.getByRole('timer').first().waitFor()),
    );
  }

  /** The notice in the strip of `viewer` of who moved everyone on. */
  #moveOnNoticeOf(viewer: string): Locator {
    const { page } = screenOf(this.#playerCalled(viewer));
    return page.getByRole('status').filter({ hasText: SCREEN.movedOn });
  }

  /**
   * Reads the list of the group on the screen of `viewer`: on the waiting screen, where it is; on a
   * dilemma or a reveal, in the sheet that «Ver el grupo» opens from the menu, closed afterwards.
   */
  async #readGroup<T>(viewer: string, read: (group: Locator) => Promise<T>): Promise<T> {
    const { page } = screenOf(this.#playerCalled(viewer));
    if ((await page.getByRole('heading', { name: SCREEN.waiting }).count()) > 0) {
      return steady(() => read(page.getByRole('main')));
    }
    const menu = page.getByRole('button', { name: SCREEN.moreOptions });
    // After the passage to a reveal, which has no menu.
    await menu.waitFor({ timeout: WAIT_TIMEOUT_MS }).catch(() => undefined);
    if ((await menu.count()) === 0) {
      throw new Error(`${viewer} is on the predictions, which do not show the group`);
    }
    await menu.click();
    await page.getByRole('button', { name: SCREEN.showGroup }).click();
    const sheet = page.getByRole('dialog', { name: SCREEN.groupTitle });
    const result = await steady(() => read(sheet));
    await sheet.getByRole('button', { name: SCREEN.close, exact: true }).click();
    await sheet.waitFor({ state: 'hidden' });
    return result;
  }

  async #untilRoomKeeps(
    player: E2ePlayer,
    dilemmaId: string,
    kept: (answer: GameStateDto['answers'][number]) => boolean,
  ): Promise<void> {
    await waitUntil(
      () =>
        lastGameOf(player)?.answers.some(
          (answer) => answer.dilemmaId === dilemmaId && kept(answer),
        ),
      `the room keeps the answer of ${player.name} for ${dilemmaId}`,
    );
  }

  async #withDatabase<T>(work: (db: DatabaseClient) => Promise<T>): Promise<T> {
    const { db, close } = await openDatabase<Database>(
      { kind: 'url', url: this.#stack.databaseUrl },
      { maxConnections: 1, logger: new ConsoleLogger() },
    );
    try {
      return await work(db);
    } finally {
      await close();
    }
  }

  /** The name the scenario gives the player with that id. */
  #nameOf(playerId: string): string {
    const found = [...this.#players.values()].find((player) => player.playerId === playerId);
    if (!found) throw new Error(`No player of the scenario has the id ${playerId}`);
    return found.name;
  }

  /** The player of that name, with a browser of their own, opened the first time they need it. */
  async #withScreen(name: string, locale = SPANISH): Promise<E2ePlayer> {
    const known = this.#players.get(name);
    if (known?.screen) return known;
    if (known) throw new Error(`${name} came in without a screen, and the scenario needs one`);

    const context = await this.#newContext({
      locale,
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    // Below the timeout of a step, so a failure names what the screen did not show.
    context.setDefaultTimeout(WAIT_TIMEOUT_MS);
    // A desktop browser without the share sheet of a phone: the screen copies the link instead.
    await context.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'share', { value: undefined, configurable: true });
    });
    const screen: PlayerScreen = {
      context,
      page: await context.newPage(),
      sent: [],
      received: [],
      link: undefined,
      online: true,
    };
    const player: E2ePlayer = {
      name,
      nickname: name,
      playerId: undefined,
      screen,
      preview: undefined,
      refusal: undefined,
      askedForAnotherAvatar: false,
      creatingRoom: false,
    };
    this.#players.set(name, player);

    const realtime = new URL(this.#stack.realtimeUrl);
    await context.routeWebSocket(
      (url) => url.host === realtime.host,
      (socket) => this.#link(player, screen, socket),
    );
    return player;
  }

  /** A phone whose web talks to the room server of the run, wherever it listens. */
  async #newContext(options: BrowserContextOptions): Promise<BrowserContext> {
    const context = await this.#stack.browser.newContext({ viewport: PHONE, ...options });
    const realtime = new URL(this.#stack.realtimeUrl);
    await context.route('**/config.json', async (route) => {
      const response = await route.fetch();
      const config = (await response.json()) as Record<string, unknown>;
      await route.fulfill({
        response,
        json: { ...config, realtimeUrl: realtime.origin.replace(/^http/, 'ws') },
      });
    });
    return context;
  }

  /** A player a Given brings in over HTTP, signed in on the Auth emulator, with no browser. */
  async #joinWithoutScreen(name: string, nickname: string): Promise<void> {
    const signUp = await fetch(
      `http://${this.#stack.authEmulatorHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnSecureToken: true }),
      },
    );
    const { idToken } = (await signUp.json()) as { readonly idToken: string };
    const { roomId, code } = this.#lobbyOf(this.#hostName());
    const authorization = { Authorization: `Bearer ${idToken}` };
    const previewed = await fetch(`${this.#stack.realtimeUrl}/rooms/by-code/${code}`, {
      headers: authorization,
    });
    const { suggestedAvatar } = RoomPreviewResponseDto.parse(await previewed.json());
    const joined = await fetch(`${this.#stack.realtimeUrl}/rooms/${roomId}/players`, {
      method: 'POST',
      headers: { ...authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, avatar: suggestedAvatar }),
    });
    if (!joined.ok) throw new Error(`${name} could not join: ${await joined.text()}`);
    const { playerId } = JoinRoomResponseDto.parse(await joined.json());
    this.#players.set(name, {
      name,
      nickname,
      playerId,
      screen: undefined,
      preview: undefined,
      refusal: undefined,
      askedForAnotherAvatar: false,
      creatingRoom: false,
    });
    await this.#untilEveryoneSees(`${name} is in the room`, (lobby) =>
      lobby.players.some((seen) => seen.playerId === playerId),
    );
  }

  /** Joins the socket of the page to the room server, keeping what goes through it. */
  #link(player: E2ePlayer, screen: PlayerScreen, socket: WebSocketRoute): void {
    if (!screen.online) {
      socket.close();
      return;
    }
    const server = socket.connectToServer();
    const link = { page: socket, server };
    screen.link = link;

    socket.onMessage((message) => {
      const parsed = ClientMessageDto.safeParse(JSON.parse(String(message)));
      if (parsed.success) screen.sent.push(parsed.data);
      server.send(message);
    });
    server.onMessage((message) => {
      const parsed = ServerMessageDto.safeParse(JSON.parse(String(message)));
      if (parsed.success) {
        screen.received.push(parsed.data);
        if (isState(parsed.data)) player.playerId = parsed.data.playerId;
      }
      socket.send(message);
    });
    // Either end closing closes the other, as with no driver in between.
    socket.onClose(() => {
      if (screen.link === link) screen.link = undefined;
      server.close();
    });
    server.onClose(() => {
      if (screen.link === link) screen.link = undefined;
      socket.close();
    });
  }

  /** What the join screen shows: the room before entering it, or why the player cannot. */
  async #readJoinScreen(opener: E2ePlayer): Promise<void> {
    const { page } = screenOf(opener);
    await page.locator('[data-testid="room-of"], [role="alert"] h1').first().waitFor();
    opener.refusal = await this.#refusalOn(page);
    if (opener.refusal) {
      opener.preview = undefined;
      return;
    }
    const roomOf = (await page.getByTestId('room-of').textContent()) ?? '';
    const count = (await page.getByTestId('player-count').textContent()) ?? '';
    const variant = (await page.getByTestId('room-variant').textContent()) ?? '';
    const avatars = await page
      .getByTestId('room-avatars')
      .locator('[data-face]')
      .evaluateAll((faces) =>
        faces.map((face) => `${face.getAttribute('data-face')}/${face.getAttribute('data-color')}`),
      );
    opener.preview = {
      host: roomOf.match(SCREEN.roomOf)?.[1] ?? '',
      playerCount: Number(count.match(SCREEN.inTheRoom)?.[1]),
      avatars,
      variant: variant.includes(SCREEN.anonymous) ? 'anonymous' : 'nominal',
      adultsOnly: (await page.getByTestId('room-adults-only').count()) > 0,
    };
  }

  /** Why the screen says the player cannot enter, if it does. */
  async #refusalOn(page: Page): Promise<JoinRefusal | undefined> {
    const title = page.locator('[role="alert"] h1');
    if ((await title.count()) === 0) return undefined;
    return SCREEN.refusals[(await title.textContent()) ?? ''];
  }

  /** The link the QR at full screen carries; it closes the QR again. */
  async #qrLinkOf(player: string): Promise<string> {
    const { page } = screenOf(this.#playerCalled(player));
    const code = await this.roomCodeSeenBy(player);
    await page.getByRole('button', { name: SCREEN.showQr }).click();
    const qr = page.getByRole('img', { name: SCREEN.qr(code) });
    const link = (await qr.getAttribute('data-link')) ?? '';
    await page.getByRole('dialog').getByRole('button', { name: SCREEN.close }).click();
    await qr.waitFor({ state: 'hidden' });
    return link;
  }

  /** Whether whoever follows the link sees that room before entering it. */
  async #opensTheRoom(link: string, code: string): Promise<boolean> {
    const context = await this.#newContext({ locale: SPANISH });
    try {
      const page = await context.newPage();
      await page.goto(link);
      const roomOf = page.getByTestId('room-of');
      await roomOf.waitFor();
      return (await roomOf.textContent())?.endsWith(code) ?? false;
    } finally {
      await context.close();
    }
  }

  /** The next answer of the room server to a search of the page, with what it found. */
  /** From the settings: by categories, the link to pick; by hand, the row of the picked ones. */
  async #openPickSheet(host: string): Promise<void> {
    const { page } = screenOf(this.#playerCalled(host));
    const byHand = this.#lobbyOf(host).pickedDilemmas.length > 0;
    await page.getByRole('button', { name: SCREEN.change, exact: true }).click();
    const sheet = page.getByRole('dialog');
    const open = byHand ? SCREEN.changePicked : SCREEN.pick;
    await sheet.getByRole('button', { name: open, exact: true }).click();
  }

  async #nextSearchOn(
    page: Page,
    containing = '',
  ): Promise<readonly { readonly dilemmaId: string; readonly text: string }[]> {
    const response = await page.waitForResponse(
      (candidate) =>
        candidate.request().method() === 'GET' &&
        /\/rooms\/[^/]+\/dilemmas/.test(candidate.url()) &&
        candidate.url().includes(containing),
    );
    const { dilemmas } = (await response.json()) as {
      readonly dilemmas: readonly { readonly dilemmaId: string; readonly text: string }[];
    };
    return dilemmas;
  }

  /** The host presses start: every player with a screen gets the game. */
  async #start(host: string): Promise<void> {
    const { page } = screenOf(this.#playerCalled(host));
    await page.getByRole('button', { name: SCREEN.start }).click();
    const inTheRoom = this.#withScreens().filter(
      (player) =>
        player.playerId !== undefined &&
        this.#playersOfTheRoom().some(({ playerId }) => playerId === player.playerId),
    );
    await Promise.all(
      inTheRoom.map(async (player) => {
        await waitUntil(() => lastGameOf(player), `${player.name} gets the game`);
        await screenOf(player).page.getByText(SCREEN.position).waitFor();
      }),
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
          if (!other.screen?.link) return true;
          const about = heardAbout(other, playerId);
          return about !== undefined && heard(about);
        }) || undefined,
      `everyone else hears that ${player.name} ${what}`,
    );
  }

  /** Waits until every player with the lobby open on a screen sees that. */
  async #untilEveryoneSees(what: string, sees: (lobby: RoomStateDto) => boolean): Promise<void> {
    await waitUntil(
      () =>
        this.#withScreens().every((player) => {
          const last = player.screen?.received.findLast(isState);
          // The game, an expulsion or a closed socket leave the lobby behind.
          if (last?.type !== 'room-state' || !player.screen?.link) return true;
          return sees(last);
        }) || undefined,
      `everyone in the lobby sees ${what}`,
    );
  }

  /** Who is in the room, from the last state the host got: the lobby or the game. */
  #playersOfTheRoom(): readonly { readonly playerId: string }[] {
    const host = this.#playerCalled(this.#hostName());
    const last = host.screen?.received.findLast(isState);
    return last?.players ?? [];
  }

  #lobbyOf(player: string): RoomStateDto {
    const lobby = lastLobbyOf(this.#playerCalled(player));
    if (!lobby) throw new Error(`${player} has no lobby open`);
    return lobby;
  }

  #gameOf(player: string): GameStateDto {
    const game = lastGameOf(this.#playerCalled(player));
    if (!game) throw new Error(`${player} has no game open`);
    return game;
  }

  /** The dilemma as the room server sent it to the player, with the ids and texts of its options. */
  #dilemmaOn(player: E2ePlayer, dilemmaId: string): GameStateDto['dilemmas'][number] {
    const dilemma = lastGameOf(player)?.dilemmas.find((d) => d.dilemmaId === dilemmaId);
    if (!dilemma) throw new Error(`${player.name} did not get the dilemma ${dilemmaId}`);
    return dilemma;
  }

  /** The scenario counts dilemmas from 1, as people do, in the order every player gets them. */
  #dilemmaIdAt(position: number): string {
    const dilemmaId = this.#gameOf(this.#hostName()).dilemmas[position - 1]?.dilemmaId;
    if (!dilemmaId) throw new Error(`The game has no dilemma in position ${position}`);
    return dilemmaId;
  }

  #withScreens(): E2ePlayer[] {
    return [...this.#players.values()].filter(({ screen }) => screen !== undefined);
  }

  #othersThan(player: E2ePlayer): E2ePlayer[] {
    return [...this.#players.values()].filter((other) => other !== player);
  }

  #playerIdOf(player: E2ePlayer): string {
    if (!player.playerId) throw new Error(`${player.name} is not in the room`);
    return player.playerId;
  }

  #hostName(): string {
    if (!this.#host) throw new Error('The scenario has no room yet');
    return this.#host;
  }

  /** A name that no step introduced is a mistake in the scenario, not in the game. */
  #playerCalled(name: string): E2ePlayer {
    const player = this.#players.get(name);
    if (!player) throw new Error(`No player called "${name}" in this scenario`);
    return player;
  }
}

function screenOf(player: E2ePlayer): PlayerScreen {
  if (!player.screen) throw new Error(`${player.name} has no screen in this scenario`);
  return player.screen;
}

function isState(message: ServerMessageDto): message is RoomStateDto | GameStateDto {
  return message.type === 'room-state' || message.type === 'game-state';
}

/** The lobby, while the last state the player got is the one of the lobby. */
function lastLobbyOf({ screen }: E2ePlayer): RoomStateDto | undefined {
  const last = screen?.received.findLast(isState);
  return last?.type === 'room-state' ? last : undefined;
}

function lastGameOf({ screen }: E2ePlayer): GameStateDto | undefined {
  return screen?.received.findLast(
    (message): message is GameStateDto => message.type === 'game-state',
  );
}

/** Picks a single choice drawn as a card: its label, as the player taps it. */
async function chooseOption(within: Page | Locator, label: string): Promise<void> {
  const option = within
    .locator('label')
    .filter({ hasText: new RegExp(`^\\s*${escaped(label)}\\s*$`) });
  await option.click();
  if (!(await option.locator('input').isChecked())) {
    throw new Error(`Choosing "${label}" did not check it`);
  }
}

/** The position (from 1) of the dilemma on the screen of the page. */
async function positionOn(page: Page): Promise<number> {
  const text = await page.getByText(SCREEN.position).textContent();
  const position = text?.match(SCREEN.position)?.[1];
  if (position === undefined) throw new Error('The screen shows no dilemma');
  return Number(position);
}

function escaped(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** What a player knows about another one: null for whether they answered, in an anonymous room. */
interface HeardAbout {
  readonly connected: boolean;
  readonly answered: boolean | null;
}

/** What the player knows about the one with that id, from every message they received. */
function heardAbout({ screen }: E2ePlayer, playerId: string): HeardAbout | undefined {
  let about: HeardAbout | undefined;
  for (const message of screen?.received ?? []) {
    if (message.type === 'game-state') {
      about = message.players.find((player) => player.playerId === playerId);
    } else if (message.type === 'room-state') {
      const seen = message.players.find((player) => player.playerId === playerId);
      about = seen && { connected: seen.connected, answered: false };
    } else if (message.type === 'player-answered' && message.playerId === playerId && about) {
      about = { ...about, answered: true };
    } else if (message.type === 'connection-changed' && message.playerId === playerId && about) {
      about = { ...about, connected: message.connected };
    }
  }
  return about;
}

/** How many the player knows answered the dilemma of the round, from every message they received. */
function heardAnsweredCount({ screen }: E2ePlayer): number {
  let count = 0;
  for (const message of screen?.received ?? []) {
    if (message.type === 'game-state') count = message.answeredCount;
    else if (message.type === 'answered-count') count = message.answeredCount;
  }
  return count;
}

/** The option of the dilemma with that text, as a scenario names it. */
function optionCalled(
  dilemma: GameStateDto['dilemmas'][number],
  text: string,
): GameStateDto['dilemmas'][number]['options'][number] {
  const option = dilemma.options.find(
    (candidate) => candidate.text.toLowerCase() === text.toLowerCase(),
  );
  if (!option) throw new Error(`The dilemma has no option "${text}"`);
  return option;
}

/** The first option of the dilemma in the order of the test data, whatever order the player sees. */
function firstOptionOf(
  dilemma: GameStateDto['dilemmas'][number],
): GameStateDto['dilemmas'][number]['options'][number] {
  const [first] = dilemma.options.toSorted((a, b) => a.optionId.localeCompare(b.optionId));
  if (!first) throw new Error(`The dilemma ${dilemma.dilemmaId} has no options`);
  return first;
}

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function overlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
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

/** A dilemma as the lists of the lobby show it: with «alguien del grupo» in its gap. */
function listedText({ text }: { readonly text: string }): string {
  return text.replaceAll(GAP_MARKER, SCREEN.someoneInTheGroup);
}

/** A text of a dilemma or an option as the screen shows it, with the nickname in the gap. */
function textOnScreen(
  { text }: { readonly text: string },
  game: GameStateDto | undefined,
  dilemma?: GameStateDto['dilemmas'][number],
): string {
  if (!text.includes(GAP_MARKER)) return text;
  const personId =
    dilemma?.personInTheGap ??
    game?.dilemmas.find((candidate) => candidate.text === text)?.personInTheGap;
  const person = game?.players.find(({ playerId }) => playerId === personId)?.nickname;
  return person ? text.replaceAll(GAP_MARKER, person) : text;
}
