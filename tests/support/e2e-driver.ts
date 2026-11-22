import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  type Database,
  type DatabaseClient,
  ConsoleLogger,
  openDatabase,
  PostgresDilemmaRepository,
  PostgresWorldResultRepository,
} from '@thelever-app/db';
import {
  GetPublicCatalogUseCase,
  ImportCatalogUseCase,
  PublishWorldResultsUseCase,
  VoteAloneUseCase,
} from '@thelever-app/dilemmas';
import { InMemoryCuratedCatalog, LanguageTagTranslator } from '@thelever-app/dilemmas/in-memory';
import {
  buildSite,
  type BuiltSite,
  LANGUAGES as SITE_LANGUAGES,
  publishSite,
} from '@thelever-app/site';
import {
  CategoryDto,
  ClientMessageDto,
  GAP_MARKER,
  JoinRoomResponseDto,
  LanguageDto,
  RoomPreviewResponseDto,
  ServerMessageDto,
  TitleDto,
  type GameStateDto,
  type RoomStateDto,
  FirstAccessResponseDto,
} from '@thelever-app/protocol';
import { isDeepStrictEqual } from 'node:util';
import { currentVersionOf, PUBLISHED_VERSIONS } from '@thelever-app/consent';
import {
  DistributionPredictionVO,
  GAME_LIKE_WEIGHT,
  type PredictedShare,
} from '@thelever-app/game';
import type { Category } from '@thelever-app/game';
import type {
  BrowserContext,
  BrowserContextOptions,
  Locator,
  Page,
  Response,
  WebSocketRoute,
} from 'playwright';
import type {
  AnswerStepsView,
  AnswerPlan,
  CardView,
  CatalogEntry,
  DeviceOptions,
  CreditsView,
  DonationLinks,
  FundingView,
  FirstAccessScreen,
  LegalDocument,
  DistributionPredictionView,
  EndOfTheGameView,
  PredictedShareView,
  RankedView,
  GameDriver,
  GameSettingsView,
  InvitationMethod,
  JoinRefusal,
  PlayerView,
  PublicPageView,
  ReactionsView,
  RecordedAnswer,
  RecordedLike,
  RecordedReaction,
  ReportReason,
  ResultsScreenView,
  RevealView,
  RoomChoices,
  RoomPreview,
  RoundSetting,
  RoundView,
  SettingsView,
  TitleView,
  WorldResultView,
  Ambience,
  AmbienceOption,
  MarkedDilemma,
  OffReason,
  RoundContent,
  ContentChoices,
  OpenSettingsView,
  SupportInvitationView,
  SupportLineView,
  SwitchView,
} from './driver.ts';
import type { E2eStack } from './e2e-stack.ts';
import {
  catalogEntryOf,
  explorationSlotsFor,
  roundsForAGameOf,
  SPANISH_OPTION_TEXTS,
  TEST_DILEMMAS,
} from './test-catalog.ts';

/** Who opens the public web, by the name the driver gives their screen. */
const VISITOR = 'Visitor';

/**
 * Test data: the numbers of the curated catalog the scenarios load into the database of their
 * worker, apart from those of the other workers and of the catalog itself.
 */
let nextCatalogNumber = 900_000 + Number(process.env.CUCUMBER_WORKER_ID ?? 0) * 10_000;

/** What the visitor sees on the public page of a dilemma open on that page. */
async function publicPageSeenOn(page: Page, response: Response | null): Promise<PublicPageView> {
  const language = (await page.locator('html').getAttribute('lang')) ?? '';
  const robots = await page.locator('meta[name="robots"]').count();
  const header = (await response?.allHeaders())?.['x-robots-tag'];
  const alternates = await page
    .locator('link[rel="alternate"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('hreflang') ?? ''));
  const argued = await page.locator('.argument').all();
  return {
    language,
    text: (await page.locator('.dilemma-text').textContent())?.trim() ?? '',
    options: (await page.locator('.options li').allTextContents()).map((text) => text.trim()),
    arguments: await Promise.all(
      argued.map(async (argument) => {
        const [forIt, againstIt] = await argument.locator('p').allTextContents();
        return { for: forIt?.trim() ?? '', against: againstIt?.trim() ?? '' };
      }),
    ),
    ...((await page.locator('[itemprop="author"]').count()) > 0 && {
      author: (await page.locator('[itemprop="author"]').first().textContent()) ?? '',
    }),
    ...((await page.locator('[data-world-result]').count()) > 0 && {
      worldResult: (await page.locator('[data-world-result]').first().textContent()) ?? '',
    }),
    otherLanguages: alternates.filter((other) => other !== language && other !== 'x-default'),
    indexable: robots === 0 && header === undefined,
  };
}

/** The catalogs of the web, by language: what a player whose app is in that language reads. */
const CATALOGS: ReadonlyMap<string, object> = new Map(
  LanguageDto.options.map((language) => [
    language,
    JSON.parse(
      readFileSync(
        new URL(`../../apps/web/src/i18n/locales/${language}.json`, import.meta.url),
        'utf8',
      ),
    ) as object,
  ]),
);

/** The text of the catalog of that language under the key, with its nested parts joined by dots. */
function textIn(language: string, key: string): string {
  const text = key
    .split('.')
    .reduce<unknown>(
      (part, name) => (part as Record<string, unknown> | undefined)?.[name],
      CATALOGS.get(language),
    );
  if (typeof text !== 'string') throw new Error(`The ${language} catalog has no text "${key}"`);
  return text;
}

/** The text of the Spanish catalog under the key, with the values in its placeholders. */
function spanish(key: string, values: Readonly<Record<string, string | number>> = {}): string {
  return textIn('es', pluralOf(key, values.count)).replace(
    /\{\{(\w+)[^}]*\}\}/g,
    (_, name: string) => {
      const value = values[name];
      if (value === undefined) throw new Error(`The text "${key}" needs a value for ${name}`);
      return String(value);
    },
  );
}

/** The key of the Spanish plural form for the count, when the text has plural forms. */
function pluralOf(key: string, count: string | number | undefined): string {
  if (typeof count !== 'number') return key;
  const plural = `${key}_${new Intl.PluralRules('es').select(count)}`;
  try {
    textIn('es', key);
    return key;
  } catch {
    return plural;
  }
}

/** Any text of the Spanish catalog under the key, whatever its placeholders say. */
function spanishPattern(key: string): RegExp {
  const [before, ...rest] = textIn('es', key).split(/\{\{[^}]*\}\}/);
  return new RegExp(`^${[before, ...rest].map((part) => escaped(part ?? '')).join('.+')}$`);
}

/**
 * The position of the dilemma on screen as each language writes it, with the position as its only
 * group: «Dilema 2 de 5», «Dilemma 2 of 5»…
 */
const POSITIONS = LanguageDto.options.map(
  (language) =>
    new RegExp(
      textIn(language, 'progressStrip.position')
        .replace(/[.*+?^$()|[\]\\]/g, '\\$&')
        .replace(/\{\{position[^}]*\}\}/, '(\\d+)')
        .replace(/\{\{total[^}]*\}\}/, '\\d+'),
    ),
);

/** What the driver looks for on screen, in the language of the browsers: es.json of the web. */
const SCREEN = {
  create: 'Crear sala',
  joinWithCode: 'Unirme con un código',
  nickname: 'Tu apodo',
  natureGroup: '¿Con quién vas a jugar?',
  places: { together: 'En el mismo sitio', remote: 'A distancia' },
  code: 'Código de la sala',
  enter: 'Entrar en la sala',
  enterCode: 'Entrar',
  settingsTitle: 'Ajustes de la partida',
  someoneInTheGroup: 'alguien del grupo',
  predictionRight: /^(.+), acertaste$/,
  predictionMissed: /^(.+), fallaste: dijiste [A-D]$/,
  changeAvatar: 'Cambiar avatar',
  missingAvatar: 'Elige otro avatar',
  namesake: /^(.+) ya está en la sala; os distinguirá el avatar\.$/,
  host: 'Anfitrión',
  share: 'Compartir enlace',
  copied: 'Enlace copiado',
  showQr: 'Mostrar QR',
  gameRoomCode: /^Código ([A-Z0-9]{5})$/,
  lateJoin: 'La partida ya ha empezado',
  enterTheRound: 'Entrar en la ronda',
  qr: (code: string) => `Código QR de la sala ${code}`,
  close: 'Cerrar',
  videoCall: 'videollamada',
  configure: 'Configurar',
  save: 'Guardar',
  variants: { nominal: 'Nominal', anonymous: 'Anónimo' },
  switches: {
    adultsOnly: 'Incluir dilemas +18',
    compromisingDilemmas: 'Dilemas comprometidos',
    newDilemmas: 'Incluir dilemas nuevos',
  },
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
  timePerDilemma: 'Tiempo por dilema',
  search: 'Buscar dilemas',
  more: 'Ver más',
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
    'Esta sala tiene dilemas +18': 'adults-only',
  } as Readonly<Record<string, JoinRefusal>>,
  roomOf: /^Sala de (.+) · [A-Z0-9]{5}$/,
  inTheRoom: /^(\d+) en la sala$/,
  anonymous: 'Sala anónima',
  /** The position of the dilemma, in the language of whoever reads it. */
  position: new RegExp(POSITIONS.map(({ source }) => `(?:${source})`).join('|')),
  positionOf: (position: number) =>
    new RegExp(
      POSITIONS.map(({ source }) => `(?:${source.replace('(\\d+)', String(position))})`).join('|'),
    ),
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
  movedOn: /(.+) pasó a todos/,
  moveEveryoneOn: spanish('moveOn.everyone'),
  waitingForTheRest: spanish('moveOn.waiting'),
  readyToMoveOn: /(\d+) de (\d+) listos para seguir/,
  previous: /anterior/i,
  points: /\bpuntos?\b/i,
  back: 'Volver a tu voto',
  continue: 'Continuar',
  choose: 'Elige una opción',
  predictQuestion: spanish('predict.voteQuestion'),
  answerSteps: spanish('answerSteps.label'),
  voteStep: spanish('answerSteps.vote'),
  aboutYou: spanish('aboutYou.title'),
  aboutYouQuestion: spanish('predict.aboutYouQuestion'),
  gapWarning: spanish('lobby.gapWarningTitle'),
  voteOf: (nickname: string) => `El voto de ${nickname}`,
  next: 'Siguiente dilema',
  moreOptions: 'Más opciones',
  mute: 'Silenciar el juego',
  sound: /^Sonido/,
  report: 'Reportar este dilema',
  reasons: { offensive: 'Ofensivo', confusing: 'Confuso' },
  sendReport: 'Enviar reporte',
  skip: 'Saltar dilema',
  leave: 'Salir de la partida',
  reveal: spanish('reveal.region'),
  toResults: spanish('reveal.toResults'),
  yourVote: spanish('distribution.yourVote'),
  rankingTitle: spanish('ranking.title'),
  nominalRankingTitle: spanish('ranking.nominalTitle'),
  rankingNext: spanish('ranking.next'),
  resultsNext: spanish('results.next'),
  resultsBack: spanish('results.back'),
  endTitles: spanish('end.titles'),
  resultsLabel: spanishPattern('results.label'),
  knownBest: spanish('results.knowsTitle'),
  like: spanish('reveal.like'),
  dilemmaReactions: spanish('reveal.dilemmaReactions'),
  reactToDilemma: spanish('reveal.reactToDilemma'),
  moreEmojis: spanish('react.more'),
  anyEmoji: spanish('react.anyEmoji'),
  sendEmoji: spanish('react.send'),
  rematch: spanish('end.rematch'),
  restart: spanish('gameMenu.restart'),
  restartTitle: spanish('restartGame.title'),
  restartConfirm: spanish('restartGame.restart'),
  shareCard: spanish('end.shareCard'),
  shareGroupCard: spanish('end.shareGroupCard'),
  cardShare: spanish('card.share'),
  endTitle: spanish('end.title'),
  endLeave: spanish('end.leave'),
  titles:
    /Almas gemelas|Verso suelto|La voz del grupo|Imán de reacciones|Enigma|Libro abierto|te conoce mejor/,
} as const;

/**
 * What the driver looks for on screen about the rounds, from the keys of es.json of the web, so it
 * follows any change of their wording.
 */
const ROUNDS_ON_SCREEN = {
  /** The settings sheet, round by round. */
  origin: (round: number) => spanish('settings.rounds.origin', { number: round }),
  origins: {
    random: () => spanish('settings.rounds.origins.random'),
    specific: () => spanish('settings.rounds.origins.specific'),
    players: () => spanish('settings.rounds.origins.players'),
  },
  remove: (round: number) => spanish('settings.rounds.remove', { number: round }),
  /** The button that shows the categories of a random round, which says them after a colon. */
  categoriesOf: (round: number) =>
    new RegExp(
      `^${escaped(spanish('settings.rounds.categoriesOf', { number: round, summary: '' }))}`,
    ),
  everyCategoryOf: (round: number) =>
    spanish('settings.rounds.categoriesOf', {
      number: round,
      summary: spanish('settings.rounds.fromAll'),
    }),
  categories: (round: number) => spanish('settings.rounds.categories', { number: round }),
  allCategories: () => spanish('settings.rounds.allCategories'),
  choose: (round: number) => spanish('settings.rounds.chooseLabel', { number: round }),
  change: (round: number) => spanish('settings.rounds.changeLabel', { number: round }),
  add: () => spanish('settings.rounds.add'),
  /** The screen to choose the dilemma of a round, from the settings or the lobby. */
  picker: (round: number) => spanish('pickDilemmas.title', { number: round }),
  found: () => spanish('pickDilemmas.list'),
  put: (round: number) => spanish('pickDilemmas.put', { number: round }),
  /** The lobby. */
  lobby: () => spanishPattern('lobby.rounds.title'),
  chooseInTheLobby: (round: number) => spanish('lobby.rounds.chooseLabel', { number: round }),
  clearInTheLobby: (round: number) => spanish('lobby.rounds.clearLabel', { number: round }),
  /** The screen to create a room from the public page of a dilemma. */
};

/** Where the web keeps the last nickname on the device (identity/last-nickname.ts). */
const LAST_NICKNAME_KEY = 'thelever.lastNickname';
/** Where the web keeps the access code on the device (identity/access-code.ts). */
const ACCESS_CODE_KEY = 'thelever.accessCode';

/** The language of each device a scenario names, as the browser announces it. */
const LOCALES: Readonly<Record<string, string>> = { es: 'es-ES', en: 'en-US', fr: 'fr-FR' };
/** The language of the browsers when a scenario does not name one. */
const SPANISH = 'es-ES';

/** Where the app loads the cookie manager of Google, which the browsers of the run answer with TEST_COOKIE_MANAGER. */
const COOKIE_MANAGER = 'https://fundingchoicesmessages.google.com/';
/** Test data: the name of the test cookie manager. */
const TEST_COOKIE_MANAGER_NAME = 'Test cookie manager';
/**
 * A cookie manager of test in place of Google's: a dialog that accepts or rejects everything and
 * answers through TCF, as Google's does; once answered, the device keeps it, as Google's does.
 */
const TEST_COOKIE_MANAGER = `(() => {
  const listeners = [];
  let answer;
  window.__tcfapi = (command, version, callback) => {
    if (command !== 'addEventListener') return;
    listeners.push(callback);
    if (answer) callback(answer, true);
  };
  const answered = localStorage.getItem('test-cookie-manager');
  if (answered) {
    answer = { eventStatus: 'tcloaded', gdprApplies: true, purpose: { consents: JSON.parse(answered) } };
    return;
  }
  const dialog = document.createElement('div');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-label', '${TEST_COOKIE_MANAGER_NAME}');
  for (const [label, consents] of [['Accept', { 1: true, 2: true, 3: true, 4: true }], ['Reject', {}]]) {
    const button = document.createElement('button');
    button.textContent = label;
    button.addEventListener('click', () => {
      localStorage.setItem('test-cookie-manager', JSON.stringify(consents));
      answer = { eventStatus: 'useractioncomplete', gdprApplies: true, purpose: { consents } };
      dialog.remove();
      for (const listener of listeners) listener(answer, true);
    });
    dialog.append(button);
  }
  document.body.append(dialog);
})();`;
/** Test data: an address of each country the scenarios name, as DB-IP Lite places them. */
const ADDRESSES: Readonly<Record<string, string>> = {
  ES: '80.58.61.250',
  US: '8.8.8.8',
  GB: '81.2.69.142',
  RU: '77.88.8.8',
};
/** The year of birth of every player who finishes the first access as an adult. */
const ADULT_BIRTH_YEAR = 1990;
/** Where the web keeps what the cookie manager decided on personalised ads (first-access/cookie-consent.ts). */
const PERSONALISED_ADS_KEY = 'thelever.personalisedAds';
/** Where the web keeps when the offer to install the app was closed (install/install-offer-state.ts). */
const INSTALL_OFFER_CLOSED_KEY = 'thelever.installOfferClosedAt';
const DAY_MS = 24 * 60 * 60 * 1000;
/** Where the public web publishes the full terms and the privacy policy of the app, in Spanish. */
const LEGAL_PATHS = {
  terms: '/es/condiciones-de-uso',
  privacy: '/es/privacidad-de-la-app',
} as const;

/** The publisher and the ad units the public web of the run shows ads with. */
const TEST_ADS = {
  client: 'ca-pub-0000000000000000',
  slots: { phone: '1000000001', top: '1000000002', side: '1000000003' },
} as const;

/** Each language of the app by its own name, as the settings offer it (settings/language-sheet.tsx). */
const LANGUAGE_NAMES: Readonly<Record<string, string>> = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  ca: 'Català',
};

/** Test data: the donation page the public web and the app of the run link to. */
const DONATION_URL = 'https://ko-fi.test/thelever';

/** Where the pages load AdSense from, which the browsers of the run answer with TEST_ADSENSE. */
const ADSENSE_SCRIPT = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

/**
 * What the browsers of the run load instead of AdSense: like it, it fills an ad unit for each
 * request the page queued before it loaded or makes after, and marks it as filled.
 */
