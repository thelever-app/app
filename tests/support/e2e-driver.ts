import { type Database, ConsoleLogger, openDatabase } from '@thelever-app/db';
import {
  ClientMessageDto,
  JoinRoomResponseDto,
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
  CatalogEntry,
  GameDriver,
  GameSettingsView,
  InvitationMethod,
  JoinRefusal,
  PlayerView,
  RoomChoices,
  RoomPreview,
  SettingsView,
} from './driver.ts';
import type { E2eStack } from './e2e-stack.ts';
import { catalogEntryOf, explorationSlotsFor } from './test-catalog.ts';

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
  totalTime: 'Tiempo total',
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
  group: 'Progreso del grupo',
  progressCount: /(\d+)\/\d+/,
  showAll: 'Ver todos',
  disconnected: 'desconectado',
  back: 'Volver al dilema anterior',
  continue: 'Continuar',
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

  async createRoom(host: string, choices: RoomChoices = {}): Promise<void> {
    const player = await this.#withScreen(host, LOCALES[choices.deviceLanguage ?? 'es'] ?? SPANISH);
    const { page } = screenOf(player);
    await page.goto(`${this.#stack.webUrl}/`);
    await page.getByRole('button', { name: SCREEN.create }).click();

    const nickname = page.getByRole('textbox', { name: SCREEN.nickname });
    const natures = page.getByRole('group', { name: SCREEN.natureGroup });
    this.#askedTogether = (await nickname.isVisible()) && (await natures.isVisible());
    await nickname.fill(host);
    await chooseOption(page, SCREEN.natures[(choices.groupNature ?? 'friends') as 'friends']);
    await chooseOption(page, SCREEN.places[(choices.place ?? 'together') as 'together']);
    await page.getByRole('button', { name: SCREEN.create }).click();

    await page.waitForURL(/\/rooms\//);
    await waitUntil(() => lastLobbyOf(player), `${host} gets the lobby of their room`);
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
    const code = await this.roomCodeSeenBy(this.#hostName());
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

  async confirmNickname(player: string, nickname: string): Promise<void> {
    const joiner = this.#playerCalled(player);
    const { page } = screenOf(joiner);
    await page.getByRole('textbox', { name: SCREEN.nickname }).fill(nickname);
    await page.getByRole('button', { name: SCREEN.enter }).click();

    await page.locator('[data-testid="room-code"], [role="alert"] h1').first().waitFor();
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

  /** In the picker: the first colour and face that nobody in the room shows, the player included. */
  async chooseAnotherFreeAvatar(player: string): Promise<string> {
    const chooser = this.#playerCalled(player);
    const { page } = screenOf(chooser);
    const taken = new Set((await this.playersSeenBy(player)).map(({ avatar }) => avatar));
    await page.getByRole('button', { name: SCREEN.toChangeAvatar }).click();
    const picker = page.getByRole('dialog');

    for (const [color, colorName] of Object.entries(SCREEN.colors)) {
      await picker.getByRole('button', { name: colorName, exact: true }).click();
      for (let number = 1; number <= 12; number += 1) {
        const avatar = `face-${String(number).padStart(2, '0')}/${color}`;
        const face = picker.getByRole('button', { name: SCREEN.face(number), exact: true });
        if (taken.has(avatar) || (await face.isDisabled())) continue;
        await face.click();
        await picker.getByRole('button', { name: SCREEN.useAvatar }).click();
        const playerId = this.#playerIdOf(chooser);
        await this.#untilEveryoneSees(`${player} has the avatar ${avatar}`, (lobby) =>
          lobby.players.some(
            (seen) =>
              seen.playerId === playerId && `${seen.avatar.face}/${seen.avatar.color}` === avatar,
          ),
        );
        return avatar;
      }
    }
    throw new Error('The room has no free avatar left');
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
      } else if (setting === 'totalTimeInMinutes') {
        const group = sheet.getByRole('group', { name: SCREEN.totalTime });
        await chooseOption(group, `${value} min`);
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
      .getByRole('button', { name: new RegExp(`^${escaped(first.text)}`) })
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
    if (first) await sheet.getByText(first.text, { exact: true }).waitFor();
    await page.keyboard.press('Escape');
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
      await sheet.getByRole('checkbox', { name: new RegExp(`^${escaped(dilemma.text)}`) }).click();
    }
    await sheet.getByRole('button', { name: SCREEN.play(dilemmaIds.length) }).click();
    await this.#untilEveryoneSees('the picked dilemmas', (lobby) =>
      isDeepStrictEqual(
        lobby.pickedDilemmas.map(({ dilemmaId }) => dilemmaId).toSorted(),
        dilemmaIds.toSorted(),
      ),
    );
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
        .select(['variant', 'place', 'dilemma_language', 'total_time_in_minutes'])
        .where('id', '=', gameId)
        .executeTakeFirstOrThrow();
      return {
        variant: game.variant,
        place: game.place,
        dilemmaLanguage: game.dilemma_language,
        totalTimeInMinutes: game.total_time_in_minutes,
      };
    } finally {
      await close();
    }
  }

  newDilemmasSetForGamesOf(dilemmaCount: number): number {
    return explorationSlotsFor(dilemmaCount);
  }

  // Decision phase

  async startDecisionPhase(): Promise<void> {
    await this.startGame(this.#hostName());
  }

  /** Answers the first `count` dilemmas of the game, in order, with their first option. */
  async answerDilemmas(player: string, count: number): Promise<void> {
    const answerer = this.#playerCalled(player);
    for (const { dilemmaId, options } of this.#gameOf(player).dilemmas.slice(0, count)) {
      const [first] = options;
      if (!first) throw new Error(`The dilemma ${dilemmaId} has no options`);
      await this.#answer(answerer, dilemmaId, first.optionId);
    }
  }

  async changeVote(player: string, position: number): Promise<void> {
    const answerer = this.#playerCalled(player);
    const { page } = screenOf(answerer);
    const dilemmaId = this.#dilemmaIdAt(position);
    const [previous] = (await this.votesCastFor(player, position)).slice(-1);
    if (!previous) throw new Error(`The scenario changes a vote ${player} never cast`);
    const other = this.#dilemmaOn(answerer, dilemmaId).options.find(
      ({ optionId }) => optionId !== previous,
    );
    if (!other) throw new Error(`The dilemma ${dilemmaId} has no other option`);

    // Back one dilemma at a time, as the player would.
    while ((await positionOn(page)) > position) {
      await page.getByRole('button', { name: SCREEN.back }).click();
    }
    await this.#answer(answerer, dilemmaId, other.optionId);
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

  /** What the room server last told `player` it keeps for them, in the order of the dilemmas. */
  async votesRecordedFor(player: string): Promise<string[]> {
    const game = this.#gameOf(player);
    const order = game.dilemmas.map(({ dilemmaId }) => dilemmaId);
    return game.answers
      .toSorted((a, b) => order.indexOf(a.dilemmaId) - order.indexOf(b.dilemmaId))
      .map(({ vote }) => vote);
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

  async dilemmaShownTo(player: string): Promise<number> {
    const { page } = screenOf(this.#playerCalled(player));
    return steady(() => positionOn(page));
  }

  /** Whether `viewer` sees `player` as connected, in the sheet with the whole group. */
  async connectionSeenBy(viewer: string, player: string): Promise<boolean | undefined> {
    const { page } = screenOf(this.#playerCalled(viewer));
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
    const { page } = screenOf(this.#playerCalled(viewer));
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
    return this.#othersThan(this.#playerCalled(player)).flatMap(({ screen }) =>
      (screen?.received ?? []).filter((message) => message.type !== 'game-state'),
    );
  }

  async votesCastBy(player: string): Promise<string[]> {
    return (this.#votes.get(player) ?? []).map(({ vote }) => vote);
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
    const { roomId } = this.#lobbyOf(this.#hostName());
    const joined = await fetch(`${this.#stack.realtimeUrl}/rooms/${roomId}/players`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname }),
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
    opener.preview = {
      host: roomOf.match(SCREEN.roomOf)?.[1] ?? '',
      playerCount: Number(count.match(SCREEN.inTheRoom)?.[1]),
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

  /** Chooses the option on screen and continues, then waits until the room has the vote. */
  async #answer(player: E2ePlayer, dilemmaId: string, vote: string): Promise<void> {
    const dilemma = this.#dilemmaOn(player, dilemmaId);
    const option = dilemma.options.find(({ optionId }) => optionId === vote);
    if (!option) throw new Error(`The dilemma ${dilemmaId} has no option ${vote}`);

    const isNew = !lastGameOf(player)?.answers.some((answer) => answer.dilemmaId === dilemmaId);
    const { page } = screenOf(player);
    await page.getByRole('heading', { level: 1, name: dilemma.text }).waitFor();
    await page.getByRole('radio', { name: option.text, exact: true }).click();
    await page.getByRole('button', { name: SCREEN.continue }).click();
    this.#votes.set(player.name, [...(this.#votes.get(player.name) ?? []), { dilemmaId, vote }]);

    await waitUntil(
      () =>
        lastGameOf(player)?.answers.some(
          (answer) => answer.dilemmaId === dilemmaId && answer.vote === vote,
        ),
      `the room keeps the vote of ${player.name} for ${dilemmaId}`,
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

/** What a player knows about another one. */
interface HeardAbout {
  readonly connected: boolean;
  readonly progress: number;
}

/** What the player knows about the one with that id, from every message they received. */
function heardAbout({ screen }: E2ePlayer, playerId: string): HeardAbout | undefined {
  let about: HeardAbout | undefined;
  for (const message of screen?.received ?? []) {
    if (message.type === 'game-state') {
      about = message.players.find((player) => player.playerId === playerId);
    } else if (message.type === 'room-state') {
      const seen = message.players.find((player) => player.playerId === playerId);
      about = seen && { connected: seen.connected, progress: 0 };
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