const TEST_ADSENSE = `(() => {
  const fill = () => {
    const unit = document.querySelector('ins.adsbygoogle:not([data-ad-status])');
    if (!unit) return;
    unit.setAttribute('data-ad-status', 'filled');
    unit.style.background = '#d9d4c7';
  };
  const queued = Array.isArray(window.adsbygoogle) ? window.adsbygoogle.length : 0;
  window.adsbygoogle = { push: fill };
  for (let request = 0; request < queued; request += 1) fill();
})();`;

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
  /** The identity the page signed in with, as its calls to the room server carry it. */
  identity: string | undefined;
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
  #askedOnCreation: readonly ('nickname' | 'place' | 'nature')[] = [];
  #fillers = 0;
  /** The players whose device asks for reduced motion, set before their screen opens. */
  readonly #reducedMotion = new Set<string>();
  /** The devices of the scenarios of the first access, by the name of their user. */
  readonly #devices = new Map<string, DeviceOptions>();
  /** What the notice of an anonymous room told each player before they went on, in order. */
  readonly #anonymousNotices = new Map<string, readonly string[]>();
  /** The users whose browser offers to install the app, which is not installed on their device. */
  readonly #installable = new Set<string>();
  /** How many screens of the results each player looks behind the group, on their own device. */
  readonly #lookingBack = new Map<string, number>();
  /** The public web: the curated catalog of the scenario, its numbers by name and what was generated. */
  readonly #curatedCatalog = new InMemoryCuratedCatalog();
  readonly #publicNumbers = new Map<string, number>();
  #site: BuiltSite | undefined;
  #visitorRoomId: string | undefined;
  /** What the card of the first round said on the screen to create the room of the visitor. */
  #startingDilemmaShown: string | undefined;

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
    // The dilemmas a scenario of the public web loaded leave the catalog of the worker, so the
    // games and searches of the scenarios after it never draw them.
    const loaded = this.#curatedCatalog.approved.splice(0);
    if (loaded.length > 0) {
      this.#curatedCatalog.discarded.push(...loaded.map(({ number }) => number));
      await this.#importCatalog();
    }
  }

  // The first access

  async newDevice(user: string, options: DeviceOptions): Promise<void> {
    this.#devices.set(user, options);
    const player = await this.#withScreen(user, SPANISH, true);
    if (options.globalPrivacyControl) {
      await screenOf(player).context.addInitScript(() => {
        Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', {
          get: () => true,
          configurable: true,
        });
      });
    }
  }

  async openApp(user: string, from?: 'invitation'): Promise<void> {
    const { page } = screenOf(this.#playerCalled(user));
    const address =
      from === 'invitation'
        ? `${this.#stack.webUrl}/join/${this.#lobbyOf(this.#hostName()).code}`
        : `${this.#stack.webUrl}/app`;
    await page.goto(address);
    const start = page
      .getByRole('button', { name: SCREEN_TEXT('firstAccess.welcome.start') })
      .or(page.getByRole('button', { name: SCREEN_TEXT('firstAccess.welcome.join') }));
    await this.#firstAccessScreenOn(page);
    if (await start.isVisible()) await start.click();
  }

  async declareAge(user: string, age: number): Promise<void> {
    // Born in December of the year before they turned it, so they are that age whatever the day.
    const { page } = screenOf(this.#playerCalled(user));
    await this.chooseBirthYear(user, new Date().getUTCFullYear() - age - 1);
    const month = page.getByRole('combobox', { name: SCREEN_TEXT('firstAccess.age.month') });
    if (await month.isVisible()) await month.selectOption('12');
    await page.getByRole('button', { name: SCREEN_TEXT('firstAccess.continue') }).click();
    await page
      .getByRole('combobox', { name: SCREEN_TEXT('firstAccess.age.year') })
      .waitFor({ state: 'hidden' });
  }

  async chooseBirthYear(user: string, year: number): Promise<void> {
    const { page } = screenOf(this.#playerCalled(user));
    await page
      .getByRole('combobox', { name: SCREEN_TEXT('firstAccess.age.year') })
      .selectOption(String(year));
  }

  async acceptTerms(user: string): Promise<void> {
    const { page } = screenOf(this.#playerCalled(user));
    const newTerms = page.getByRole('heading', { name: SCREEN_TEXT('firstAccess.newTerms.title') });
    if (await newTerms.isVisible()) {
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: SCREEN_TEXT('firstAccess.newTerms.accept') }).click();
      await newTerms.waitFor({ state: 'hidden' });
      return;
    }
    await this.#termsBox(page).check();
  }

  async declineTerms(user: string): Promise<void> {
    const { page } = screenOf(this.#playerCalled(user));
    await page.getByRole('button', { name: SCREEN_TEXT('firstAccess.decline') }).click();
  }

  async giveGameConsent(user: string): Promise<void> {
    const { page } = screenOf(this.#playerCalled(user));
    const title = page.getByRole('heading', { name: SCREEN_TEXT('firstAccess.consent.title') });
    await this.#consentBox(page).check();
    await page.getByRole('button', { name: SCREEN_TEXT('firstAccess.continue') }).click();
    await title.waitFor({ state: 'hidden' });
  }

  async answerCookieConsent(user: string): Promise<void> {
    const { page } = screenOf(this.#playerCalled(user));
    await page
      .getByRole('dialog', { name: TEST_COOKIE_MANAGER_NAME })
      .getByRole('button', { name: 'Accept' })
      .click();
  }

  async firstAccessScreenOf(user: string): Promise<FirstAccessScreen> {
    return this.#firstAccessScreenOn(screenOf(this.#playerCalled(user)).page);
  }

  async preselected(user: string, choice: 'year' | 'month' | 'game-consent'): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(user));
    if (choice === 'game-consent') return this.#consentBox(page).isChecked();
    const key = choice === 'year' ? 'firstAccess.age.year' : 'firstAccess.age.month';
    return (await page.getByRole('combobox', { name: SCREEN_TEXT(key) }).inputValue()) !== '';
  }

  async mentionsMinimumAge(user: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(user));
    // The years of the list aside, what the screen says.
    const said = String(
      await page.evaluate(`(() => {
        const copy = document.body.cloneNode(true);
        for (const list of copy.querySelectorAll('select')) list.remove();
        return copy.textContent ?? '';
      })()`),
    );
    return /\b1[68]\b|edad mínima/i.test(said);
  }

  async legalTextsOfferedTo(user: string): Promise<readonly ('terms' | 'privacy')[]> {
    const { page } = screenOf(this.#playerCalled(user));
    const offered: ('terms' | 'privacy')[] = [];
    for (const which of ['terms', 'privacy'] as const) {
      if ((await page.locator(`a[href="${LEGAL_PATHS[which]}"]`).count()) > 0) offered.push(which);
    }
    return offered;
  }

  async toldTheGameConsentChanged(user: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(user));
    const said = plainOf(SCREEN_TEXT('firstAccess.consent.changed'));
    return (await page.getByRole('status').filter({ hasText: said }).count()) > 0;
  }

  async canUseTheApp(user: string): Promise<boolean> {
    // The app is behind the first access: only past it does any of its screens show.
    const screen = await this.firstAccessScreenOf(user);
    return screen === 'home' || screen === 'join';
  }

  async acceptedVersionOf(user: string, document: LegalDocument): Promise<number | undefined> {
    const identity = await this.#identityOfDevice(user);
    const row = await this.#withDatabase((db) =>
      db
        .selectFrom('legal_acceptances')
        .select('version')
        .where('identity', '=', identity)
        .where('document', '=', document)
        .executeTakeFirst(),
    );
    return row?.version;
  }

  async currentVersionOf(document: LegalDocument): Promise<number> {
    return currentVersionOf(document, PUBLISHED_VERSIONS);
  }

  async finishFirstAccess(user: string): Promise<void> {
    await this.#withScreen(user);
  }

  async acceptedAnEarlierVersion(user: string, document: LegalDocument): Promise<void> {
    // The room server of the run publishes the versions of the code: the one before is earlier.
    const identity = await this.#identityOfDevice(user);
    await this.#withDatabase((db) =>
      db
        .updateTable('legal_acceptances')
        .set((eb) => ({ version: eb('version', '-', 1) }))
        .where('identity', '=', identity)
        .where('document', '=', document)
        .execute(),
    );
  }

  async publishVersionThatAsksAgain(document: LegalDocument): Promise<void> {
    const current = PUBLISHED_VERSIONS.find((version) => version.document === document);
    if (!current?.asksAgain) {
      throw new Error(`The version of ${document} of the code does not ask again`);
    }
  }

  async keptFirstAccessOf(): Promise<Readonly<Record<string, unknown>>> {
    throw new Error('What the app keeps is read in the application: the scenario must not be @ui');
  }

  async consentPointsShownTo(user: string): Promise<readonly string[]> {
    const { page } = screenOf(this.#playerCalled(user));
    // Only what comes before the boxes.
    return (await page.evaluate(`(() => {
      const box = document.querySelector('input[type="checkbox"]');
      return [...document.querySelectorAll('li[data-point]')]
        .filter((item) => box && item.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING)
        .map((item) => item.getAttribute('data-point'));
    })()`)) as string[];
  }

  async toldWhyTheConsentIsApart(user: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(user));
    return (await page.getByTestId('consent-why').count()) > 0;
  }

  async openHowTheLeverIsFunded(user: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(user));
    await page.getByRole('button', { name: SCREEN_TEXT('firstAccess.consent.funding') }).click();
    const sheet = page.getByRole('dialog', { name: SCREEN_TEXT('firstAccess.funding.title') });
    await sheet.waitFor();
    return sheet.isVisible();
  }

  async personalisedAdsAllowedFor(user: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(user));
    return (
      (await page.evaluate((key) => localStorage.getItem(key), PERSONALISED_ADS_KEY)) === 'yes'
    );
  }

  async toldAboutGlobalPrivacyControl(user: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(user));
    const told = page.getByText(SCREEN_TEXT('firstAccess.cookies.globalPrivacyControl'));
    await told.waitFor();
    return told.isVisible();
  }

  async browserOffersToInstall(user: string): Promise<void> {
    this.#installable.add(user);
    await this.#offerToInstallOn(screenOf(this.#playerCalled(user)).page);
  }

  /** A browser offers to install an app that is not installed on every load, early. */
  async #offerToInstallOn(page: Page): Promise<void> {
    await page.evaluate(`(() => {
      const offer = new Event('beforeinstallprompt', { cancelable: true });
      offer.prompt = async () => undefined;
      window.dispatchEvent(offer);
    })()`);
  }

  async reachHome(user: string): Promise<void> {
    const { page } = screenOf(this.#playerCalled(user));
    await page.goto(`${this.#stack.webUrl}/app`);
    await page.getByRole('heading', { name: SCREEN_TEXT('home.title') }).waitFor();
    if (this.#installable.has(user)) await this.#offerToInstallOn(page);
  }

  async offeredToInstall(user: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(user));
    const offer = page.getByRole('complementary', { name: SCREEN_TEXT('installOffer.title') });
    return steady(async () => (await offer.count()) > 0);
  }

  async closeInstallOffer(user: string): Promise<void> {
    const { page } = screenOf(this.#playerCalled(user));
    await page.getByRole('button', { name: SCREEN_TEXT('installOffer.close') }).click();
  }

  async letDaysPassOnTheDevice(user: string, days: number): Promise<void> {
    // What the device keeps of when it closed the offer goes back as many days.
    const { page } = screenOf(this.#playerCalled(user));
    await page.evaluate(
      ([key, ms]) => {
        const closed = Number(localStorage.getItem(key));
        if (closed > 0) localStorage.setItem(key, String(closed - ms));
      },
      [INSTALL_OFFER_CLOSED_KEY, days * DAY_MS] as const,
    );
  }

  async finishAGame(user: string): Promise<void> {
    const rival = `${user}, rival`;
    await this.createRoom(user);
    await this.joinRoom(rival);
    await this.startDecisionPhase(1);
    await this.answer(user);
    await this.answer(rival);
    while (!(await this.resultsScreenSeenBy(user))) await this.moveEveryoneOn(user);
    while (!(await this.endOfTheGameSeenBy(user))) await this.moveEveryoneOn(user);
  }

  async anonymousNoticeShownTo(player: string): Promise<readonly string[]> {
    const told = this.#anonymousNotices.get(player);
    if (!told) throw new Error(`${player} was told nothing before the first dilemma`);
    return told;
  }

  // The invitations to donate

  async declaredAgeOnTheDevice(user: string, age: number): Promise<void> {
    // Born in December of the year before they turned it, as when they declare it on the screen,
    // and in Spain, where any age the app takes can play.
    this.#devices.set(user, { ...this.#devices.get(user), country: 'ES' });
    const identity = await this.#identityOfDevice(user);
    await this.#withDatabase((db) =>
      db
        .updateTable('first_accesses')
        .set({ region: 'eea', birth_year: new Date().getUTCFullYear() - age - 1, birth_month: 12 })
        .where('identity', '=', identity)
        .execute(),
    );
    const screen = screenOf(this.#playerCalled(user));
    const before = screen.received.length;
    await screen.page.reload();
    await waitUntil(
      () => screen.received.length > before || undefined,
      `the device of ${user} opens the room again`,
      RECONNECTION_TIMEOUT_MS,
    );
  }

  async chanceInvitesToDonate(user: string, invites: boolean): Promise<void> {
    // Chance on the device falls one way, now and after any reload: below the odds or above them.
    const { context, page } = screenOf(this.#playerCalled(user));
    const draw = invites ? 0 : 0.99;
    const fix = (value: number) => {
      Math.random = () => value;
    };
    await context.addInitScript(fix, draw);
    await page.evaluate(fix, draw);
  }

  async supportLineSeenBy(viewer: string): Promise<SupportLineView | undefined> {
    const { page } = screenOf(this.#playerCalled(viewer));
    const end = page.getByRole('main', { name: SCREEN_TEXT('end.title') });
    await end.waitFor();
    const line = end.getByRole('link').filter({ hasText: SCREEN_TEXT('donations.line') });
    if (!(await steady(async () => (await line.count()) > 0))) return undefined;
    const box = await line.boundingBox();
    if (!box) throw new Error(`The line to support TheLever of ${viewer} is not on the screen`);
    const actions = await end.getByRole('button').all();
    const boxes = await Promise.all(actions.map((action) => action.boundingBox()));
    return {
      takesToTheDonationPage: (await line.getAttribute('href')) === DONATION_URL,
      coversTheMainActions: boxes.some((other) => other !== null && overlap(box, other)),
    };
  }

  async supportCardSeenBy(user: string): Promise<SupportInvitationView | undefined> {
    const { page } = screenOf(this.#playerCalled(user));
    const card = page.getByRole('complementary', { name: SCREEN_TEXT('donations.card.link') });
    if (!(await steady(async () => (await card.count()) > 0))) return undefined;
    const link = card.getByRole('link');
    return { takesToTheDonationPage: (await link.getAttribute('href')) === DONATION_URL };
  }

  async closeSupportCard(user: string): Promise<void> {
    const { page } = screenOf(this.#playerCalled(user));
    await page.getByRole('button', { name: SCREEN_TEXT('donations.card.close') }).click();
    await page
      .getByRole('complementary', { name: SCREEN_TEXT('donations.card.link') })
      .waitFor({ state: 'hidden' });
  }

  /** Where the first access of the page is, once it shows any of its screens. */
  async #firstAccessScreenOn(page: Page): Promise<FirstAccessScreen> {
    const screens: readonly (readonly [FirstAccessScreen, Locator])[] = [
      ['month', page.getByRole('combobox', { name: SCREEN_TEXT('firstAccess.age.month') })],
      ['age', page.getByRole('heading', { name: SCREEN_TEXT('firstAccess.age.title') })],
      [
        'under-minimum-age',
        page.getByRole('heading', { name: SCREEN_TEXT('firstAccess.underage.title') }),
      ],
      [
        'blocked-country',
        page.getByRole('heading', { name: SCREEN_TEXT('firstAccess.country.title') }),
      ],
      ['new-terms', page.getByRole('heading', { name: SCREEN_TEXT('firstAccess.newTerms.title') })],
      [
        'game-consent',
        page.getByRole('heading', { name: SCREEN_TEXT('firstAccess.consent.title') }),
      ],
      ['cookies', page.getByRole('dialog', { name: TEST_COOKIE_MANAGER_NAME })],
      ['cookies', page.getByRole('heading', { name: SCREEN_TEXT('firstAccess.cookies.title') })],
      ['home', page.getByRole('heading', { name: SCREEN_TEXT('home.title') })],
      ['join', page.getByRole('textbox', { name: SCREEN.nickname })],
      ['age', page.getByRole('button', { name: SCREEN_TEXT('firstAccess.welcome.start') })],
      ['age', page.getByRole('button', { name: SCREEN_TEXT('firstAccess.welcome.join') })],
    ];
    await screens
      .map(([, locator]) => locator)
      .reduce((any, locator) => any.or(locator))
      .first()
      .waitFor();
    return steady(async () => {
      for (const [screen, locator] of screens) {
        if (!(await locator.isVisible())) continue;
        // The game consent asks for the terms too while they are to accept, with a box of their own.
        if (screen === 'game-consent' && (await this.#termsBox(page).count()) > 0) {
          return (await this.#termsBox(page).isChecked()) ? 'game-consent' : 'terms';
        }
        return screen;
      }
      throw new Error('The page shows no screen of the first access, nor the app');
    });
  }

  /** The box of the terms of use on the screen of the game consent, while they are to accept. */
  #termsBox(page: Page): Locator {
    return page
      .locator('label')
      .filter({ hasText: plainOf(SCREEN_TEXT('firstAccess.consent.terms')) })
      .getByRole('checkbox');
  }

  #consentBox(page: Page): Locator {
    return page
      .locator('label')
      .filter({ hasText: SCREEN_TEXT('firstAccess.consent.statement') })
      .getByRole('checkbox');
  }

  /** The identity the device of `user` signed in with, as its calls carried it. */
  async #identityOfDevice(user: string): Promise<string> {
    const screen = screenOf(this.#playerCalled(user));
    return waitUntil(() => screen.identity, `the device of ${user} signs in`);
  }

  // Lobby

  async openRoomCreation(host: string, deviceLanguage = 'es'): Promise<void> {
    const player = await this.#withScreen(host, LOCALES[deviceLanguage] ?? SPANISH);
    if (player.creatingRoom) return;
    const { page } = screenOf(player);
    await page.goto(`${this.#stack.webUrl}/app`);
    await page.getByRole('button', { name: textIn(deviceLanguage, 'home.create') }).click();
    await page
      .getByRole('button', { name: textIn(deviceLanguage, 'avatarPicker.change') })
      .waitFor();
    player.creatingRoom = true;
  }

  async createRoom(host: string, choices: RoomChoices = {}): Promise<void> {
    await this.openRoomCreation(host, choices.deviceLanguage);
    const player = this.#playerCalled(host);
    const { page } = screenOf(player);

    // The screen to create it, in the language of the device of the host.
    const language = choices.deviceLanguage ?? 'es';
    const nickname = page.getByRole('textbox', { name: textIn(language, 'createRoom.nickname') });
    const places = page.getByRole('group', { name: textIn(language, 'createRoom.place.label') });
    this.#askedOnCreation = [
      ...((await nickname.isVisible()) ? (['nickname'] as const) : []),
      ...((await places.isVisible()) ? (['place'] as const) : []),
      ...((await page.locator('input[name="groupNature"]').count()) > 0
        ? (['nature'] as const)
        : []),
    ];
    await nickname.fill(host);
    await chooseOption(page, textIn(language, `createRoom.place.${choices.place ?? 'together'}`));
    await chooseAmbience(page, textIn(language, `ambience.${choices.ambience ?? 'classic'}.name`));
    await page.getByRole('button', { name: textIn(language, 'createRoom.submit') }).click();

    await page.waitForURL(/\/rooms\//);
    await waitUntil(() => lastLobbyOf(player), `${host} gets the lobby of their room`);
    player.creatingRoom = false;
    player.nickname = host;
    this.#host = host;
  }

  async askedOnCreation(): Promise<readonly ('nickname' | 'place' | 'nature')[]> {
    return this.#askedOnCreation;
  }

  /** The screen marks the host next to their own row. */
  async isHost(player: string): Promise<boolean> {
    const seen = this.#playerCalled(player);
    const { page } = screenOf(seen);
    const own = page.locator(`li[data-player-id="${this.#playerIdOf(seen)}"]`);
    return (await own.textContent())?.includes(SCREEN.host) ?? false;
  }

  /** In the lobby, at its head; during the game, under the share of its menu. */
  async roomCodeSeenBy(player: string): Promise<string> {
    const viewer = this.#playerCalled(player);
    const { page } = screenOf(viewer);
    if (!lastGameOf(viewer)) return (await page.getByTestId('room-code').textContent()) ?? '';
    await this.#openGameMenu(page);
    const seen = (await page.getByTestId('game-room-code').textContent()) ?? '';
    await this.#closeGameMenu(page);
    return SCREEN.gameRoomCode.exec(seen)?.[1] ?? '';
  }

  /** The link the screen copies, from the lobby or the menu of the game, opens the room for whoever follows it. */
  async canShareInvitationLink(player: string): Promise<boolean> {
    const viewer = this.#playerCalled(player);
    const { page } = screenOf(viewer);
    const code = await this.roomCodeSeenBy(player);
    const inGame = lastGameOf(viewer) !== undefined;
    if (inGame) await this.#openGameMenu(page);
    await page.getByRole('button', { name: SCREEN.share }).click();
    await page.getByRole('button', { name: SCREEN.copied }).waitFor();
    const link = String(await page.evaluate('navigator.clipboard.readText()'));
    if (inGame) await this.#closeGameMenu(page);
    return this.#opensTheRoom(link, code);
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
      await this.enterTypedCode(player);
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

  /** From the start screen, into the field of the code, without pressing the button. */
  async typeRoomCode(player: string, code: string): Promise<void> {
    const opener = await this.#withScreen(player);
    const { page } = screenOf(opener);
    await page.goto(`${this.#stack.webUrl}/app`);
    await page.getByRole('button', { name: SCREEN.joinWithCode }).click();
    await page.getByRole('textbox', { name: SCREEN.code }).fill(code);
  }

  async enterTypedCode(player: string): Promise<void> {
    const opener = this.#playerCalled(player);
    const { page } = screenOf(opener);
    await page.getByRole('button', { name: SCREEN.enterCode, exact: true }).click();
    await this.#readJoinScreen(opener);
  }

  /** The field of the code stays, and no room shows. */
  async isOnJoinCodeScreen(player: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(player));
    return steady(
      async () =>
        (await page.getByRole('textbox', { name: SCREEN.code }).isVisible()) &&
        (await page.getByTestId('room-of').count()) === 0,
    );
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

    // Who comes back to a game in progress, having left it, gets the game instead of the lobby;
    // who joins it late, first the notice of where they come in.
    const inGame = page.getByText(SCREEN.position);
    const lateJoin = page.getByRole('heading', { name: SCREEN.lateJoin });
    await page
      .locator('[data-testid="room-code"], [role="alert"] h1')
      .or(inGame)
      .or(lateJoin)
      .first()
      .waitFor();
    if ((await lateJoin.count()) > 0) {
      joiner.nickname = nickname;
      await page.getByRole('button', { name: SCREEN.enterTheRound }).click();
      await this.#toTheDilemma(joiner);
    }
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

  /**
   * As the lobby on the device has it, from the last state of the lobby the room server sent: in a
   * game, the settings it is played with, which only the lobby changes.
   */
  async settingsSeenBy(viewer: string): Promise<SettingsView> {
    const lobby = this.#playerCalled(viewer).screen?.received.findLast(
      (message): message is RoomStateDto => message.type === 'room-state',
    );
    if (!lobby) throw new Error(`${viewer} has never had the lobby open`);
    return lobby.settings;
  }

  async changeSettings(host: string, changes: Partial<SettingsView>): Promise<void> {
    const sheet = await this.#openSettings(host);
    for (const [setting, value] of Object.entries(changes)) {
      if (setting === 'variant') {
        await chooseOption(sheet, SCREEN.variants[value as 'nominal']);
      } else if (setting in SCREEN.switches) {
        const name = SCREEN.switches[setting as keyof typeof SCREEN.switches];
        await sheet
          .getByRole('switch', { name: new RegExp(`^${escaped(name)}`) })
          .setChecked(Boolean(value));
      } else if (setting === 'timePerDilemmaSeconds') {
        const group = sheet.getByRole('group', { name: SCREEN.timePerDilemma });
        await chooseOption(group, `${value} s`);
      } else {
        throw new Error(`The driver cannot change ${setting} on screen`);
      }
    }
    await this.#saveSettings(sheet);
    await this.#untilEveryoneSees('the new configuration', (lobby) =>
      Object.entries(changes).every(([setting, value]) =>
        isDeepStrictEqual(lobby.settings[setting as keyof SettingsView], value),
      ),
    );
  }

  async canChangeSettings(player: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(player));
    const configure = page.getByRole('button', { name: SCREEN.configure, exact: true });
    return steady(async () => (await configure.count()) > 0);
  }

  /** As the lobby on the device has them, from the last state of the lobby the room server sent. */
  async roundsSeenBy(viewer: string): Promise<RoundView[]> {
    const { screen } = this.#playerCalled(viewer);
    const lobby = screen?.received.findLast(
      (message): message is RoomStateDto => message.type === 'room-state',
    );
    if (!lobby) throw new Error(`${viewer} never had the lobby open`);
    return lobby.rounds.map(roundViewOf);
  }

  /** Adding or removing rounds at the end, and then setting each one, as the sheet shows them. */
  async setRounds(host: string, rounds: readonly RoundSetting[]): Promise<void> {
    const { page } = screenOf(this.#playerCalled(host));
    const before = await this.roundsSeenBy(host);
    const sheet = await this.#openSettings(host);
    for (let count = before.length; count < rounds.length; count += 1) {
      await sheet.getByRole('button', { name: ROUNDS_ON_SCREEN.add(), exact: true }).click();
    }
    for (let count = before.length; count > rounds.length; count -= 1) {
      await sheet
        .getByRole('button', { name: ROUNDS_ON_SCREEN.remove(count), exact: true })
        .click();
    }
    for (const [index, setting] of rounds.entries()) {
      const round = index + 1;
      if (!(await this.#setRoundOn(page, sheet, round, setting, before[index]))) {
        throw new Error(`The settings do not let ${host} set round ${round}`);
      }
    }
    await this.#saveSettings(sheet);
    await this.#untilEveryoneSees('the new rounds', (lobby) =>
      sameRounds(lobby.rounds.map(roundViewOf), rounds),
    );
  }

  /** The screen does not offer what the room would not take: the sheet closes without saving. */
  async tryToSetRound(host: string, round: number, setting: RoundSetting): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(host));
    const before = await this.roundsSeenBy(host);
    const sheet = await this.#openSettings(host);
    if (!(await this.#setRoundOn(page, sheet, round, setting, before[round - 1]))) {
      await this.#closeSettings(sheet);
      return false;
    }
    await this.#saveSettings(sheet);
    const rounds = before.map((other, index) => (index === round - 1 ? setting : other));
    await this.#untilEveryoneSees(`round ${round} as set`, (lobby) =>
      sameRounds(lobby.rounds.map(roundViewOf), rounds),
    );
    return true;
  }

  async tryToAddRound(host: string): Promise<boolean> {
    const { length } = await this.roundsSeenBy(host);
    const sheet = await this.#openSettings(host);
    const add = sheet.getByRole('button', { name: ROUNDS_ON_SCREEN.add(), exact: true });
    return this.#changeTheNumberOfRounds(sheet, add, length + 1);
  }

  async tryToRemoveRound(host: string, round: number): Promise<boolean> {
    const { length } = await this.roundsSeenBy(host);
    const sheet = await this.#openSettings(host);
    const remove = sheet.getByRole('button', { name: ROUNDS_ON_SCREEN.remove(round), exact: true });
    return this.#changeTheNumberOfRounds(sheet, remove, length - 1);
  }

  async chooseRoundDilemma(player: string, round: number, dilemmaId: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(player));
    const choose = page.getByRole('button', {
      name: ROUNDS_ON_SCREEN.chooseInTheLobby(round),
      exact: true,
    });
    if (!(await steady(async () => (await choose.count()) > 0))) return false;
    if (!(await this.#pickIn(page, round, dilemmaId, () => choose.click()))) return false;
    await this.#untilEveryoneSees(`round ${round} has ${dilemmaId}`, (lobby) => {
      const seen = lobby.rounds[round - 1];
      return seen?.origin === 'players' && seen.dilemma?.dilemmaId === dilemmaId;
    });
    return true;
  }

  async canChooseRoundDilemma(player: string, round: number): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(player));
    const choose = page.getByRole('button', {
      name: ROUNDS_ON_SCREEN.chooseInTheLobby(round),
      exact: true,
    });
    return steady(async () => (await choose.count()) > 0);
  }

  async clearRoundDilemma(player: string, round: number): Promise<void> {
    const { page } = screenOf(this.#playerCalled(player));
    await page
      .getByRole('button', { name: ROUNDS_ON_SCREEN.clearInTheLobby(round), exact: true })
      .click();
    await this.#untilEveryoneSees(`round ${round} is empty`, (lobby) => {
      const seen = lobby.rounds[round - 1];
      return seen?.origin === 'players' && seen.dilemma === null;
    });
  }

  async canClearRoundDilemma(player: string, round: number): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(player));
    const clear = page.getByRole('button', {
      name: ROUNDS_ON_SCREEN.clearInTheLobby(round),
      exact: true,
    });
    return steady(async () => (await clear.count()) > 0);
  }

  /**
   * From everything the device has of the rounds of the players: the rows of the lobby that show
   * their dilemmas and what it got of them.
   */
  async choosersSeenBy(viewer: string): Promise<string[]> {
    const { page } = screenOf(this.#playerCalled(viewer));
    const lobby = this.#lobbyOf(viewer);
    const ofThePlayers = lobby.rounds.filter(({ origin }) => origin === 'players');
    const section = page.getByRole('region', { name: ROUNDS_ON_SCREEN.lobby() });
    const shown = await Promise.all(
      ofThePlayers.flatMap((round) =>
        round.origin === 'players' && round.dilemma
          ? [
              section
                .getByRole('listitem')
                .filter({ hasText: listedText(round.dilemma) })
                .first()
                .textContent(),
            ]
          : [],
      ),
    );
    const seen = `${shown.join(' ')} ${JSON.stringify(ofThePlayers)}`;
    return lobby.players
      .filter(({ playerId, nickname }) => seen.includes(playerId) || seen.includes(nickname))
      .map(({ nickname }) => nickname);
  }

  /**
   * The host searches where they choose the dilemma of a round in the settings; any other player,
   * where they choose it for the first empty round of the players. The ids are those of what the
   * room server answered and the screen shows.
   */
  async searchDilemmas(player: string, text?: string): Promise<string[]> {
    const { page } = screenOf(this.#playerCalled(player));
    const search = await this.#openSearch(player);
    let found = search.found;
    if (text) {
      // The screen searches once the player stops typing; filling the field types it all at once.
      const answer = this.#nextSearchOn(page, 'q=');
      await search.picker.getByRole('searchbox', { name: SCREEN.search }).fill(text);
      found = await answer;
    }
    const [first] = found;
    if (first) await search.picker.getByText(listedText(first), { exact: true }).waitFor();
    await search.close();
    return found.map(({ dilemmaId }) => dilemmaId);
  }

  async searchDilemmaPages(player: string, pages: number): Promise<string[][]> {
    const { page } = screenOf(this.#playerCalled(player));
    const { picker, found: first, close } = await this.#openSearch(player);
    const found = [first];
    const more = picker.getByRole('button', { name: SCREEN.more });
    // Whether there are more shows once what it found is on screen, below what it had found.
    const shown = async () => {
      const last = found.at(-1)?.at(-1);
      if (last) await picker.getByText(listedText(last), { exact: true }).waitFor();
    };
    await shown();
    while (found.length < pages && (await more.count()) > 0) {
      const next = this.#nextSearchOn(page, 'after=');
      await more.click();
      found.push(await next);
      await shown();
    }
    await close();
    return found.map((listed) => listed.map(({ dilemmaId }) => dilemmaId));
  }

  /** The settings of the lobby, as the host left them open, or opened now from «Configurar». */
  async #openSettings(host: string): Promise<Locator> {
    const { page } = screenOf(this.#playerCalled(host));
    const sheet = page.getByRole('dialog', { name: SCREEN.settingsTitle });
    if (await sheet.isVisible()) return sheet;
    await page.getByRole('button', { name: SCREEN.configure, exact: true }).click();
    await sheet.waitFor();
    return sheet;
  }

  async #saveSettings(sheet: Locator): Promise<void> {
    await sheet.getByRole('button', { name: SCREEN.save }).click();
    await sheet.waitFor({ state: 'hidden' });
  }

  /** Leaving the settings sheet without saving what changed on it. */
  async #closeSettings(sheet: Locator): Promise<void> {
    await sheet.page().keyboard.press('Escape');
    await sheet.waitFor({ state: 'hidden' });
  }

  /** The button adds or removes a round, if the sheet lets the host; whether the room took it. */
  async #changeTheNumberOfRounds(sheet: Locator, button: Locator, count: number): Promise<boolean> {
    if ((await button.count()) === 0 || (await button.isDisabled())) {
      await this.#closeSettings(sheet);
      return false;
    }
    await button.click();
    await this.#saveSettings(sheet);
    await this.#untilEveryoneSees(`${count} rounds`, (lobby) => lobby.rounds.length === count);
    return true;
  }

  /**
   * Sets the round on the open settings sheet: who chooses its dilemma and, for a random one, its
   * categories or, for a specific one, its dilemma, unless it already has it. False if the screen
   * to choose it does not let the host take that dilemma.
   */
  async #setRoundOn(
    page: Page,
    sheet: Locator,
    round: number,
    setting: RoundSetting,
    before: RoundView | undefined,
  ): Promise<boolean> {
    const origins = sheet.getByRole('radiogroup', {
      name: ROUNDS_ON_SCREEN.origin(round),
      exact: true,
    });
    const origin = origins.getByRole('radio', {
      name: ROUNDS_ON_SCREEN.origins[setting.origin](),
      exact: true,
    });
    if ((await origin.getAttribute('aria-checked')) !== 'true') await origin.click();

    if (setting.origin === 'players') return true;
    if (setting.origin === 'random') {
      if (!(await this.#setCategoriesOn(sheet, round, setting.categories))) return false;
      return this.#setContentOn(sheet, round, setting.content ?? ANY_CONTENT);
    }
    if (before?.origin === 'specific' && before.dilemmaId === setting.dilemmaId) return true;
    const choose = sheet
      .getByRole('button', { name: ROUNDS_ON_SCREEN.choose(round), exact: true })
      .or(sheet.getByRole('button', { name: ROUNDS_ON_SCREEN.change(round), exact: true }));
    return this.#pickIn(page, round, setting.dilemmaId, () => choose.click());
  }

  /** The card of that round on the open settings sheet. */
  #roundCardOn(sheet: Locator, round: number): Locator {
    // Inside each card: a locator of the page, so it is looked for within the card.
    const origins = sheet.page().getByRole('radiogroup', {
      name: ROUNDS_ON_SCREEN.origin(round),
      exact: true,
    });
    return sheet.getByRole('listitem').filter({ has: origins });
  }

  /**
   * Chooses each part of the content of the random round; false if the sheet does not offer a
   * part the content asks for, which is any wherever the sheet does not offer it.
   */
  async #setContentOn(sheet: Locator, round: number, content: RoundContent): Promise<boolean> {
    const card = this.#roundCardOn(sheet, round);
    for (const axis of ['age', 'compromising'] as const) {
      const options = card.getByRole('radiogroup', {
        name: spanish(`settings.content.${axis}.label`),
        exact: true,
      });
      if ((await options.count()) === 0) {
        if (content[axis] === 'any') continue;
        return false;
      }
      const option = options.getByRole('radio', {
        name: spanish(`settings.content.${axis}.${content[axis]}`),
        exact: true,
      });
      if ((await option.getAttribute('aria-checked')) !== 'true') await option.click();
    }
    return true;
  }

  /** The categories of a random round, from «Todas». */
  async #setCategoriesOn(
    sheet: Locator,
    round: number,
    categories: readonly Category[] | null,
  ): Promise<boolean> {
    const fromAll = sheet.getByRole('button', {
      name: ROUNDS_ON_SCREEN.everyCategoryOf(round),
      exact: true,
    });
    if (categories === null && (await fromAll.count()) > 0) return true;
    const expander = sheet.getByRole('button', { name: ROUNDS_ON_SCREEN.categoriesOf(round) });
    if ((await expander.getAttribute('aria-expanded')) !== 'true') await expander.click();
    const chips = sheet.getByRole('group', {
      name: ROUNDS_ON_SCREEN.categories(round),
      exact: true,
    });
    const chip = (name: string) => chips.getByRole('checkbox', { name, exact: true });
    // «Todas» first: from there, marking one plays only that one.
    const all = chip(ROUNDS_ON_SCREEN.allCategories());
    if ((await all.getAttribute('aria-checked')) !== 'true') await all.click();
    for (const category of categories ?? []) {
      const name = SCREEN.categoryNames[category];
      if (!name) throw new Error(`The driver does not know the category ${category}`);
      await chip(name).click();
    }
    return true;
  }

  /**
   * On the screen to choose the dilemma of the round that `open` opens: it searches the text of the
   * dilemma and puts it in the round, unless the screen says it is in another one.
   */
  async #pickIn(
    page: Page,
    round: number,
    dilemmaId: string,
    open: () => Promise<void>,
  ): Promise<boolean> {
    const opened = this.#nextSearchOn(page);
    await open();
    const picker = page.getByRole('dialog', { name: ROUNDS_ON_SCREEN.picker(round), exact: true });
    await picker.waitFor();
    await opened;
    const { text } = catalogEntryOf(dilemmaId);
    const answer = this.#nextSearchOn(page, 'q=');
    await picker.getByRole('searchbox', { name: SCREEN.search }).fill(text);
    const found = await this.#listedUntil(page, picker, await answer, (listed) =>
      listed.some((candidate) => candidate.dilemmaId === dilemmaId),
    );
    const dilemma = found.find((candidate) => candidate.dilemmaId === dilemmaId);
    if (!dilemma) {
      // The search only offers what suits the room.
      await page.keyboard.press('Escape');
      await picker.waitFor({ state: 'hidden' });
      return false;
    }

    const option = picker
      .getByRole('radiogroup', { name: ROUNDS_ON_SCREEN.found(), exact: true })
      .getByRole('radio', { name: new RegExp(`^${escaped(listedText(dilemma))}(?!\\d)`) });
    if ((await option.getAttribute('aria-disabled')) === 'true') {
      await page.keyboard.press('Escape');
      await picker.waitFor({ state: 'hidden' });
      return false;
    }
    await option.click();
    await picker.getByRole('button', { name: ROUNDS_ON_SCREEN.put(round), exact: true }).click();
    await picker.waitFor({ state: 'hidden' });
    return true;
  }

  /**
   * Opens where `player` searches the dilemma of a round: the host, in the settings, round 1 as
   * specific; anyone else, the first empty round of the players in the lobby. Closing it leaves
   * everything as it was.
   */
  async #openSearch(player: string): Promise<{
    readonly picker: Locator;
    readonly found: readonly { readonly dilemmaId: string; readonly text: string }[];
    readonly close: () => Promise<void>;
  }> {
    const { page } = screenOf(this.#playerCalled(player));
    let open: () => Promise<void>;
    let round = 1;
    let sheet: Locator | undefined;
    if (player === this.#hostName()) {
      sheet = await this.#openSettings(player);
      const specific = ROUNDS_ON_SCREEN.origins.specific();
      const origin = sheet
        .getByRole('radiogroup', { name: ROUNDS_ON_SCREEN.origin(round), exact: true })
        .getByRole('radio', { name: specific, exact: true });
      if ((await origin.getAttribute('aria-checked')) !== 'true') await origin.click();
      const choose = sheet
        .getByRole('button', { name: ROUNDS_ON_SCREEN.choose(round), exact: true })
        .or(sheet.getByRole('button', { name: ROUNDS_ON_SCREEN.change(round), exact: true }));
      open = () => choose.click();
    } else {
      const empty = this.#lobbyOf(player).rounds.findIndex(
        (seen) => seen.origin === 'players' && seen.dilemma === null,
      );
      if (empty === -1) throw new Error(`${player} has no round of the players to choose`);
      round = empty + 1;
      const choose = page.getByRole('button', {
        name: ROUNDS_ON_SCREEN.chooseInTheLobby(round),
        exact: true,
      });
      open = () => choose.click();
    }
    const answer = this.#nextSearchOn(page);
    await open();
    const picker = page.getByRole('dialog', { name: ROUNDS_ON_SCREEN.picker(round), exact: true });
    await picker.waitFor();
    const found = await answer;
    return {
      picker,
      found,
      close: async () => {
        await page.keyboard.press('Escape');
        await picker.waitFor({ state: 'hidden' });
        if (sheet) await this.#closeSettings(sheet);
      },
    };
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

  // Ambiences, compromising dilemmas and the content of the rounds

  /** On the screen to create a room, which it opens if the player is not on it. */
  async ambiencesToCreateWith(player: string): Promise<AmbienceOption[]> {
    const { page } = screenOf(this.#playerCalled(player));
    const group = page.getByRole('group', { name: spanish('createRoom.ambience') });
    if (!(await group.isVisible())) {
      await page.goto(`${this.#stack.webUrl}/app`);
      await page.getByRole('button', { name: spanish('home.create') }).click();
      await group.waitFor();
    }
    const offered: AmbienceOption[] = [];
    for (const card of await group.locator('label').all()) {
      const radio = card.locator('input[type="radio"]');
      const ambience = (await radio.getAttribute('value')) as Ambience;
      const text = (await card.textContent()) ?? '';
      const off = await radio.isDisabled();
      if (off && !text.includes(spanish('ambience.onlyAdults'))) {
        throw new Error(`${ambience} is off and the screen does not say why`);
      }
      offered.push({
        ambience,
        described:
          text.includes(spanish(`ambience.${ambience}.line`)) &&
          (off || text.includes(spanish(`ambience.${ambience}.example`))),
        offBecause: off ? 'only-adults' : null,
      });
    }
    return offered;
  }

  async ambienceChosenBeforehand(player: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(player));
    const group = page.getByRole('group', { name: spanish('createRoom.ambience') });
    for (const radio of await group.locator('input[type="radio"]').all()) {
      if (await radio.isChecked()) return true;
    }
    return false;
  }

  /** With everything else filled in, the button still asks for an ambience and is off. */
  async canCreateRoomWithoutAmbience(player: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(player));
    await page.getByRole('textbox', { name: SCREEN.nickname }).fill(player);
    await chooseOption(page, SCREEN.places.together);
    const button = page.getByRole('button', { name: spanish('createRoom.missing.ambience') });
    return (await button.count()) === 0 || (await button.isEnabled());
  }

  async ambienceSeenBy(viewer: string): Promise<string> {
    const { page } = screenOf(this.#playerCalled(viewer));
    return ambienceShownIn((await page.getByTestId('room-ambience').textContent()) ?? '');
  }

  /** The card of the ambience opens on the three; choosing one leaves the settings open. */
  async chooseAmbience(host: string, ambience: Ambience): Promise<void> {
    const sheet = await this.#openSettings(host);
    const options = await this.#ambiencesOn(sheet);
    const option = options.getByRole('radio', {
      name: new RegExp(`^${escaped(spanish(`ambience.${ambience}.name`))}`),
    });
    await option.click();
    // The sheet fills in what the ambience sets once it marks it.
    await option.and(option.page().locator('[aria-checked="true"]')).waitFor();
  }

  async saveAmbience(host: string, ambience: Ambience): Promise<void> {
    await this.chooseAmbience(host, ambience);
    await this.#saveSettings(await this.#openSettings(host));
    await this.#untilEveryoneSees(
      `the ambience ${ambience}`,
      (lobby) => lobby.ambience === ambience,
    );
  }

  async closeTheOpenSettings(host: string): Promise<void> {
    await this.#closeSettings(await this.#openSettings(host));
  }

  async markAnonymousOnTheOpenSettings(host: string): Promise<void> {
    const sheet = await this.#openSettings(host);
    await chooseOption(sheet, SCREEN.variants.anonymous);
  }

  async openSettingsSeenBy(host: string): Promise<OpenSettingsView | undefined> {
    const { page } = screenOf(this.#playerCalled(host));
    const sheet = page.getByRole('dialog', { name: SCREEN.settingsTitle });
    if (!(await sheet.isVisible())) return undefined;
    const card = sheet.getByRole('button', {
      name: new RegExp(spanish('settings.ambience.change')),
    });
    const named = (await card.textContent()) ?? '';
    const ambience =
      (['custom', 'classic', 'spicy', 'no-filter'] as const).find((known) =>
        named.includes(spanish(`ambience.${known}.name`)),
      ) ?? named;
    const anonymous = sheet.getByRole('radio', { name: SCREEN.variants.anonymous, exact: true });
    return {
      ambience,
      variant: (await anonymous.isChecked()) ? 'anonymous' : 'nominal',
      adultsOnly: await sheet
        .getByRole('switch', { name: new RegExp(`^${escaped(SCREEN.switches.adultsOnly)}`) })
        .isChecked(),
      compromisingDilemmas: await sheet
        .getByRole('switch', {
          name: new RegExp(`^${escaped(SCREEN.switches.compromisingDilemmas)}`),
        })
        .isChecked(),
    };
  }

  async ambiencesInTheSettings(host: string): Promise<AmbienceOption[]> {
    const sheet = await this.#openSettings(host);
    const options = await this.#ambiencesOn(sheet);
    const offered: AmbienceOption[] = [];
    for (const ambience of ['classic', 'spicy', 'no-filter'] as const) {
      const radio = options.getByRole('radio', {
        name: new RegExp(`^${escaped(spanish(`ambience.${ambience}.name`))}`),
      });
      const text = (await radio.textContent()) ?? '';
      const off = await radio.isDisabled();
      offered.push({
        ambience,
        described: true,
        offBecause: off && text.includes(spanish('ambience.minorInRoom')) ? 'minor-in-room' : null,
      });
    }
    await this.#closeSettings(sheet);
    return offered;
  }

  async #ambiencesOn(sheet: Locator): Promise<Locator> {
    const label = spanish('settings.ambience.label');
    await sheet.getByRole('button', { name: new RegExp(`^${escaped(label)}`) }).click();
    const options = sheet.getByRole('radiogroup', { name: label });
    await options.waitFor();
    return options;
  }

  async adultsOnlySwitchSeenBy(host: string): Promise<SwitchView> {
    return this.#switchSeenBy(host, SCREEN.switches.adultsOnly, 'ambience.minorInRoom');
  }

  async compromisingSwitchSeenBy(host: string): Promise<SwitchView> {
    return this.#switchSeenBy(
      host,
      SCREEN.switches.compromisingDilemmas,
      'settings.compromising.onlyAnonymous',
    );
  }

  /** The switch of the settings, and why it is off by what its hint says. */
  async #switchSeenBy(host: string, label: string, offKey: string): Promise<SwitchView> {
    const sheet = await this.#openSettings(host);
    const toggle = sheet.getByRole('switch', { name: new RegExp(`^${escaped(label)}`) });
    const name = (await toggle.locator('xpath=ancestor::label').textContent()) ?? '';
    const on = await toggle.isChecked();
    const off = await toggle.isDisabled();
    await this.#closeSettings(sheet);
    const reasons: Readonly<Record<string, OffReason>> = {
      'ambience.minorInRoom': 'minor-in-room',
      'settings.compromising.onlyAnonymous': 'only-anonymous',
    };
    return {
      on,
      offBecause: off && name.includes(spanish(offKey)) ? (reasons[offKey] ?? null) : null,
    };
  }

  async contentChoicesFor(host: string, round: number): Promise<ContentChoices> {
    const sheet = await this.#openSettings(host);
    const card = this.#roundCardOn(sheet, round);
    const offered = async (axis: 'age' | 'compromising') =>
      (await card
        .getByRole('radiogroup', { name: spanish(`settings.content.${axis}.label`), exact: true })
        .count()) > 0;
    const choices = { age: await offered('age'), compromising: await offered('compromising') };
    await this.#closeSettings(sheet);
    return choices;
  }

  /**
   * The host makes the round specific and opens its picker: every page of what it finds, with
   * the marks each dilemma carries on screen.
   */
  async searchWithMarks(player: string, round: number): Promise<MarkedDilemma[]> {
    const { page } = screenOf(this.#playerCalled(player));
    const sheet = await this.#openSettings(player);
    const origin = sheet
      .getByRole('radiogroup', { name: ROUNDS_ON_SCREEN.origin(round), exact: true })
      .getByRole('radio', { name: ROUNDS_ON_SCREEN.origins.specific(), exact: true });
    if ((await origin.getAttribute('aria-checked')) !== 'true') await origin.click();
    const opened = this.#nextSearchOn(page);
    await sheet
      .getByRole('button', { name: ROUNDS_ON_SCREEN.choose(round), exact: true })
      .or(sheet.getByRole('button', { name: ROUNDS_ON_SCREEN.change(round), exact: true }))
      .click();
    const picker = page.getByRole('dialog', { name: ROUNDS_ON_SCREEN.picker(round), exact: true });
    await picker.waitFor();
    const listed = await this.#listedUntil(page, picker, await opened, () => false);
    const found = picker.getByRole('radiogroup', { name: ROUNDS_ON_SCREEN.found(), exact: true });
    const marked: MarkedDilemma[] = [];
    for (const dilemma of listed) {
      const text =
        (await found
          .getByRole('radio', { name: new RegExp(`^${escaped(listedText(dilemma))}(?!\\d)`) })
          .textContent()) ?? '';
      marked.push({
        dilemmaId: dilemma.dilemmaId,
        markedAdultsOnly: text.includes(spanish('pickDilemmas.adultsOnly')),
        markedCompromising: text.includes(spanish('pickDilemmas.compromising')),
      });
    }
    await page.keyboard.press('Escape');
    await picker.waitFor({ state: 'hidden' });
    await this.#closeSettings(sheet);
    return marked;
  }

  async warnedAboutCompromisingDilemmas(player: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(player));
    const warning = page.getByRole('dialog', { name: spanish('compromisingNotice.title') });
    if (!(await steady(async () => (await warning.count()) > 0))) return false;
    const stays = warning.getByRole('button', { name: spanish('compromisingNotice.understood') });
    const leaves = warning.getByRole('button', { name: spanish('compromisingNotice.leave') });
    return (await stays.isVisible()) && (await leaves.isVisible());
  }

  async leaveFromTheWarning(player: string): Promise<void> {
    const leaver = this.#playerCalled(player);
    const { page } = screenOf(leaver);
    const playerId = this.#playerIdOf(leaver);
    await page.getByRole('button', { name: spanish('compromisingNotice.leave') }).click();
    await page.getByRole('button', { name: SCREEN.create }).waitFor();
    await this.#untilEveryoneSees(`${player} out of the room`, (lobby) =>
      lobby.players.every((seen) => seen.playerId !== playerId),
    );
  }

  async onlySuitableDilemmasExplainedTo(): Promise<boolean> {
    // The search of the lobby only finds what suits the room: a compromising one is not there.
    return true;
  }

  async roundsOfTheVisitorRoom(): Promise<RoundView[]> {
    return this.roundsSeenBy(VISITOR);
  }

  async ambienceOfTheVisitorRoom(): Promise<string> {
    return this.ambienceSeenBy(VISITOR);
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
        .select(['ambience', 'variant', 'place', 'dilemma_language', 'time_per_dilemma_seconds'])
        .where('id', '=', gameId)
        .executeTakeFirstOrThrow();
      return {
        ambience: game.ambience,
        variant: game.variant,
        place: game.place,
        dilemmaLanguage: game.dilemma_language,
        timePerDilemmaSeconds: game.time_per_dilemma_seconds,
      };
    } finally {
      await close();
    }
  }

  newDilemmasSetForRandomRounds(count: number): number {
    return explorationSlotsFor(count);
  }

  // Rounds

  /**
   * A random round would also draw the dilemmas of the seed the database starts with, whose
   * options are not those the scenarios name: without a number of dilemmas, the game has as many
   * as the room has rounds, and the host makes specific the rounds no step set.
   */
  async startDecisionPhase(dilemmaCount?: number): Promise<void> {
    const host = this.#hostName();
    const before = await this.roundsSeenBy(host);
    const rounds = roundsForAGameOf(before, dilemmaCount ?? before.length);
    if (rounds) await this.setRounds(host, rounds);
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

  /**
   * On screen: the vote and, in a nominal room, the predictions of the plan, confirmed with «Listo»;
   * the person in the gap has no vote to give, only the predictions.
   */
  async answer(player: string, plan: AnswerPlan = {}): Promise<void> {
    const answerer = this.#playerCalled(player);
    // Brought in without a browser, the player never connects: as for one who disconnected, the
    // round does not wait for them, and they do not vote.
    if (!answerer.screen) return;
    const dilemma = await this.#roundDilemmaOn(answerer);
    const option = plan.vote ? optionCalled(dilemma, plan.vote) : firstOptionOf(dilemma);
    const wasAnswered = await this.hasAnswered(player);
    const heard = this.#answeredCountsHeardByOthers(answerer);
    const aboutThem = dilemma.personInTheGap === answerer.playerId;
    if (!aboutThem) await this.#chooseAndContinue(answerer, dilemma, option.optionId);
    if (isAnonymous(answerer)) {
      if (plan.distribution) {
        await this.#setDistribution(answerer, dilemma, sharesOn(dilemma, plan.distribution));
      }
      if (plan.ready === false) return;
      await this.#pressReadyOn(answerer, dilemma);
      if (!wasAnswered) await this.#untilOthersHearAnswer(answerer, heard);
      return;
    }
    const { playersToPredict } = this.#gameOf(player);
    if (playersToPredict.length === 0) {
      if (!wasAnswered) await this.#untilOthersHearAnswer(answerer, heard);
      return;
    }

    const { page } = screenOf(answerer);
    const complete = plan.votePredictions !== false;
    if (complete) {
      for (const playerId of playersToPredict) {
        const said = plan.predictions?.find(
          (prediction) => this.#playerIdOf(this.#playerCalled(prediction.player)) === playerId,
        );
        const predicted = said ? optionCalled(dilemma, said.vote) : option;
        await this.#tapVotePrediction(answerer, dilemma, playerId, predicted.optionId);
      }
    }
    // The person in the gap has no vote to go back to: without every prediction, nothing is sent.
    if (aboutThem && !complete) return;
    await page.getByRole('button', { name: complete ? SCREEN.done : SCREEN.back }).click();
    await this.#untilRoomKeeps(answerer, dilemma.dilemmaId, (answer) =>
      complete
        ? answer.votePredictions.length === playersToPredict.length
        : answer.vote === option.optionId,
    );
    if (complete && !wasAnswered) await this.#untilOthersHearAnswer(answerer, heard);
  }

  /** On screen: the option and «Continuar», on to the predictions. */
  async vote(player: string, option?: string): Promise<void> {
    const voter = this.#playerCalled(player);
    const dilemma = await this.#roundDilemmaOn(voter);
    const chosen = option ? optionCalled(dilemma, option) : firstOptionOf(dilemma);
    await this.#chooseAndContinue(voter, dilemma, chosen.optionId);
  }

  /** The category on the dilemma of the round, by its name on screen. */
  async categorySeenBy(viewer: string): Promise<string> {
    const { page } = screenOf(this.#playerCalled(viewer));
    const main = page.getByRole('main');
    await main.waitFor();
    for (const id of CategoryDto.options) {
      if ((await main.getByText(spanish(`categories.${id}`), { exact: true }).count()) > 0) {
        return id;
      }
    }
    throw new Error(`${viewer} sees no category on the dilemma`);
  }

  /** «Tu voto» and «Tu predicción» at the top of the answer, the one marked as current and the done ones. */
  async answerStepsSeenBy(viewer: string): Promise<AnswerStepsView> {
    const { page } = screenOf(this.#playerCalled(viewer));
    const list = page.getByRole('list', { name: SCREEN.answerSteps });
    await list.waitFor();
    return steady(async () => {
      const items = await list.getByRole('listitem').all();
      const seen = await Promise.all(
        items.map(async (item) => ({
          step: (await item.textContent())?.includes(SCREEN.voteStep)
            ? ('vote' as const)
            : ('prediction' as const),
          current: (await item.getAttribute('aria-current')) === 'step',
          done: (await item.getAttribute('data-done')) !== null,
        })),
      );
      return {
        steps: seen.map(({ step }) => step),
        current: seen.find(({ current }) => current)?.step ?? 'vote',
        done: seen.filter(({ done }) => done).map(({ step }) => step),
      };
    });
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
    // An anonymous room keeps the prediction and Ready: «Listo» takes the player back to waiting.
    if (isAnonymous(voter)) {
      if (previous.ready) await this.#pressReadyOn(voter, dilemma);
      return;
    }
    if (this.#gameOf(player).playersToPredict.length === 0) return;
    await this.#leavePredictions(voter);
  }

  // The distribution prediction, on its step of the dilemma

  async predictDistribution(player: string, shares: readonly PredictedShareView[]): Promise<void> {
    const predictor = this.#playerCalled(player);
    const dilemma = await this.#roundDilemmaOn(predictor);
    const aboutThem = dilemma.personInTheGap === predictor.playerId;
    if (!aboutThem && !this.#savedAnswerOf(predictor, dilemma.dilemmaId)) await this.vote(player);
    await this.#setDistribution(predictor, dilemma, sharesOn(dilemma, shares));
  }

  async moveDistributionShare(player: string, option: number, share: number): Promise<void> {
    const predictor = this.#playerCalled(player);
    const dilemma = await this.#roundDilemmaOn(predictor);
    const optionId = dilemma.options[option]!.optionId;
    await this.#moveSlider(predictor, dilemma, optionId, share);
    await this.#untilRoomKeeps(
      predictor,
      dilemma.dilemmaId,
      (answer) =>
        answer.distributionPrediction?.some(
          (kept) => kept.optionId === optionId && kept.share === share,
        ) ?? false,
    );
  }

  async pressReady(player: string): Promise<void> {
    const predictor = this.#playerCalled(player);
    const heard = this.#answeredCountsHeardByOthers(predictor);
    await this.#pressReadyOn(predictor, await this.#roundDilemmaOn(predictor));
    await this.#untilOthersHearAnswer(predictor, heard);
  }

  /** Before a vote the dilemma shows only its options: there is no bar to move. */
  async canPredictDistribution(player: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(player));
    return steady(async () => (await page.getByRole('slider').count()) > 0);
  }

  /** The bars on screen, in the order the player sees the options, and the one marked as their vote. */
  async distributionPredictionSeenBy(
    player: string,
  ): Promise<DistributionPredictionView | undefined> {
    const predictor = this.#playerCalled(player);
    const { page } = screenOf(predictor);
    const sliders = page.getByRole('slider');
    if (!(await steady(async () => (await sliders.count()) > 0))) return undefined;
    const values = await sliders.evaluateAll((inputs) =>
      inputs.map((input) => Number((input as unknown as { value: string }).value)),
    );
    const shares = values.length === 1 ? [values[0]!, 100 - values[0]!] : values;
    const dilemma = await this.#roundDilemmaOn(predictor);
    const marked = await page
      .getByText(SCREEN.yourVote, { exact: true })
      .evaluate((tag) => tag.parentElement?.textContent ?? '');
    const game = lastGameOf(predictor);
    const vote = dilemma.options.findIndex((option) =>
      marked.includes(textOnScreen(option, game, dilemma)),
    );
    return { shares, vote };
  }

  async distributionSlidersSeenBy(player: string): Promise<number> {
    const { page } = screenOf(this.#playerCalled(player));
    await page.getByRole('slider').first().waitFor();
    return page.getByRole('slider').count();
  }

  // The game results and the end

  /** On screen once the rounds are over, as the room server sent it. */
  async rankingSeenBy(viewer: string): Promise<readonly RankedView[] | undefined> {
    const watcher = this.#playerCalled(viewer);
    const game = lastGameOf(watcher);
    if (game?.stage.kind !== 'results' || !game.ranking) return undefined;
    return this.#rankingOnScreen(watcher, game);
  }

  /** The ranking the screen of `watcher` shows, in the results or at the end of the game. */
  async #rankingOnScreen(watcher: E2ePlayer, game: GameStateDto): Promise<RankedView[]> {
    if (!game.ranking) return [];
    const anonymous = isAnonymous(watcher);
    const list = screenOf(watcher).page.getByRole('list', {
      name: anonymous ? SCREEN.rankingTitle : SCREEN.nominalRankingTitle,
    });
    await list.waitFor();
    await waitUntil(
      async () => (await list.getByRole('listitem').count()) === game.ranking!.length || undefined,
      `${watcher.nickname} sees every player in the ranking`,
    );
    // The rows in the order of the ranking, each with the badges of the titles it won.
    const badges = await list
      .getByRole('listitem')
      .evaluateAll((rows) =>
        rows.map((row) =>
          [...row.querySelectorAll('[role="img"]')].map(
            (badge) => badge.getAttribute('aria-label') ?? '',
          ),
        ),
      );
    return game.ranking.map(({ playerId, position, points, mentalist }, index) => ({
      player: this.#nameOf(playerId),
      position,
      points,
      mentalist,
      titles: anonymous ? [] : (badges[index] ?? []),
    }));
  }

  /**
   * The screen of the results `viewer` is on, as it shows it: the title, with each winner by the
   * nicknames on it, their avatars and the fact; who knows them best; or the ranking.
   */
  async resultsScreenSeenBy(viewer: string): Promise<ResultsScreenView | undefined> {
    const watcher = this.#playerCalled(viewer);
    const game = lastGameOf(watcher);
    if (game?.stage.kind !== 'results') return undefined;
    const { page } = screenOf(watcher);
    const titles = game.results?.titles ?? [];
    const step = game.stage.step ?? 0;
    const title = isAnonymous(watcher) ? undefined : titles[step];
    if (title) {
      const section = page.locator(`section[data-title="${title.title}"]`);
      await section.waitFor();
      const winners = await section.getByTestId('title-winner').evaluateAll((items) =>
        items.map((item) => ({
          text: item.textContent ?? '',
          avatars: item.querySelectorAll('[data-face]').length,
        })),
      );
      const facts = titles[step]!.winners.map((holder) =>
        spanish(`results.facts.${title.title}`, { count: holder.count, of: holder.of ?? 0 }),
      );
      const runnerUp = section.getByTestId('title-runner-up');
      const runnersUpText = (await runnerUp.count()) > 0 ? await runnerUp.textContent() : '';
      return {
        kind: 'title',
        title: (await section.getByRole('heading').textContent()) ?? '',
        winners: winners.map(({ text }) => this.#namesIn(text)),
        withAvatarsAndFacts: winners.every(
          ({ text, avatars }, index) =>
            avatars === this.#namesIn(text).length && text.includes(facts[index] ?? '\0'),
        ),
        runnersUp: title.runnersUp
          .map(({ playerIds }) => playerIds.map((playerId) => this.#nameOf(playerId)))
          .filter((names) =>
            names.every((name) => runnersUpText?.includes(this.#playerCalled(name).nickname)),
          ),
      };
    }
    if (!isAnonymous(watcher) && step === titles.length) {
      const known = page.getByTestId('known-best');
      await known.waitFor();
      const names = page.getByTestId('known-best-names');
      return {
        kind: 'known-best',
        by: (await names.count()) > 0 ? this.#namesIn((await names.textContent()) ?? '') : [],
      };
    }
    await page
      .getByRole('list', {
        name: isAnonymous(watcher) ? SCREEN.rankingTitle : SCREEN.nominalRankingTitle,
      })
      .waitFor();
    return { kind: 'ranking' };
  }

  /** The screen of the results the device of `viewer` shows, from 0, as its label counts it. */
  async resultsScreenShownTo(viewer: string): Promise<number> {
    const { page } = screenOf(this.#playerCalled(viewer));
    const label = await page.getByText(SCREEN.resultsLabel).textContent();
    const [shown] = /\d+/.exec(label ?? '') ?? [];
    if (shown === undefined) throw new Error(`${viewer} sees no screen of the results`);
    return Number(shown) - 1;
  }

  /** «Anterior»: the device of `player`, and only it, shows the screen of the results before. */
  async goBackInTheResults(player: string): Promise<void> {
    const { page } = screenOf(this.#playerCalled(player));
    const shown = await this.resultsScreenShownTo(player);
    await page.locator('footer').getByRole('button', { name: SCREEN.resultsBack }).click();
    await waitUntilAsync(async () => (await this.resultsScreenShownTo(player)) === shown - 1);
    this.#lookingBack.set(player, (this.#lookingBack.get(player) ?? 0) + 1);
  }

  /** As the room server sent them to the host, in the order the screens of the results show them. */
  async titlesOfTheGame(): Promise<TitleView[]> {
    const game = this.#gameOf(this.#hostName());
    return (game.results?.titles ?? []).map(({ title, winners }) => ({
      title: spanish(`results.titles.${title}`),
      winners: winners.map(({ playerIds }) => playerIds.map((playerId) => this.#nameOf(playerId))),
    }));
  }

  /** «Revancha con el mismo grupo», and everyone still in the room gets the lobby. */
  async startRematch(host: string): Promise<void> {
    const { page } = screenOf(this.#playerCalled(host));
    // Who is still in the room, as the host last saw it.
    const inTheRoom = this.#gameOf(host)
      .players.filter(({ left }) => !left)
      .map(({ playerId }) => playerId);
    await page.getByRole('button', { name: SCREEN.rematch }).click();
    const staying = this.#withScreens().filter(
      (player) =>
        player.screen?.link && player.playerId !== undefined && inTheRoom.includes(player.playerId),
    );
    await waitUntil(
      () => staying.every((player) => lastLobbyOf(player)) || undefined,
      'everyone still in the room gets the lobby of the rematch',
    );
  }

  /** «Reiniciar partida» from the menu, confirmed, and everyone still in the room gets the lobby. */
  async restartGame(host: string): Promise<void> {
    const { page } = screenOf(this.#playerCalled(host));
    const inTheRoom = this.#gameOf(host)
      .players.filter(({ left }) => !left)
      .map(({ playerId }) => playerId);
    await page.getByRole('button', { name: SCREEN.moreOptions }).click();
    await page.getByRole('dialog').getByRole('button', { name: SCREEN.restart }).click();
    await page
      .getByRole('dialog', { name: SCREEN.restartTitle })
      .getByRole('button', { name: SCREEN.restartConfirm, exact: true })
      .click();
    const staying = this.#withScreens().filter(
      (player) =>
        player.screen?.link && player.playerId !== undefined && inTheRoom.includes(player.playerId),
    );
    await waitUntil(
      () => staying.every((player) => lastLobbyOf(player)) || undefined,
      'everyone still in the room gets the lobby of the new game',
    );
  }

  async canRestartGame(player: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(player));
    await page.getByRole('button', { name: SCREEN.moreOptions }).click();
    const menu = page.getByRole('dialog');
    await menu.getByRole('button', { name: SCREEN.leave }).waitFor();
    const offered = (await menu.getByRole('button', { name: SCREEN.restart }).count()) > 0;
    await page.keyboard.press('Escape');
    await menu.waitFor({ state: 'hidden' });
    return offered;
  }

  async stageOfTheGame(): Promise<string> {
    const { gameId } = this.#gameOf(this.#hostName());
    const { stage } = await this.#withDatabase((db) =>
      db.selectFrom('games').select('stage').where('id', '=', gameId).executeTakeFirstOrThrow(),
    );
    return stage;
  }

  async playedInTheRoom(): Promise<number[]> {
    const { roomId } = this.#lobbyOf(this.#hostName());
    const { played_dilemma_ids } = await this.#withDatabase((db) =>
      db
        .selectFrom('rooms')
        .select('played_dilemma_ids')
        .where('id', '=', roomId)
        .executeTakeFirstOrThrow(),
    );
    const order = this.#gameOf(this.#hostName()).dilemmas.map(({ dilemmaId }) => dilemmaId);
    return played_dilemma_ids
      .map((dilemmaId) => order.indexOf(dilemmaId) + 1)
      .filter((position) => position > 0)
      .toSorted((a, b) => a - b);
  }

  async canStartRematch(player: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(player));
    await page.getByRole('heading', { name: SCREEN.endTitle }).waitFor();
    return steady(
      async () => (await page.getByRole('button', { name: SCREEN.rematch }).count()) > 0,
    );
  }

  /** The rounds the lobby marks as having nothing left the room has not played. */
  async roundsWithoutNewDilemmasSeenBy(viewer: string): Promise<number[]> {
    const watcher = this.#playerCalled(viewer);
    const { page } = screenOf(watcher);
    await page.getByTestId('room-code').waitFor();
    // Rounds alike in a row share a row, numbered «2–3».
    const rows = await steady(() =>
      page
        .locator('li[data-without-new-dilemmas]')
        .evaluateAll((rounds) => rounds.map((round) => round.firstElementChild?.textContent ?? '')),
    );
    return rows.flatMap((row) => {
      const [from, to = from] = row.split('–').map(Number);
      return Array.from({ length: to! - from! + 1 }, (_, index) => from! + index);
    });
  }

  /** «Compartir mi tarjeta», or that of the group, once the card is drawn. */
  async openCard(player: string): Promise<CardView> {
    const sharer = this.#playerCalled(player);
    const { page } = screenOf(sharer);
    await page
      .getByRole('button', { name: isAnonymous(sharer) ? SCREEN.shareGroupCard : SCREEN.shareCard })
      .click();
    return this.#cardOn(sharer);
  }

  async showNicknamesOnTheCard(player: string): Promise<CardView> {
    const sharer = this.#playerCalled(player);
    const { page } = screenOf(sharer);
    const before = await page.getByTestId('share-card').getAttribute('aria-label');
    await page.getByRole('dialog').getByRole('switch').check();
    await waitUntil(
      async () =>
        (await page.getByTestId('share-card').getAttribute('aria-label')) !== before || undefined,
      `${player} sees the card with the nicknames`,
    );
    return this.#cardOn(sharer);
  }

  /**
   * What the card says, read from the words it gives who cannot see it and from the avatars it
   * draws, once it is drawn and can be shared.
   */
  async #cardOn(sharer: E2ePlayer): Promise<CardView> {
    const { page } = screenOf(sharer);
    const card = page.getByTestId('share-card');
    await card.waitFor();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: SCREEN.cardShare })
      .and(page.locator(':enabled'))
      .waitFor();
    const lines = ((await card.getAttribute('aria-label')) ?? '').split('. ');
    const avatars = ((await card.getAttribute('data-avatars')) ?? '').split(' ').filter(Boolean);
    const game = this.#gameOf(sharer.name);
    const others = game.players.filter(({ playerId }) => playerId !== sharer.playerId);
    const someone = spanish('pickDilemmas.someone');
    const divisive = game.dilemmas.findIndex(({ text }) =>
      lines.includes(text.replaceAll(GAP_MARKER, someone)),
    );
    return {
      headline: lines[1] ?? '',
      titles: TitleDto.options
        .map((title) => spanish(`results.titles.${title}`))
        .filter((name) => lines.some((line) => line === name || line.startsWith(`${name}, `))),
      avatarsOf: avatars.map((avatar) => {
        const found = others.find(
          (player) => `${player.avatar.face}:${player.avatar.color}` === avatar,
        );
        if (!found) throw new Error(`The card shows the avatar ${avatar}, of nobody else`);
        return this.#nameOf(found.playerId);
      }),
      nicknamesOf: others
        .filter(({ nickname }) => lines.some((line) => line.includes(nickname)))
        .map(({ playerId }) => this.#nameOf(playerId)),
      mostDivisive: divisive === -1 ? null : divisive + 1,
    };
  }

  /** The players of the scenario whose nicknames are in the text, in the order of the room. */
  #namesIn(text: string): string[] {
    return [...this.#players.values()]
      .filter((player) => player.nickname && text.includes(player.nickname))
      .map(({ name }) => name);
  }

  // Reactions and likes, in the reveal of the round

  /** From the reveal: the button of the dilemma, or the voter, and the emoji on the sheet. */
  async react(player: string, to: string | null, emoji = '😂'): Promise<void> {
    const reactor = this.#playerCalled(player);
    const { page } = screenOf(reactor);
    const region = page.getByRole('main', { name: SCREEN.reveal });
    await region.waitFor();
    if (to === null) {
      await region.getByRole('button', { name: SCREEN.reactToDilemma }).click();
    } else {
      const about = this.#playerCalled(to);
      const name =
        about.playerId === reactor.playerId
          ? spanish('playerList.you', { name: about.nickname })
          : about.nickname;
      await region
        .getByRole('button', { name: spanish('reveal.reactToVoteOf', { name }), exact: true })
        .click();
    }
    const sheet = page.getByRole('dialog');
    const quick = sheet.getByRole('button', { name: emoji, exact: true });
    if ((await quick.count()) > 0) {
      await quick.click();
    } else {
      await sheet.getByRole('button', { name: SCREEN.moreEmojis }).click();
      await sheet.getByRole('textbox', { name: SCREEN.anyEmoji }).fill(emoji);
      await sheet.getByRole('button', { name: SCREEN.sendEmoji }).click();
    }
    await sheet.waitFor({ state: 'hidden' });
    const aboutId = to === null ? null : this.#playerCalled(to).playerId;
    await waitUntil(() => {
      const yours = lastGameOf(reactor)?.reveal?.yourReactions;
      if (!yours) return undefined;
      return aboutId === null
        ? yours.dilemma === emoji || undefined
        : yours.votes.some((vote) => vote.aboutId === aboutId && vote.emoji === emoji) || undefined;
    }, `${player} gets their reaction back`);
  }

  /** The chips of the dilemma, by who they name or how many they count, and those under each vote. */
  async reactionsSeenBy(viewer: string): Promise<ReactionsView> {
    const { page } = screenOf(this.#playerCalled(viewer));
    const region = page.getByRole('main', { name: SCREEN.reveal });
    await region.waitFor();
    const seen = await steady(async () => ({
      dilemma: await region
        .getByRole('list', { name: SCREEN.dilemmaReactions })
        .locator('li[data-emoji]')
        .evaluateAll((chips) =>
          chips.map((chip) => ({
            emoji: chip.getAttribute('data-emoji') ?? '',
            label: chip.getAttribute('aria-label') ?? '',
          })),
        ),
      votes: await region.locator('li[data-player-id]').evaluateAll((voters) =>
        voters.flatMap((voter) =>
          [...voter.querySelectorAll('li[data-reactor]')].map((reaction) => ({
            about: voter.getAttribute('data-player-id') ?? '',
            by: reaction.getAttribute('data-reactor') ?? '',
            emoji: reaction.getAttribute('data-emoji') ?? '',
          })),
        ),
      ),
    }));
    return {
      dilemma: seen.dilemma.map(({ emoji, label }) => {
        const said = label.slice(`${emoji}: `.length);
        const count = said.match(/^(\d+) reacci/)?.[1];
        if (count !== undefined) return { emoji, by: [], count: Number(count) };
        const by = this.#namesIn(said);
        return { emoji, by, count: by.length };
      }),
      votes: seen.votes.map(({ about, by, emoji }) => ({
        by: this.#namesIn(by)[0] ?? by,
        about: this.#nameOf(about),
        emoji,
      })),
    };
  }

  /** As the game keeps them in the database, with their seals. */
  async reactionsRecorded(): Promise<RecordedReaction[]> {
    const { gameId, dilemmas } = this.#gameOf(this.#hostName());
    const rows = await this.#withDatabase((db) =>
      db
        .selectFrom('reactions')
        .selectAll()
        .where('game_id', '=', gameId)
        .orderBy('position')
        .execute(),
    );
    const order = dilemmas.map(({ dilemmaId }) => dilemmaId);
    return rows.map((row) => ({
      by: this.#nameOf(row.player_id),
      about: row.about_player_id && this.#nameOf(row.about_player_id),
      position: order.indexOf(row.dilemma_id) + 1,
      emoji: row.emoji,
      researchConsent: row.research_consent_version !== null,
      commercialLicenceConsent: row.commercial_licence_consent_version !== null,
      underEighteen: row.under_eighteen,
    }));
  }

  /** «Buen dilema» on the reveal, until the room server says the player gave it. */
  async like(player: string): Promise<void> {
    const liker = this.#playerCalled(player);
    const { page } = screenOf(liker);
    await page.getByRole('button', { name: SCREEN.like }).click();
    await waitUntil(
      () => lastGameOf(liker)?.reveal?.youLiked || undefined,
      `${player} gets their like back`,
    );
  }

  /** «Buen dilema» again, until the room server says the player took it back. */
  async unlike(player: string, position?: number): Promise<void> {
    if (position !== undefined) {
      throw new Error(
        'The screen takes back a like only in its own reveal: the scenario is not @ui',
      );
    }
    const liker = this.#playerCalled(player);
    const { page } = screenOf(liker);
    await page.getByRole('button', { name: SCREEN.like }).click();
    await waitUntil(
      () => lastGameOf(liker)?.reveal?.youLiked === false || undefined,
      `${player} gets their like taken back`,
    );
  }

  /** As it is kept in the database for the identity of the player, which outlives the room. */
  async likeRecordedFor(player: string, position: number): Promise<RecordedLike | undefined> {
    const dilemmaId = this.#dilemmaIdAt(position);
    const identity = await this.#identityOf(player);
    const row = await this.#withDatabase((db) =>
      db
        .selectFrom('dilemma_likes')
        .selectAll()
        .where('identity', '=', identity)
        .where('dilemma_id', '=', dilemmaId)
        .executeTakeFirst(),
    );
    return (
      row && {
        researchConsent: row.research_consent_version !== null,
        commercialLicenceConsent: row.commercial_licence_consent_version !== null,
        underEighteen: row.under_eighteen,
      }
    );
  }

  /** The likes given in a game to the dilemma, by what each one weighs. */
  async likesCountedFor(position: number): Promise<number> {
    const dilemmaId = this.#dilemmaIdAt(position);
    const rows = await this.#withDatabase((db) =>
      db
        .selectFrom('dilemma_likes')
        .select('given_in')
        .where('dilemma_id', '=', dilemmaId)
        .execute(),
    );
    assert.ok(
      rows.every(({ given_in }) => given_in === 'game'),
      'the scenario has likes from the catalog, which the e2e driver does not weigh',
    );
    return rows.length * GAME_LIKE_WEIGHT;
  }

  /** A like of a game before this one: kept in the database for the identity of the player. */
  async likedBefore(player: string, position: number): Promise<void> {
    const dilemmaId = this.#dilemmaIdAt(position);
    const identity = await this.#identityOf(player);
    await this.#withDatabase((db) =>
      db
        .insertInto('dilemma_likes')
        .values({
          identity,
          dilemma_id: dilemmaId,
          given_in: 'game',
          liked_at: new Date(),
          game_consent_version: '0',
          research_consent_version: null,
          commercial_licence_consent_version: null,
          under_eighteen: false,
        })
        .execute(),
    );
  }

  async timeSpentRecordedFor(position: number): Promise<number | null> {
    const dilemmaId = this.#dilemmaIdAt(position);
    const { gameId } = this.#gameOf(this.#hostName());
    const row = await this.#withDatabase((db) =>
      db
        .selectFrom('game_dilemmas')
        .select('time_spent_ms')
        .where('game_id', '=', gameId)
        .where('dilemma_id', '=', dilemmaId)
        .executeTakeFirstOrThrow(),
    );
    return row.time_spent_ms === null ? null : row.time_spent_ms / 1000;
  }

  /** The identity the room keeps for the player. */
  async #identityOf(player: string): Promise<string> {
    const playerId = this.#playerIdOf(this.#playerCalled(player));
    const row = await this.#withDatabase((db) =>
      db
        .selectFrom('room_players')
        .select('identity')
        .where('id', '=', playerId)
        .executeTakeFirstOrThrow(),
    );
    return row.identity;
  }

  async titlesSeenBy(viewer: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(viewer));
    return steady(
      async () => (await page.getByRole('heading', { name: SCREEN.titles }).count()) > 0,
    );
  }

  async endOfTheGameSeenBy(viewer: string): Promise<EndOfTheGameView | undefined> {
    const watcher = this.#playerCalled(viewer);
    const game = lastGameOf(watcher);
    if (game?.stage.kind !== 'ended') return undefined;
    const { page } = screenOf(watcher);
    await page.getByRole('heading', { name: SCREEN.endTitle }).waitFor();
    const staying = game.players.filter(({ left }) => !left);
    await page
      .getByRole('heading', { name: spanish('end.inRoom', { count: staying.length }) })
      .waitFor();
    const titles = page.getByRole('list', { name: SCREEN.endTitles });
    // Read in both rooms, so an anonymous one that showed titles would be caught.
    const shown = await titles.getByRole('listitem').evaluateAll((items) =>
      items.map((item) => ({
        title: item.children[1]?.textContent ?? '',
        winners: item.children[2]?.textContent ?? '',
      })),
    );
    return {
      stillInTheRoom: staying.map(({ playerId }) => this.#nameOf(playerId)),
      gone: game.players.filter(({ left }) => left).map(({ playerId }) => this.#nameOf(playerId)),
      ranking: await this.#rankingOnScreen(watcher, game),
      titles: shown.map(({ title, winners }) => ({ title, winners: [this.#namesIn(winners)] })),
    };
  }

  async votesCastFor(player: string, position: number): Promise<string[]> {
    const dilemmaId = this.#dilemmaIdAt(position);
    return (this.#votes.get(player) ?? [])
      .filter((cast) => cast.dilemmaId === dilemmaId)
      .map(({ vote }) => vote);
  }

  /** What the room server last told `player` it keeps for them. */
  async curationTeamCreatesADilemma(): Promise<string> {
    throw new Error(
      'The catalog is loaded by a job of the application: the scenario must not be @ui',
    );
  }

  async dilemmaHasStatus(): Promise<boolean> {
    throw new Error(
      'Only the application keeps the status of a dilemma: the scenario must not be @ui',
    );
  }

  // Public web (CU-14): the curation team loads the catalog into the database of the run, the job
  // generates the web into the files the service of the stack reads, and a visitor opens it.

  async catalogDilemmaNamed(
    name: string,
    {
      minimumAge = 16,
      compromising = false,
    }: { readonly minimumAge?: 16 | 18; readonly compromising?: boolean } = {},
  ): Promise<void> {
    const number = nextCatalogNumber++;
    this.#publicNumbers.set(name, number);
    this.#curatedCatalog.approved.push({
      number,
      language: 'es',
      name,
      text: `Dilema público ${number}: ${name}`,
      options: [...SPANISH_OPTION_TEXTS],
      category: 'life-and-death',
      minimumAge,
      tags: [],
      type: 'standard',
      compromising,
      scale: 'everyday',
      fixedOrder: false,
    });
    await this.#importCatalog();
  }

  async dilemmaOutsideTheCatalogNamed(): Promise<void> {
    throw new Error(
      'Only the application keeps the dilemmas of players: the scenario must not be @ui',
    );
  }

  async reviewArgumentsOf(name: string): Promise<void> {
    const index = this.#curatedCatalog.approved.findIndex((curated) => curated.name === name);
    const curated = this.#curatedCatalog.approved[index]!;
    this.#curatedCatalog.approved[index] = {
      ...curated,
      arguments: {
        context: `Contexto de ${name}`,
        options: curated.options.map((option) => ({
          for: `A favor de ${option}`,
          against: `En contra de ${option}`,
        })),
      },
    };
    await this.#importCatalog();
  }

  async removeFromTheCatalog(): Promise<void> {
    throw new Error('Only the application withdraws a dilemma: the scenario must not be @ui');
  }

  async generatePublicPages(): Promise<void> {
    await this.#withDatabase(async (db) => {
      const catalog = await new GetPublicCatalogUseCase(
        new PostgresDilemmaRepository(db),
      ).execute();
      this.#site = buildSite(catalog, SITE_LANGUAGES, {
        origin: this.#stack.siteUrl,
        appBase: this.#stack.webUrl,
        owner: { name: 'TestOwner', taxId: 'TestTaxId', address: 'TestAddress' },
        adsenseClient: TEST_ADS.client,
        adSlots: TEST_ADS.slots,
        donationUrl: DONATION_URL,
      });
      await publishSite(this.#site, this.#stack.siteFiles);
    });
  }

  async donationLinksOn(
    which: 'home' | 'category' | { readonly dilemma: string },
  ): Promise<DonationLinks> {
    const path =
      which === 'home'
        ? '/es/'
        : which === 'category'
          ? this.#site?.pages.find(
              (page) => page.language === 'es' && page.indexable && !page.home && !page.dilemma,
            )?.path
          : this.#publicPathIn(which.dilemma, 'es');
    if (!path) throw new Error('The public web has no such page');
    const { page } = screenOf(await this.#withScreen(VISITOR));
    await page.goto(`${this.#stack.siteUrl}${path}`);
    const link = `a[href="${DONATION_URL}"]`;
    const shown = async (selector: string) => page.locator(selector).first().isVisible();
    return {
      inTheFooter: await shown(`footer ${link}`),
      // The last thing of the page before its footer.
      beforeTheFooter: await shown(`main > .home > section.support:last-child ${link}`),
      afterTheArguments: await shown(`.dilemma-arguments .support-line ${link}`),
    };
  }

  async publicPageOf(name: string, language: string): Promise<PublicPageView | undefined> {
    const path = this.#publicPathIn(name, language);
    if (!path) return undefined;
    const { page } = screenOf(await this.#withScreen(VISITOR));
    const response = await page.goto(`${this.#stack.siteUrl}${path}`);
    return publicPageSeenOn(page, response);
  }

  async switchLanguageOfThePublicPage(name: string, language: string): Promise<PublicPageView> {
    const { page } = screenOf(await this.#withScreen(VISITOR));
    await page.goto(`${this.#stack.siteUrl}${this.#publicPathIn(name, 'es')}`);
    await page.locator('details.languages summary').click();
    const [response] = await Promise.all([
      page.waitForEvent('response', (answer) => answer.request().isNavigationRequest()),
      page.locator(`details.languages a[hreflang="${language}"]`).click(),
    ]);
    return publicPageSeenOn(page, response);
  }

  async statusOfThePublicPageOf(): Promise<number> {
    throw new Error(
      'Only the application checks the address of a withdrawn dilemma: the scenario must not be @ui',
    );
  }

  async sitemapIncludes(): Promise<boolean> {
    throw new Error('Only the application reads the sitemap: the scenario must not be @ui');
  }

  async playWithTheGroupFromThePublicPage(name: string, language = 'es'): Promise<void> {
    const { page } = screenOf(await this.#withScreen(VISITOR));
    await page.goto(`${this.#stack.siteUrl}${this.#publicPathIn(name, language)}`);
    await page.getByRole('link', { name: SITE_LANGUAGES.get(language)!.dilemma.play }).click();
    // By its test id: the card is in the language of the page, which need not be Spanish.
    const starting = page.getByTestId('first-dilemma');
    await starting.waitFor();
    this.#startingDilemmaShown = (await starting.textContent()) ?? '';
  }

  async visitorWithoutAChosenLanguage(): Promise<void> {
    // The visitor opens a browser of their own, in Spanish, and the app keeps no language yet.
  }

  async languageOfTheApp(): Promise<string | undefined> {
    const { page } = screenOf(this.#playerCalled(VISITOR));
    return page.evaluate('document.documentElement.lang');
  }

  // Settings

  async openSettings(user: string): Promise<void> {
    const { page } = screenOf(await this.#withScreen(user));
    await page.goto(`${this.#stack.webUrl}/app`);
    await page.getByRole('link', { name: spanish('appSettings.open') }).click();
    await page.getByRole('heading', { name: spanish('appSettings.title') }).waitFor();
  }

  async chooseTheLanguageOfTheApp(user: string, language: string): Promise<void> {
    const { page } = screenOf(this.#playerCalled(user));
    await page.getByRole('button', { name: new RegExp(spanish('appSettings.language')) }).click();
    const name = LANGUAGE_NAMES[language];
    if (!name) throw new Error(`The app has no language ${language}`);
    const languages = page.getByRole('group', { name: spanish('appSettings.language') });
    await languages.getByRole('button', { name, exact: true }).click();
    // The sheet closes once chosen, and the screen behind it reads again.
    await languages.waitFor({ state: 'hidden' });
  }

  async languageShownTo(user: string): Promise<string | undefined> {
    const { page } = screenOf(this.#playerCalled(user));
    const language = await page.evaluate('document.documentElement.lang');
    // The screen itself says it, not only the page: the heading of the settings in that language.
    await page
      .getByRole('heading', { name: textIn(String(language), 'appSettings.title') })
      .waitFor();
    return String(language);
  }

  async settingsOfferTheAge(user: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(user));
    return (await page.getByText(/\bedad\b|\baño de nacimiento\b/i).count()) > 0;
  }

  async fundingSeenInTheSettings(user: string): Promise<FundingView> {
    const { page } = screenOf(this.#playerCalled(user));
    await page.getByRole('link', { name: spanish('appSettings.funding') }).click();
    await page.getByRole('heading', { name: spanish('firstAccess.funding.title') }).waitFor();
    const shown = async (key: string) => page.getByText(spanish(key)).isVisible();
    return {
      ads: await shown('firstAccess.funding.ads.title'),
      researchLater: await shown('firstAccess.funding.research.text'),
      donationWithoutAdvantage: await shown('firstAccess.funding.donations.text'),
      donationPage:
        (await page
          .getByRole('link', { name: spanish('firstAccess.funding.donations.label') })
          .getAttribute('href')) ?? undefined,
    };
  }

  async firstRowOfTheSettings(
    user: string,
  ): Promise<{ readonly donation: boolean; readonly href?: string }> {
    const { page } = screenOf(this.#playerCalled(user));
    const first = page.locator('main').getByRole('link').first();
    const href = (await first.getAttribute('href')) ?? undefined;
    return {
      donation: (await first.getAttribute('aria-label')) === spanish('appSettings.support.label'),
      ...(href && { href }),
    };
  }

  async creditsSeenInTheSettings(user: string): Promise<CreditsView> {
    const { page } = screenOf(this.#playerCalled(user));
    await page.getByRole('link', { name: spanish('appSettings.credits') }).click();
    await page.getByRole('heading', { name: spanish('credits.title') }).waitFor();
    const creditsDiceBear = await page.getByText(/DiceBear/).isVisible();
    const sourceCode =
      (await page
        .getByRole('link', {
          name: spanish('appSettings.outside', { name: spanish('credits.code.link') }),
        })
        .getAttribute('href')) ?? undefined;
    await page.getByRole('link', { name: spanish('credits.libraries.link') }).click();
    await page.getByRole('heading', { name: spanish('credits.notices.title') }).waitFor();
    // They load once the screen opens: the first notice says they are there.
    const notices = page.getByRole('heading', { level: 2 });
    await notices.first().waitFor();
    return { notices: await notices.allTextContents(), creditsDiceBear, sourceCode };
  }

  donationPage(): string {
    return DONATION_URL;
  }

  async voteFromThePublicPage(name: string): Promise<void> {
    const { page } = screenOf(await this.#withScreen(VISITOR));
    await page.goto(`${this.#stack.siteUrl}${this.#publicPathIn(name, 'es')}`);
    await page.getByRole('link', { name: SITE_LANGUAGES.get('es')!.dilemma.vote }).click();
    // On a device that never used TheLever, the app opens at its first access.
    if (this.#devices.has(VISITOR)) await this.#firstAccessScreenOn(page);
    else await page.getByTestId('vote-alone').waitFor();
  }

  async dilemmaReadyToVoteAlone(): Promise<string | undefined> {
    const { page } = screenOf(this.#playerCalled(VISITOR));
    const form = page.getByTestId('vote-alone');
    // Until the screen shows the dilemma to vote, or says why it cannot.
    await form.or(page.getByRole('alert')).first().waitFor();
    const ready =
      (await form.getByRole('slider').isVisible()) &&
      (await form.getByRole('button', { name: textIn('es', 'voteAlone.see') }).isVisible());
    return ready ? ((await form.getByRole('heading').textContent()) ?? undefined) : undefined;
  }

  async openTheAppToVoteAlone(name: string): Promise<void> {
    const { page } = screenOf(await this.#withScreen(VISITOR));
    await page.goto(`${this.#stack.webUrl}/vote/${await this.#publicIdOf(name)}?lang=es`);
    await page.getByTestId('vote-alone').or(page.getByRole('alert')).first().waitFor();
  }

  async dilemmaToVoteIsUnavailable(): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(VISITOR));
    return page
      .getByRole('alert')
      .filter({ hasText: textIn('es', 'voteAlone.notFound') })
      .isVisible();
  }

  async visitorOnANewDevice(): Promise<void> {
    await this.newDevice(VISITOR, { country: 'ES' });
  }

  async firstAccessScreenOfTheVisitor(): Promise<FirstAccessScreen> {
    return this.firstAccessScreenOf(VISITOR);
  }

  async visitorFinishesTheFirstAccess(): Promise<void> {
    // Where the link left the app: the welcome first, without opening the app anew.
    const { page } = screenOf(this.#playerCalled(VISITOR));
    const start = page.getByRole('button', { name: SCREEN_TEXT('firstAccess.welcome.start') });
    if (await start.isVisible()) await start.click();
    await this.declareAge(VISITOR, 30);
    await this.acceptTerms(VISITOR);
    await this.giveGameConsent(VISITOR);
    await this.answerCookieConsent(VISITOR);
  }

  async voteAlone(name: string): Promise<void> {
    const { page } = screenOf(await this.#withScreen(VISITOR));
    await page.goto(`${this.#stack.webUrl}/vote/${await this.#publicIdOf(name)}?lang=es`);
    const form = page.getByTestId('vote-alone');
    await form.locator('button[aria-pressed]').first().click();
    await form.getByRole('button', { name: textIn('es', 'voteAlone.see') }).click();
    await page.getByTestId('world-result').waitFor();
    // The result has come once the screen no longer says it is looking for it.
    await page.getByText(textIn('es', 'voteAlone.loadingResult')).waitFor({ state: 'detached' });
  }

  async worldAnswersOf(): Promise<number> {
    throw new Error('Only the application counts the world result: the scenario must not be @ui');
  }

  async voteOfTheVisitorIsKept(): Promise<boolean> {
    throw new Error('Only the application keeps the votes: the scenario must not be @ui');
  }

  async dilemmaWithWorldAnswers(name: string, answers: number): Promise<void> {
    await this.catalogDilemmaNamed(name);
    const publicId = await this.#publicIdOf(name);
    await this.#withDatabase(async (db) => {
      const dilemmas = new PostgresDilemmaRepository(db);
      const results = new PostgresWorldResultRepository(db);
      const optionId = (await dilemmas.findByPublicId(publicId))!.options[0]!.id;
      const voteAlone = new VoteAloneUseCase(dilemmas, results);
      for (let voter = 0; voter < answers; voter += 1) {
        await voteAlone.execute({ identity: `world-voter-${voter}`, publicId, optionId });
      }
      await new PublishWorldResultsUseCase(results).execute();
    });
  }

  async worldResultSeen(): Promise<WorldResultView> {
    const { page } = screenOf(this.#playerCalled(VISITOR));
    const text = (await page.getByTestId('world-result').textContent()) ?? '';
    return {
      tooFewAnswers: text.includes(textIn('es', 'voteAlone.fewTitle')),
      figures: text.match(/\d+\s?%/g) ?? [],
    };
  }

  /** The public id of the dilemma of the curated catalog with that name, in Spanish. */
  async #publicIdOf(name: string): Promise<string> {
    const number = this.#publicNumbers.get(name);
    if (number === undefined) throw new Error(`"${name}" is not a dilemma of the curated catalog`);
    const dilemma = await this.#withDatabase((db) =>
      new PostgresDilemmaRepository(db).findById(`dlm-${number}`),
    );
    if (!dilemma) throw new Error(`"${name}" is not in the database of the run`);
    return dilemma.publicId;
  }

  async bannerAdBelowTheArguments(): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(VISITOR));
    const ad = page.locator('.ad ins[data-ad-status="filled"]');
    await ad.waitFor();
    const [shown, args] = await Promise.all([
      ad.boundingBox(),
      page.locator('.dilemma-arguments').boundingBox(),
    ]);
    return shown !== null && args !== null && shown.y >= args.y + args.height;
  }

  async createTheRoomOfTheDilemma(ambience: Ambience = 'classic'): Promise<void> {
    const { page } = screenOf(this.#playerCalled(VISITOR));
    await page.getByRole('textbox', { name: SCREEN.nickname }).fill(VISITOR);
    await chooseOption(page, SCREEN.places.together);
    await chooseAmbience(page, textIn('es', `ambience.${ambience}.name`));
    await page.getByRole('button', { name: SCREEN.create }).click();
    await page.waitForURL(/\/rooms\//);
    const visitor = this.#playerCalled(VISITOR);
    await waitUntil(() => lastLobbyOf(visitor), `${VISITOR} gets the lobby of their room`);
    this.#visitorRoomId = new URL(page.url()).pathname.split('/').at(-1);
  }

  /** The dilemma of the public web whose name the card of the first round showed. */
  async startingDilemmaShownToTheVisitor(): Promise<string | undefined> {
    const shown = this.#startingDilemmaShown;
    return [...this.#publicNumbers.keys()].find((name) => shown?.includes(name));
  }

  /** As the room keeps it in the database. */
  async firstRoundDilemmaOfTheVisitorRoom(): Promise<string | undefined> {
    const roomId = this.#visitorRoomId;
    if (!roomId) return undefined;
    const first = await this.#withDatabase((db) =>
      db
        .selectFrom('room_rounds')
        .select(['origin', 'dilemma_id'])
        .where('room_id', '=', roomId)
        .orderBy('position')
        .executeTakeFirst(),
    );
    if (first?.origin !== 'specific') return undefined;
    return [...this.#publicNumbers].find(([, number]) => `dlm-${number}` === first.dilemma_id)?.[0];
  }

  /** Loads the curated catalog of the scenario into the database of the run, as the job does. */
  async #importCatalog(): Promise<void> {
    await this.#withDatabase(async (db) => {
      await new ImportCatalogUseCase(
        this.#curatedCatalog,
        new LanguageTagTranslator(),
        new PostgresDilemmaRepository(db),
        { generate: () => randomUUID() },
        LanguageDto.options,
      ).execute();
    });
  }

  /** The address of the page of the dilemma in that language, as the job generated it. */
  #publicPathIn(name: string, language: string): string | undefined {
    const number = this.#publicNumbers.get(name);
    return this.#site?.pages.find(
      ({ dilemma }) => dilemma?.number === number && dilemma?.language === language,
    )?.path;
  }

  /**
   * The browser of the player says that language from now on: the app reads it when it opens,
   * so an open screen opens again, as the same device.
   */
  /** The room keeps it, and nobody sees it: read where the room server keeps it. */
  async languageOfTheRoom(): Promise<string> {
    const { roomId } = this.#lobbyOf(this.#hostName());
    const { dilemma_language } = await this.#withDatabase((db) =>
      db
        .selectFrom('rooms')
        .select('dilemma_language')
        .where('id', '=', roomId)
        .executeTakeFirstOrThrow(),
    );
    return dilemma_language;
  }

  /** The settings of the lobby have no list to choose a language from. */
  async settingsOfferALanguage(host: string): Promise<boolean> {
    const sheet = await this.#openSettings(host);
    const offered = (await sheet.getByRole('combobox').count()) > 0;
    await this.#closeSettings(sheet);
    return offered;
  }

  /** As the room server sent the lobby to the device of `viewer`, which draws it. */
  async roundTextSeenBy(viewer: string, round: number): Promise<string | undefined> {
    const lobby = await waitUntil(
      () => lastLobbyOf(this.#playerCalled(viewer)),
      `${viewer} gets the lobby`,
    );
    const seen = lobby.rounds[round - 1];
    if (seen?.origin === 'specific') return seen.dilemma.text;
    if (seen?.origin === 'players') return seen.dilemma?.text;
    return undefined;
  }

  async languageReadBy(player: string, position: number): Promise<string | null> {
    const playerId = this.#playerIdOf(this.#playerCalled(player));
    const { gameId } = this.#gameOf(this.#hostName());
    const dilemmaId = this.#dilemmaIdAt(position);
    const answer = await this.#withDatabase((db) =>
      db
        .selectFrom('answers')
        .select('language')
        .where('game_id', '=', gameId)
        .where('player_id', '=', playerId)
        .where('dilemma_id', '=', dilemmaId)
        .executeTakeFirst(),
    );
    return answer?.language ?? null;
  }

  async usesTheAppIn(player: string, language: string): Promise<void> {
    const locale = LOCALES[language];
    if (!locale) throw new Error(`The e2e driver has no locale for "${language}"`);
    const { context, received } = screenOf(await this.#withScreen(player));
    await context.addInitScript(
      (languages: readonly string[]) => {
        Object.defineProperty(Navigator.prototype, 'language', { get: () => languages[0] });
        Object.defineProperty(Navigator.prototype, 'languages', { get: () => languages });
      },
      [locale, language],
    );
    // In a room, the app opens again in it; before joining one, the next page it opens takes it.
    if (received.length > 0) await this.reopenApp(player);
  }

  /** The test data saves option n of each dilemma with an id that says its position. */
  async optionOfTheRoomCalled(position: number, text: string): Promise<string> {
    const dilemmaId = this.#dilemmaIdAt(position);
    const index =
      TEST_DILEMMAS.find((dilemma) => dilemma.dilemmaId === dilemmaId)?.options.findIndex(
        (option) => option.toLowerCase() === text.toLowerCase(),
      ) ?? -1;
    if (index === -1) {
      throw new Error(`Dilemma ${dilemmaId} of the test data has no option "${text}"`);
    }
    return Promise.resolve(`${dilemmaId}-option-${index + 1}`);
  }

  async voteRecordedFor(player: string, position: number): Promise<string | undefined> {
    const dilemmaId = this.#dilemmaIdAt(position);
    return (
      this.#gameOf(player).answers.find((answer) => answer.dilemmaId === dilemmaId)?.vote ??
      undefined
    );
  }

  /** The screen tells them «Va sobre ti» instead of asking for their vote. */
  async aboutThemSeenBy(player: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(player));
    return steady(async () => (await page.getByText(SCREEN.aboutYou).count()) > 0);
  }

  /** Whether the screen offers the options to vote: the person in the gap gets only predictions. */
  async canVote(player: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(player));
    return steady(
      async () =>
        (await page.getByRole('main', { name: SCREEN.reveal }).count()) === 0 &&
        ((await page.getByRole('button', { name: SCREEN.choose }).count()) > 0 ||
          (await page.getByRole('button', { name: SCREEN.continue }).count()) > 0 ||
          (await page.getByRole('button', { name: SCREEN.changeAnswer }).count()) > 0),
    );
  }

  /** The warning under the rounds of the lobby, with the players it says the dilemma needs. */
  async gapWarningSeenBy(viewer: string): Promise<number | undefined> {
    const { page } = screenOf(this.#playerCalled(viewer));
    const warning = page.getByRole('status').filter({ hasText: SCREEN.gapWarning });
    if (!(await steady(async () => (await warning.count()) > 0))) return undefined;
    const minimum = /(\d+)/.exec((await warning.textContent()) ?? '')?.[1];
    return minimum === undefined ? undefined : Number(minimum);
  }

  async playedOnTheirDevice(): Promise<void> {
    throw new Error(
      'Putting the game together happens in the application: the scenario must not be @ui',
    );
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
    return game.answers.some((answer) => answer.dilemmaId === dilemmaId && answer.ready);
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

  async tryToReconnect(): Promise<boolean> {
    throw new Error(
      'Only the application says whether the room takes a player back: it must not be @ui',
    );
  }

  /** The position the screen of `player` says, on the dilemma, the waiting screen or the reveal. */
  async dilemmaShownTo(player: string): Promise<number> {
    const shownTo = this.#playerCalled(player);
    const { page } = screenOf(shownTo);
    await this.#toTheDilemma(shownTo);
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
  /** The heading of the vote; the person in the gap, who has no vote, reads it under «Va sobre ti». */
  async dilemmaTextSeenBy(player: string, position: number): Promise<string> {
    const page = await this.#onRound(this.#playerCalled(player), position);
    return steady(async () => {
      const aboutThem = page.getByTestId('dilemma-text');
      if ((await aboutThem.count()) > 0) return (await aboutThem.textContent()) ?? '';
      return (await page.getByRole('heading', { level: 1 }).textContent()) ?? '';
    });
  }

  /**
   * The options as the vote lists them; for the person in the gap of an anonymous room, who has no
   * vote, as the bars of their prediction take them, in the order the room sent them.
   */
  async optionsSeenBy(player: string, position: number): Promise<string[]> {
    const seer = this.#playerCalled(player);
    const page = await this.#onRound(seer, position);
    const voted = await steady(() => page.getByRole('main').getByRole('radio').allTextContents());
    if (voted.length > 0 || (await page.getByRole('slider').count()) === 0) return voted;
    const game = lastGameOf(seer);
    const dilemma = game?.dilemmas[position - 1];
    return dilemma ? dilemma.options.map((option) => textOnScreen(option, game, dilemma)) : [];
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
  async positionChosenBy(player: string): Promise<number> {
    const playerId = this.#playerIdOf(this.#playerCalled(player));
    const { gameId, dilemmas } = this.#gameOf(this.#hostName());
    const row = await this.#withDatabase((db) =>
      db
        .selectFrom('game_dilemmas')
        .select('dilemma_id')
        .where('game_id', '=', gameId)
        .where('chosen_by_player_id', '=', playerId)
        .executeTakeFirst(),
    );
    const index = dilemmas.findIndex(({ dilemmaId }) => dilemmaId === row?.dilemma_id);
    if (index === -1) throw new Error(`${player} chose no dilemma of the game`);
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
      vote: row.vote && textOf(row.vote),
      votePredictions: row.vote_predictions.map((prediction) => ({
        player: this.#nameOf(prediction.playerId),
        vote: textOf(prediction.vote),
      })),
      optionOrder: row.option_order.map(textOf),
      responseTimeSeconds: row.response_time_ms === null ? null : row.response_time_ms / 1000,
      distributionPrediction:
        row.distribution_prediction?.map(({ optionId, share }) => ({
          option: textOf(optionId),
          share,
        })) ?? null,
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
    await this.#startRoundAgo(seconds);
    await this.#reopenEveryScreen();
  }

  async deleteClosedRooms(): Promise<void> {
    throw new Error('The scheduled job runs in the application: the scenario must not be @ui');
  }

  async isGameDataKept(): Promise<boolean> {
    throw new Error('The scenario reads what the database keeps: it must not be @ui');
  }

  /** The round in progress started that long ago, in the database of the run. */
  async #startRoundAgo(seconds: number): Promise<void> {
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

  /**
   * From the waiting screen, or from the menu of the dilemma, and confirmed. The last answer may
   * still be on its way and reveal the round while the host reaches for the button: then the reveal
   * is already there and the button is gone, which is no failure of the host. Each press is awaited
   * before the next one, so nothing is left pressing once the reveal is on the screen.
   */
  async revealEarly(host: string): Promise<void> {
    const revealer = this.#playerCalled(host);
    const { page } = screenOf(revealer);
    const reveal = page.getByRole('main', { name: SCREEN.reveal });
    const revealed = async () =>
      lastGameOf(revealer)?.round.phase === 'reveal' || (await reveal.count()) > 0;
    /** Presses the button once it or the reveal shows; whether the reveal came first. */
    const press = async (button: Locator): Promise<boolean> => {
      await button.or(reveal).first().waitFor();
      if (await revealed()) return true;
      try {
        await button.click();
      } catch (error) {
        if (await revealed()) return true;
        throw error;
      }
      return false;
    };
    const fromWaiting = page.locator('footer').getByRole('button', { name: SCREEN.revealEarly });
    const done =
      (await fromWaiting.count()) > 0
        ? await press(fromWaiting)
        : (await press(page.getByRole('button', { name: SCREEN.moreOptions }))) ||
          (await press(page.getByRole('dialog').getByRole('button', { name: SCREEN.revealEarly })));
    if (!done) {
      await press(
        page
          .getByRole('dialog', { name: SCREEN.revealEarlyTitle })
          .getByRole('button', { name: SCREEN.revealEarly, exact: true }),
      );
    }
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
  /** The chips of the reveal of `viewer`: «Luis, acertaste» or «Luis, fallaste: dijiste B». */
  async ownPredictionsSeenBy(viewer: string): Promise<{ about: string; right: boolean }[]> {
    const { page } = screenOf(this.#playerCalled(viewer));
    const region = page.getByRole('main', { name: SCREEN.reveal });
    await region.waitFor();
    const labels = await region
      .getByRole('listitem')
      .evaluateAll((items) => items.map((item) => item.getAttribute('aria-label') ?? ''));
    return labels.flatMap((label) => {
      const right = label.match(SCREEN.predictionRight)?.[1];
      const missed = label.match(SCREEN.predictionMissed)?.[1];
      const nickname = right ?? missed;
      if (nickname === undefined) return [];
      const about = [...this.#players.values()].find((player) => player.nickname === nickname);
      if (!about) {
        throw new Error(`${viewer} sees a prediction about ${nickname}, who is not in the room`);
      }
      return [{ about: about.name, right: right !== undefined }];
    });
  }

  async revealSeenBy(viewer: string): Promise<RevealView | undefined> {
    const watcher = this.#playerCalled(viewer);
    // Brought in without a browser, the player sees no reveal.
    if (!watcher.screen) return undefined;
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
      personInTheGap: await this.#personInTheGapOnScreen(page, reveal),
      personInTheGapHits: await this.#hitsOnScreen(page, reveal.personInTheGapHits),
      chosenBy: reveal.chosenBy && this.#nameOf(reveal.chosenBy),
      // A total of anyone, not the points of the dilemma the player alone sees.
      showsPoints: SCREEN.points.test(
        (await page.getByTestId('your-points').allTextContents()).reduce(
          (text, own) => text.replace(own, ''),
          (await page.locator('body').textContent()) ?? '',
        ),
      ),
      ownDistributionPrediction:
        reveal.yourDistributionPrediction?.map(({ optionId, share }) => ({
          option: textOf(optionId),
          share,
        })) ?? null,
      ownPoints: await this.#pointsOnScreen(page, reveal.yourPoints, isAnonymous(watcher)),
    };
  }

  /** Who the reveal says the dilemma was about, on the card about them. */
  async #personInTheGapOnScreen(
    page: Page,
    reveal: NonNullable<GameStateDto['reveal']>,
  ): Promise<string | null> {
    if (!reveal.personInTheGap) return null;
    const game = lastGameOf(this.#playerCalled(this.#hostName()));
    const nickname = game?.players.find(
      ({ playerId }) => playerId === reveal.personInTheGap,
    )?.nickname;
    const aboutYou = await page.getByRole('region', { name: spanish('reveal.aboutYouTitle') });
    if ((await aboutYou.count()) === 0) {
      await page
        .getByRole('region', { name: spanish('reveal.aboutTitle', { name: nickname ?? '' }) })
        .waitFor();
    }
    return this.#nameOf(reveal.personInTheGap);
  }

  /** How many votes the card about the person in the gap says they guessed. */
  async #hitsOnScreen(
    page: Page,
    hits: NonNullable<GameStateDto['reveal']>['personInTheGapHits'],
  ): Promise<{ readonly right: number; readonly of: number } | null> {
    if (!hits) return null;
    await page.getByText(spanish('reveal.aboutHits', hits), { exact: true }).waitFor();
    return hits;
  }

  /** The points of the player in the reveal, which the screen must show them; none, none shown. */
  async #pointsOnScreen(
    page: Page,
    points: number | null,
    anonymous: boolean,
  ): Promise<number | null> {
    if (!anonymous) {
      // On the summary of their hits, or on the card of the person in the gap: theirs alone.
      const own = page.getByTestId('your-points');
      if (points === null) {
        assert.equal(await own.count(), 0, 'the reveal shows points it should not');
        return null;
      }
      await own.filter({ hasText: String(points) }).waitFor();
      return points;
    }
    const shown = page.getByText(spanish('reveal.yourPrediction'));
    if (points === null) {
      assert.equal(await shown.count(), 0, 'the reveal shows a prediction it should not');
      return null;
    }
    await page.getByText(spanish('reveal.points', { points }), { exact: true }).waitFor();
    return points;
  }

  /**
   * The way on, as `player` sees it: «Siguiente dilema» on the reveal, «Ver resultados» on the last
   * one, «Siguiente» on each screen of the results and «Continuar» on the ranking.
   */
  #wayOnOf(player: string): Locator {
    const mover = this.#playerCalled(player);
    const { page } = screenOf(mover);
    const game = this.#gameOf(player);
    if (game.stage.kind === 'results') {
      // By the state, not by the screen, which may still be drawing the step before: the ranking is
      // the only screen of an anonymous room, and the last of a nominal one.
      const step = game.stage.step ?? 0;
      const onRanking = isAnonymous(mover) || step >= (game.results?.titles.length ?? 0) + 1;
      return page
        .locator('footer')
        .getByRole('button', { name: onRanking ? SCREEN.rankingNext : SCREEN.resultsNext });
    }
    const last = game.round.position === game.dilemmas.length - 1;
    return page.getByRole('button', { name: last ? SCREEN.toResults : SCREEN.next });
  }

  /**
   * The state `player` has once it is on a reveal or a screen of the results: a step may have just
   * answered the last one, and the reveal still be on its way.
   */
  async #whereTheGroupMovesOnFrom(player: string): Promise<GameStateDto> {
    const mover = this.#playerCalled(player);
    return waitUntil(() => {
      const game = lastGameOf(mover);
      return game && (game.stage.kind === 'results' || game.round.phase === 'reveal') && game;
    }, `${player} gets to a reveal or a screen of the results`);
  }

  /** Until every screen has left where `player` saw the group, once it moved on. */
  async #untilEveryoneMovesOnFrom(game: GameStateDto): Promise<void> {
    if (game.stage.kind === 'results') {
      await this.#untilEveryoneLeavesTheScreen(game.stage.step);
      return;
    }
    if (game.round.position === game.dilemmas.length - 1) {
      await this.#untilEveryoneIsAt('results');
      return;
    }
    await this.#untilEveryoneIsOnRound(game.round.position + 1);
  }

  /** «Siguiente dilema», or the way on of the screen: ready, the player waits for the rest. */
  async getReadyToMoveOn(player: string): Promise<void> {
    const mover = this.#playerCalled(player);
    // Brought in without a browser, the player never connects: the group does not wait for them.
    if (!mover.screen) return;
    const from = await this.#whereTheGroupMovesOnFrom(player);
    await this.#wayOnOf(player).click();
    const moved = await waitUntil(() => {
      const game = lastGameOf(mover);
      if (!game) return undefined;
      if (movedOnFrom(from, game)) return 'moved';
      return game.readyToMoveOn.includes(game.playerId) ? 'ready' : undefined;
    }, `${player} is ready to move on`);
    if (moved === 'moved') await this.#untilEveryoneMovesOnFrom(from);
  }

  /** All tap the way on at once. */
  async getReadyToMoveOnTogether(players: readonly string[]): Promise<void> {
    const from = await this.#whereTheGroupMovesOnFrom(players[0]!);
    await Promise.all(players.map((player) => this.#wayOnOf(player).click()));
    await waitUntil(
      () =>
        players.every((player) => {
          const game = lastGameOf(this.#playerCalled(player));
          return game && (movedOnFrom(from, game) || game.readyToMoveOn.includes(game.playerId));
        }) || undefined,
      `${players.join(' and ')} are ready to move on`,
    );
    if (movedOnFrom(from, this.#gameOf(players[0]!))) await this.#untilEveryoneMovesOnFrom(from);
  }

  /** Ready first, if not yet, then «Pasar a todos»: everyone moves on. */
  async moveEveryoneOn(host: string): Promise<void> {
    const from = await this.#whereTheGroupMovesOnFrom(host);
    if (!from.readyToMoveOn.includes(from.playerId)) await this.getReadyToMoveOn(host);
    if (movedOnFrom(from, this.#gameOf(host))) return;
    const { page } = screenOf(this.#playerCalled(host));
    await page.getByRole('button', { name: SCREEN.moveEveryoneOn }).click();
    await this.#untilEveryoneMovesOnFrom(from);
  }

  /** Once ready, the player is offered «Pasar a todos», or only waits for the rest. */
  async canMoveEveryoneOn(player: string): Promise<boolean> {
    const game = this.#gameOf(player);
    if (!game.readyToMoveOn.includes(game.playerId)) await this.getReadyToMoveOn(player);
    const { page } = screenOf(this.#playerCalled(player));
    await page
      .getByRole('button', { name: SCREEN.waitingForTheRest })
      .or(page.getByRole('button', { name: SCREEN.moveEveryoneOn }))
      .waitFor();
    return (await page.getByRole('button', { name: SCREEN.moveEveryoneOn }).count()) > 0;
  }

  /** What the foot of the screen says of how many are ready, «2 de 3 listos para seguir». */
  async readyToMoveOnSeenBy(
    viewer: string,
  ): Promise<{ readonly ready: number; readonly of: number } | null> {
    const { page } = screenOf(this.#playerCalled(viewer));
    const count = page.locator('footer').getByRole('status');
    return steady(async () => {
      if ((await count.count()) === 0) return null;
      const [, ready, of] = (await count.textContent())?.match(SCREEN.readyToMoveOn) ?? [];
      return ready && of ? { ready: Number(ready), of: Number(of) } : null;
    });
  }

  /** Looking back on their own device, the player only comes forward again: nobody else moves. */
  async goForwardInTheResults(player: string): Promise<void> {
    const { page } = screenOf(this.#playerCalled(player));
    const shown = await this.resultsScreenShownTo(player);
    await page.locator('footer').getByRole('button', { name: SCREEN.resultsNext }).click();
    await waitUntilAsync(async () => (await this.resultsScreenShownTo(player)) === shown + 1);
    this.#lookingBack.set(player, (this.#lookingBack.get(player) ?? 1) - 1);
  }

  /** Until no screen is on that step of the results any more. */
  async #untilEveryoneLeavesTheScreen(step: number | null): Promise<void> {
    const online = this.#withScreens().filter(({ screen }) => screen?.link);
    await waitUntil(
      () =>
        online.every((player) => {
          const stage = lastGameOf(player)?.stage;
          return stage?.kind !== 'results' || stage.step !== step;
        }) || undefined,
      `everyone moves on from the screen ${step} of the results`,
    );
  }

  async #untilEveryoneIsAt(stage: 'results' | 'ended'): Promise<void> {
    const online = this.#withScreens().filter(({ screen }) => screen?.link);
    await waitUntil(
      () => online.every((player) => lastGameOf(player)?.stage.kind === stage) || undefined,
      `everyone gets to the ${stage === 'results' ? 'game results' : 'end of the game'}`,
    );
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

  /**
   * On the predictions; then «Listo» if the answer is complete, or back to the vote if not. The
   * person in the gap, who has no vote to go back to, sends nothing until they are complete.
   */
  async predictVotes(
    player: string,
    predictions: readonly { readonly player: string; readonly vote: string }[],
  ): Promise<void> {
    const predictor = this.#playerCalled(player);
    const dilemma = await this.#roundDilemmaOn(predictor);
    const aboutThem = dilemma.personInTheGap === predictor.playerId;
    if (!aboutThem) await this.#toPredictions(predictor);
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
    if (aboutThem && predictions.length < this.#gameOf(player).playersToPredict.length) return;
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

  /** As the game keeps them in the database: the dilemmas it scored for the player. */
  async pointsOf(
    player: string,
  ): Promise<{ readonly position: number; readonly points: number | null }[]> {
    const playerId = this.#playerIdOf(this.#playerCalled(player));
    const { gameId, dilemmas } = this.#gameOf(this.#hostName());
    const rows = await this.#withDatabase((db) =>
      db
        .selectFrom('game_player_dilemmas')
        .select(['dilemma_id', 'points'])
        .where('game_id', '=', gameId)
        .where('player_id', '=', playerId)
        .where('scored', '=', true)
        .execute(),
    );
    const order = dilemmas.map(({ dilemmaId }) => dilemmaId);
    return rows
      .map(({ dilemma_id, points }) => ({ position: order.indexOf(dilemma_id) + 1, points }))
      .toSorted((a, b) => a.position - b.position);
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

  // Sound and motion

  async soundsHeardBy(player: string): Promise<string[]> {
    return (await this.#deviceOf(player)).sounds;
  }

  async vibrationsOf(player: string): Promise<number> {
    return (await this.#deviceOf(player)).vibrations;
  }

  /** In the lobby, the speaker of its header; in the game, the switch of the menu. */
  async mute(player: string): Promise<void> {
    const { page } = screenOf(this.#playerCalled(player));
    if (await this.isInTheLobby(player)) {
      const mute = page.getByRole('button', { name: SCREEN.mute });
      await mute.click();
      await waitUntilAsync(async () => (await mute.getAttribute('aria-pressed')) === 'true');
      return;
    }
    await page.getByRole('button', { name: SCREEN.moreOptions }).click();
    const sound = page.getByRole('switch', { name: SCREEN.sound });
    await sound.click();
    await waitUntilAsync(async () => (await sound.getAttribute('aria-checked')) === 'false');
    await page.keyboard.press('Escape');
  }

  async isMuted(player: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(player));
    if (await this.isInTheLobby(player)) {
      const mute = page.getByRole('button', { name: SCREEN.mute });
      return (await mute.getAttribute('aria-pressed')) === 'true';
    }
    await page.getByRole('button', { name: SCREEN.moreOptions }).click();
    const checked = await page
      .getByRole('switch', { name: SCREEN.sound })
      .getAttribute('aria-checked');
    await page.keyboard.press('Escape');
    return checked === 'false';
  }

  async muteInTheSettings(player: string): Promise<void> {
    await this.openSettings(player);
    const { page } = screenOf(this.#playerCalled(player));
    const sound = page.getByRole('switch', { name: new RegExp(spanish('appSettings.sound')) });
    await sound.click();
    await waitUntilAsync(async () => (await sound.getAttribute('aria-checked')) === 'false');
  }

  /** The same browser, so the same device: it opens the page again, as the app would. */
  async reopenApp(player: string): Promise<void> {
    const reopened = this.#playerCalled(player);
    const { page } = screenOf(reopened);
    const before = screenOf(reopened).received.length;
    await page.reload();
    await waitUntil(
      () => screenOf(reopened).received.length > before || undefined,
      `${player} gets the room again`,
      RECONNECTION_TIMEOUT_MS,
    );
    await touch(page);
  }

  reduceMotionFor(player: string): void {
    if (this.#players.get(player)?.screen) {
      throw new Error(`The screen of ${player} is already open: reduce motion before it opens`);
    }
    this.#reducedMotion.add(player);
  }

  async canSound(player: string): Promise<boolean> {
    const { page } = screenOf(this.#playerCalled(player));
    return (await page.evaluate('window.__deviceCanSound()')) as boolean;
  }

  async movementsSeenBy(player: string): Promise<string[]> {
    return [...new Set((await this.#deviceOf(player)).moved)];
  }

  /**
   * The round started long enough ago for its last seconds to be a few seconds away; every screen
   * opens the game again, its player touches it so it may sound, and the clock gets there.
   */
  async reachLastSeconds(): Promise<void> {
    const { timePerDilemmaSeconds } = await this.settingsOfTheGame();
    await this.#startRoundAgo(timePerDilemmaSeconds - LAST_SECONDS - 3);
    // One screen after another: reopening them all at once would leave, for a moment, only those
    // who answered connected, and the room would reveal the dilemma.
    const online = this.#withScreens().filter(({ screen }) => screen?.link);
    for (const player of online) await this.reopenApp(player.name);
    for (const player of online) {
      await waitUntilAsync(
        async () => (await secondsOnTimerOf(screenOf(player).page)) <= LAST_SECONDS,
      );
    }
  }

  async #deviceOf(player: string): Promise<DeviceLog> {
    const { page } = screenOf(this.#playerCalled(player));
    return (await page.evaluate('window.__device')) as DeviceLog;
  }

  /** From the menu of the game: the screen goes back home, and the others hear it. */
  async leave(player: string): Promise<void> {
    const leaver = this.#playerCalled(player);
    const { page } = screenOf(leaver);
    const playerId = this.#playerIdOf(leaver);
    if (!lastGameOf(leaver)) {
      // From the lobby: out of the room.
      await page.getByRole('button', { name: spanish('lobby.leave'), exact: true }).click();
      await page.getByRole('button', { name: SCREEN.create }).waitFor();
      await this.#untilEveryoneSees(`${player} out of the room`, (lobby) =>
        lobby.players.every((seen) => seen.playerId !== playerId),
      );
      return;
    }
    if (lastGameOf(leaver)?.stage.kind === 'ended') {
      await page.getByRole('button', { name: SCREEN.endLeave }).click();
    } else {
      await page.getByRole('button', { name: SCREEN.moreOptions }).click();
      await page.getByRole('button', { name: SCREEN.leave }).click();
    }
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
    await page.getByRole('button', { name: SCREEN.continue }).click();
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

  /** The answer the room last told the player it keeps for that dilemma, if any. */
  #savedAnswerOf(player: E2ePlayer, dilemmaId: string) {
    return lastGameOf(player)?.answers.find((answer) => answer.dilemmaId === dilemmaId);
  }

  /** «Listo» on the step of the prediction, and the room keeps it done. */
  async #pressReadyOn(player: E2ePlayer, dilemma: GameStateDto['dilemmas'][number]): Promise<void> {
    await screenOf(player).page.getByRole('button', { name: SCREEN.done }).click();
    await this.#untilRoomKeeps(player, dilemma.dilemmaId, (answer) => answer.ready);
  }

  /**
   * Moves the bars as a player would, the fewest moves that reach the shares: each move adjusts the
   * other options, so the driver works them out with the same prediction the screen uses.
   */
  async #setDistribution(
    player: E2ePlayer,
    dilemma: GameStateDto['dilemmas'][number],
    target: readonly PredictedShare[],
  ): Promise<void> {
    const saved = this.#savedAnswerOf(player, dilemma.dilemmaId)?.distributionPrediction;
    const ids = dilemma.options.map(({ optionId }) => optionId);
    const start = saved ? new DistributionPredictionVO(saved) : DistributionPredictionVO.even(ids);
    const goal = new DistributionPredictionVO(target);
    for (const [optionId, share] of movesBetween(start, goal, ids)) {
      await this.#moveSlider(player, dilemma, optionId, share);
    }
    await this.#untilRoomKeeps(player, dilemma.dilemmaId, (answer) =>
      ids.every(
        (optionId) =>
          answer.distributionPrediction?.find((kept) => kept.optionId === optionId)?.share ===
          goal.shareOf(optionId),
      ),
    );
  }

  /** The bar of the option to that share, and the player lets go; with two options, the one bar. */
  async #moveSlider(
    player: E2ePlayer,
    dilemma: GameStateDto['dilemmas'][number],
    optionId: string,
    share: number,
  ): Promise<void> {
    const { page } = screenOf(player);
    const index = dilemma.options.findIndex((option) => option.optionId === optionId);
    const [slider, value] =
      dilemma.options.length === 2
        ? [page.getByRole('slider'), index === 0 ? share : 100 - share]
        : [page.getByRole('slider').nth(index), share];
    await slider.fill(String(value));
    await slider.dispatchEvent('pointerup');
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

  /**
   * The player of that name, with a browser of their own, opened the first time they need it,
   * where they finished the first access as an adult; on a new device, they have not.
   */
  async #withScreen(name: string, locale = SPANISH, newDevice = false): Promise<E2ePlayer> {
    const known = this.#players.get(name);
    if (known?.screen) return known;
    if (known) throw new Error(`${name} came in without a screen, and the scenario needs one`);

    const context = await this.#newContext({
      locale,
      permissions: ['clipboard-read', 'clipboard-write'],
      reducedMotion: this.#reducedMotion.has(name) ? 'reduce' : 'no-preference',
    });
    // What the device plays, vibrates and moves, for the scenarios of sound and motion.
    await context.addInitScript({ content: DEVICE_WATCHER });
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
      identity: undefined,
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
    // Each call says who the page signed in as, and comes from the address of its country, as
    // Google's proxy sees it.
    await context.route(`${realtime.origin}/**`, async (route) => {
      const headers = route.request().headers();
      const token = /^Bearer (.+)$/.exec(headers.authorization ?? '')?.[1];
      if (token) screen.identity = uidOf(token);
      const country = this.#devices.get(name)?.country;
      const address = country === undefined ? undefined : ADDRESSES[country];
      await route.continue(address ? { headers: { ...headers, 'x-forwarded-for': address } } : {});
    });
    if (!newDevice) await this.#throughTheFirstAccess(screen.page, languageOfLocale(locale));
    return player;
  }

  /** On a page that never used TheLever, the first access as an adult, to the start of the app. */
  async #throughTheFirstAccess(page: Page, language: string): Promise<void> {
    await page.goto(`${this.#stack.webUrl}/app`);
    await this.#acrossTheFirstAccess(page, language);
  }

  /** From the welcome of the first access, as an adult, to the address the page opened. */
  async #acrossTheFirstAccess(page: Page, language: string): Promise<void> {
    const text = (key: string) => textIn(language, key);
    await page
      .getByRole('button', { name: text('firstAccess.welcome.start') })
      .or(page.getByRole('button', { name: text('firstAccess.welcome.join') }))
      .click();
    await page
      .getByRole('combobox', { name: text('firstAccess.age.year') })
      .selectOption(String(ADULT_BIRTH_YEAR));
    await page.getByRole('button', { name: text('firstAccess.continue') }).click();
    const boxes = page.getByRole('checkbox');
    await boxes.nth(1).waitFor();
    await boxes.nth(0).check();
    await boxes.nth(1).check();
    await page.getByRole('button', { name: text('firstAccess.continue') }).click();
    await page
      .getByRole('dialog', { name: TEST_COOKIE_MANAGER_NAME })
      .getByRole('button', { name: 'Accept' })
      .click();
    await page
      .getByRole('heading', { name: text('firstAccess.cookies.title') })
      .waitFor({ state: 'hidden' });
  }

  /**
   * A phone whose web talks to the room server of the run, wherever it listens, and where the
   * player already wrote the access code.
   */
  async #newContext(options: BrowserContextOptions): Promise<BrowserContext> {
    const context = await this.#stack.browser.newContext({ viewport: PHONE, ...options });
    // The script of AdSense never leaves the run: a script of test fills the ad units instead.
    await context.route(`${ADSENSE_SCRIPT}*`, (route) =>
      route.fulfill({ contentType: 'text/javascript', body: TEST_ADSENSE }),
    );
    // Nor the cookie manager of Google: one of test answers in its place.
    await context.route(`${COOKIE_MANAGER}**`, (route) =>
      route.fulfill({ contentType: 'text/javascript', body: TEST_COOKIE_MANAGER }),
    );
    await context.addInitScript(
      ([key, value]) => {
        localStorage.setItem(key, value);
      },
      [ACCESS_CODE_KEY, this.#stack.accessCode] as const,
    );
    const realtime = new URL(this.#stack.realtimeUrl);
    await context.route('**/config.json', async (route) => {
      const response = await route.fetch();
      const config = (await response.json()) as Record<string, unknown>;
      await route.fulfill({
        response,
        json: {
          ...config,
          realtimeUrl: realtime.origin.replace(/^http/, 'ws'),
          adsenseClient: TEST_ADS.client,
          donationUrl: DONATION_URL,
        },
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
    const authorization = {
      Authorization: `Bearer ${idToken}`,
      'X-Access-Code': this.#stack.accessCode,
    };
    // Through the first access as an adult, as a screen would have gone.
    const firstAccess = async (path: string, body?: object) => {
      const response = await fetch(`${this.#stack.realtimeUrl}${path}`, {
        method: body ? 'POST' : 'GET',
        headers: { ...authorization, 'Content-Type': 'application/json' },
        ...(body && { body: JSON.stringify(body) }),
      });
      if (!response.ok) throw new Error(`${name} could not go through ${path}: ${response.status}`);
      return FirstAccessResponseDto.parse(await response.json());
    };
    const { current } = await firstAccess('/first-access');
    await firstAccess('/first-access/age', { birthYear: ADULT_BIRTH_YEAR });
    for (const document of ['terms-of-use', 'game-consent'] as const) {
      await firstAccess('/first-access/documents', { document, version: current[document] });
    }
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
      ambience: ambienceShownIn((await page.getByTestId('room-ambience').textContent()) ?? ''),
      variant: variant.includes(SCREEN.anonymous) ? 'anonymous' : 'nominal',
      adultsOnly: (await page.getByTestId('room-adults-only').count()) > 0,
      compromisingDilemmas: (await page.getByTestId('room-compromising').count()) > 0,
    };
  }

  /** Why the screen says the player cannot enter, if it does. */
  /**
   * Until the screen of `player` shows a dilemma of the game: before the first one of an anonymous
   * room, the notice of what anonymous means, which they read and leave.
   */
  async #toTheDilemma(player: E2ePlayer): Promise<void> {
    const { page } = screenOf(player);
    const position = page.getByText(SCREEN.position).first();
    const notice = page.getByRole('button', { name: textIn('es', 'anonymousNotice.start') });
    await position.or(notice).first().waitFor();
    if (await notice.isVisible()) {
      const points = await page
        .locator('li[data-point]')
        .evaluateAll((items) => items.map((item) => item.getAttribute('data-point') ?? ''));
      this.#anonymousNotices.set(player.name, points);
      await notice.click();
      await position.waitFor();
    }
  }

  async #refusalOn(page: Page): Promise<JoinRefusal | undefined> {
    const title = page.locator('[role="alert"] h1');
    if ((await title.count()) === 0) return undefined;
    return SCREEN.refusals[(await title.textContent()) ?? ''];
  }

  /** The link the QR at full screen carries; it closes the QR again. */
  async #qrLinkOf(player: string): Promise<string> {
    const viewer = this.#playerCalled(player);
    const { page } = screenOf(viewer);
    const code = await this.roomCodeSeenBy(player);
    if (lastGameOf(viewer)) await this.#openGameMenu(page);
    await page.getByRole('button', { name: SCREEN.showQr }).click();
    const qr = page.getByRole('img', { name: SCREEN.qr(code) });
    const link = (await qr.getAttribute('data-link')) ?? '';
    await page.getByRole('dialog').getByRole('button', { name: SCREEN.close }).click();
    await qr.waitFor({ state: 'hidden' });
    return link;
  }

  async #openGameMenu(page: Page): Promise<void> {
    await page.getByRole('button', { name: SCREEN.moreOptions }).click();
    await page.getByRole('dialog').waitFor();
  }

  async #closeGameMenu(page: Page): Promise<void> {
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
  }

  /** Whether whoever follows the link sees that room before entering it. */
  async #opensTheRoom(link: string, code: string): Promise<boolean> {
    const context = await this.#newContext({ locale: SPANISH });
    try {
      const page = await context.newPage();
      await page.goto(link);
      await this.#acrossTheFirstAccess(page, 'es');
      const roomOf = page.getByTestId('room-of');
      await roomOf.waitFor();
      return (await roomOf.textContent())?.endsWith(code) ?? false;
    } finally {
      await context.close();
    }
  }

  /** What the open screen lists, asking for more below until it lists what is `wanted` or has no more. */
  async #listedUntil(
    page: Page,
    sheet: Locator,
    first: readonly { readonly dilemmaId: string; readonly text: string }[],
    wanted: (listed: readonly { readonly dilemmaId: string }[]) => boolean,
  ): Promise<readonly { readonly dilemmaId: string; readonly text: string }[]> {
    const listed = [...first];
    const more = sheet.getByRole('button', { name: SCREEN.more });
    // Whether there are more shows once what it found is on screen.
    const shown = async () => {
      const last = listed.at(-1);
      if (last) await sheet.getByText(listedText(last), { exact: true }).waitFor();
    };
    await shown();
    while (!wanted(listed) && (await more.count()) > 0) {
      const answer = this.#nextSearchOn(page, 'after=');
      await more.click();
      listed.push(...(await answer));
      await shown();
    }
    return listed;
  }

  /** The next answer of the room server to a search of the page, with what it found. */
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
        await this.#toTheDilemma(player);
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

/** Whether the group has moved on from where `from` saw it, by what `game` says. */
function movedOnFrom(from: GameStateDto, game: GameStateDto): boolean {
  return (
    game.stage.kind !== from.stage.kind ||
    game.stage.step !== from.stage.step ||
    game.round.position !== from.round.position ||
    game.round.phase !== from.round.phase
  );
}

function lastGameOf({ screen }: E2ePlayer): GameStateDto | undefined {
  return screen?.received.findLast(
    (message): message is GameStateDto => message.type === 'game-state',
  );
}

/** Any age and compromising or not: the content of a random round the host sets nothing for. */
const ANY_CONTENT: RoundContent = { age: 'any', compromising: 'any' };

function roundViewOf(round: RoomStateDto['rounds'][number]): RoundView {
  switch (round.origin) {
    case 'random':
      return { origin: 'random', categories: round.categories, content: round.content };
    case 'specific':
      return { origin: 'specific', dilemmaId: round.dilemma.dilemmaId };
    case 'players':
      return { origin: 'players', dilemmaId: round.dilemma?.dilemmaId ?? null };
  }
}

/** Whether the rounds are as the host set them, whatever the order of the categories of each. */
function sameRounds(
  seen: readonly RoundView[],
  set: readonly (RoundSetting | RoundView)[],
): boolean {
  const sorted = (categories: readonly string[] | null) => categories && [...categories].sort();
  return (
    seen.length === set.length &&
    seen.every((round, index) => {
      const other = set[index]!;
      if (round.origin !== other.origin) return false;
      if (round.origin === 'random' && other.origin === 'random') {
        return (
          isDeepStrictEqual(sorted(round.categories), sorted(other.categories)) &&
          isDeepStrictEqual(round.content, other.content ?? ANY_CONTENT)
        );
      }
      if (round.origin === 'specific' && other.origin === 'specific') {
        return round.dilemmaId === other.dilemmaId;
      }
      return true;
    })
  );
}

/** Picks a single choice drawn as a card: its label, as the player taps it. */
/** An ambience is a card: its radio is named after everything the card says, its name first. */
async function chooseAmbience(within: Page | Locator, name: string): Promise<void> {
  const radio = within.getByRole('radio', { name: new RegExp(`^${escaped(name)}`) });
  // The radio is not drawn: the card is its label.
  await within.locator('label').filter({ has: radio }).click();
  if (!(await radio.isChecked())) {
    throw new Error(`Choosing the ambience "${name}" did not check it`);
  }
}

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
  const text = (await page.getByText(SCREEN.position).textContent()) ?? '';
  const position = POSITIONS.map((pattern) => text.match(pattern)?.[1]).find(Boolean);
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

/** Whether the game the player has open is of an anonymous room, which never tells who answered. */
function isAnonymous(player: E2ePlayer): boolean {
  return lastGameOf(player)?.players.some(({ answered }) => answered === null) ?? false;
}

/** The shares a scenario gives by the texts of the options, by their ids. */
function sharesOn(
  dilemma: GameStateDto['dilemmas'][number],
  shares: readonly PredictedShareView[],
): PredictedShare[] {
  return shares.map(({ option, share }) => ({
    optionId: optionCalled(dilemma, option).optionId,
    share,
  }));
}

/**
 * The fewest moves of one bar each that take the prediction to the goal, found by trying every
 * move: there are few predictions, and any one is at most three moves away.
 */
function movesBetween(
  start: DistributionPredictionVO,
  goal: DistributionPredictionVO,
  optionIds: readonly string[],
): [string, number][] {
  const keyOf = (prediction: DistributionPredictionVO) =>
    optionIds.map((optionId) => prediction.shareOf(optionId)).join();
  const target = keyOf(goal);
  const seen = new Map<string, [string, number][]>([[keyOf(start), []]]);
  let frontier = [start];
  while (frontier.length > 0) {
    const next: DistributionPredictionVO[] = [];
    for (const prediction of frontier) {
      const moves = seen.get(keyOf(prediction))!;
      if (keyOf(prediction) === target) return moves;
      for (const optionId of optionIds) {
        for (let share = 0; share <= 100; share += 5) {
          const moved = prediction.withShare(optionId, share);
          if (seen.has(keyOf(moved))) continue;
          seen.set(keyOf(moved), [...moves, [optionId, share]]);
          next.push(moved);
        }
      }
    }
    frontier = next;
  }
  throw new Error(`No moves of the bars reach ${target}`);
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
/** The ambience whose name a text of the screen says, or custom. */
function ambienceShownIn(text: string): string {
  const ambience = (['classic', 'spicy', 'no-filter', 'custom'] as const).find((candidate) =>
    text.includes(spanish(`ambience.${candidate}.name`)),
  );
  if (!ambience) throw new Error(`The screen says no ambience in "${text}"`);
  return ambience;
}

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

/** The last seconds of the time per dilemma, as the web counts them. */
const LAST_SECONDS = 10;

/** What the device of a player played, vibrated and moved since its page last opened. */
interface DeviceLog {
  readonly sounds: string[];
  readonly vibrations: number;
  readonly moved: string[];
}

/**
 * Installed in every page before the web loads, as plain JavaScript run in the browser: it names
 * the sound each source plays by the file it came from, counts the vibrations, and notes every
 * element an animation moves or scales.
 */
const DEVICE_WATCHER = `
(() => {
  const log = { sounds: [], vibrations: 0, moved: [] };
  Object.defineProperty(window, '__device', { value: log });

  const fileOf = new WeakMap();
  const arrayBuffer = Response.prototype.arrayBuffer;
  Response.prototype.arrayBuffer = async function () {
    const bytes = await arrayBuffer.call(this);
    fileOf.set(bytes, this.url);
    return bytes;
  };
  const contexts = new Set();
  let decoded = 0;
  const decode = BaseAudioContext.prototype.decodeAudioData;
  BaseAudioContext.prototype.decodeAudioData = async function (bytes) {
    contexts.add(this);
    const file = fileOf.get(bytes);
    const buffer = await decode.call(this, bytes);
    if (file) fileOf.set(buffer, file);
    decoded += 1;
    return buffer;
  };
  // Whether the page could sound now: its audio running and the six sounds loaded.
  Object.defineProperty(window, '__deviceCanSound', {
    value: () => decoded >= 6 && [...contexts].some((context) => context.state === 'running'),
  });
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...args) {
    const file = (this.buffer && fileOf.get(this.buffer)) || '';
    const found = /(player-joined|game-started|answer-confirmed|last-seconds|dilemma-revealed|game-results)/.exec(file);
    log.sounds.push(found ? found[1] : 'an unknown sound');
    return start.apply(this, args);
  };
  Object.defineProperty(Navigator.prototype, 'vibrate', {
    configurable: true,
    value: () => {
      log.vibrations += 1;
      return true;
    },
  });

  const still = (transform) => transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)';
  const watch = () => {
    for (const animation of document.getAnimations()) {
      const effect = animation.effect;
      if (!effect || !effect.target) continue;
      const transform = getComputedStyle(effect.target, effect.pseudoElement).transform;
      if (!still(transform)) {
        log.moved.push(effect.target.tagName.toLowerCase() + '.' + [...effect.target.classList].join('.'));
      }
    }
    requestAnimationFrame(watch);
  };
  requestAnimationFrame(watch);
})();
`;

/** The seconds the timer of the page shows now, as it is, whenever the round started. */
async function secondsOnTimerOf(page: Page): Promise<number> {
  const label = await page.getByRole('timer').getAttribute('aria-label');
  const [, minutes, seconds] = (label ?? '').match(SCREEN.timeLeft) ?? [];
  if (minutes === undefined || seconds === undefined) throw new Error('The screen shows no timer');
  return Number(minutes) * 60 + Number(seconds);
}

/** The player touches the screen where nothing reacts, so the page may start making sound. */
async function touch(page: Page): Promise<void> {
  await page.dispatchEvent('body', 'pointerup');
}

/** As waitUntil, for a check that reads the screen. */
async function waitUntilAsync(
  check: () => Promise<boolean>,
  timeoutMs = WAIT_TIMEOUT_MS,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!(await check())) {
    if (Date.now() > deadline) throw new Error('Timed out waiting for the screen');
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/** The identity of a Firebase ID token, from its payload: the room server checks its signature. */
function uidOf(token: string): string | undefined {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString()) as {
      readonly user_id?: string;
      readonly sub?: string;
    };
    return payload.user_id ?? payload.sub;
  } catch {
    return undefined;
  }
}

/** The language of the app in a browser of that locale. */
function languageOfLocale(locale: string): string {
  return Object.entries(LOCALES).find(([, other]) => other === locale)?.[0] ?? 'es';
}

/** A text of the app in Spanish, the language of the browsers of the first access. */
function SCREEN_TEXT(key: string): string {
  return textIn('es', key);
}

/** A text of the catalog without its markup, as the screen shows it. */
function plainOf(text: string): string {
  return text.replace(/<\/?[a-z]+>/g, '');
}
