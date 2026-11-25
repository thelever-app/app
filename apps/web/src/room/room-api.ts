import {
  type AcceptDocumentRequestDto,
  type AvatarDto,
  type CreateRoomRequestDto,
  type CategoryDto,
  CreateRoomResponseDto,
  DilemmaPreviewResponseDto,
  type ErrorCodeDto,
  FirstAccessResponseDto,
  HttpErrorDto,
  type IllegalContentNoticeRequestDto,
  type ModerationNoticeDto,
  ModerationNoticesResponseDto,
  JoinRoomResponseDto,
  MyDataResponseDto,
  RoomPreviewResponseDto,
  SearchDilemmasResponseDto,
  WorldResultResponseDto,
} from '@thelever-app/protocol';
import type { AccessCode } from '../identity/access-code.ts';
import type { PlayerIdentity } from '../identity/anonymous-player.ts';

/** The room server said no, with the stable code the screen translates; none if it did not say why. */
export class RoomApiError extends Error {
  readonly code: ErrorCodeDto | undefined;

  constructor(code: ErrorCodeDto | undefined) {
    super(code ?? 'the room server did not answer as the contract says');
    this.name = 'RoomApiError';
    this.code = code;
  }
}

/** What a player does with the rooms before entering one, and searching once in it. */
export interface RoomApi {
  /**
   * Opens the app: the first time, it begins the first access, and the visit is recorded with
   * where the link that opened it came from, read from its query; it says where it is.
   */
  openApp(search?: string): Promise<FirstAccessResponseDto>;
  /** Once and for good; the month only of who may be under 18, month-of-birth-needed without it. */
  declareAge(birthYear: number, birthMonth?: number): Promise<FirstAccessResponseDto>;
  /** Accepts the terms of use, or gives the game consent, in the version the app showed. */
  acceptDocument(
    document: AcceptDocumentRequestDto['document'],
    version: number,
  ): Promise<FirstAccessResponseDto>;
  createRoom(request: CreateRoomRequestDto): Promise<CreateRoomResponseDto>;
  /** The room of a code, as the player typed it or as the link carries it. */
  previewRoom(code: string): Promise<RoomPreviewResponseDto>;
  /** The dilemma a link of the public web leads to, to start a room with it or vote it alone. */
  /** To vote it alone, as the public web shows them; or to start a room, also one for adults. */
  previewDilemma(
    publicId: string,
    purpose?: { readonly toStartARoom: boolean },
  ): Promise<DilemmaPreviewResponseDto>;
  /** Votes the option of the dilemma alone, for its world result: once, already-voted the second time. */
  voteAlone(publicId: string, optionId: string): Promise<void>;
  /** How the world voted the dilemma, for the vote and the prediction the device keeps. */
  worldResult(
    publicId: string,
    optionId: string,
    prediction: number,
  ): Promise<WorldResultResponseDto>;
  /** With the dilemmas the device says its player played, which the room puts its games together with. */
  joinRoom(
    roomId: string,
    nickname: string,
    avatar: AvatarDto,
    playedDilemmaIds: readonly string[],
    /** The room of their own the player leaves for this one, which then closes. */
    leavingRoomId?: string,
  ): Promise<JoinRoomResponseDto>;
  /** A page of the search: the first one, or the one after the `next` of the page before. */
  searchDilemmas(
    roomId: string,
    /** One category, or every one; what the player typed, looked for in the text and the tags. */
    criteria: { readonly category?: CategoryDto; readonly q?: string; readonly after?: string },
  ): Promise<SearchDilemmasResponseDto>;
  /** Anyone sends the web form of illegal content, without the first access. */
  sendIllegalContentNotice(notice: IllegalContentNoticeRequestDto): Promise<void>;
  /** The decisions the player has not seen yet, the oldest first, for the app to show on opening. */
  moderationNotices(): Promise<readonly ModerationNoticeDto[]>;
  /** The player saw the decision: the app does not show it again. */
  seeModerationNotice(noticeId: string): Promise<void>;
  /** The access code the player wrote, which every call carries from now on. */
  enterAccessCode(code: string): void;
  /** What Settings › Privacy and data shows: the code for requests by email and the permissions. */
  myData(): Promise<MyDataResponseDto>;
  /** Withdraws the game consent; it says where the first access is, which asks for it again. */
  withdrawGameConsent(): Promise<FirstAccessResponseDto>;
  /** Objects to product analytics, or no longer. */
  objectToAnalytics(objects: boolean): Promise<void>;
  /** Asks for the data of the player to be deleted. */
  requestDataDeletion(): Promise<void>;
}

/** The parameters of the link the app opened with that say where the visit came from. */
const ORIGIN_PARAMETERS = ['utm_source', 'utm_campaign', 'utm_content', 'ref'] as const;

/** The query of the origin of the visit, from the query of the address: nothing else of it. */
function originQueryOf(search: string | undefined): string {
  const from = new URLSearchParams(search);
  const origin = new URLSearchParams();
  for (const name of ORIGIN_PARAMETERS) {
    const value = from.get(name);
    if (value) origin.set(name, value.slice(0, 200));
  }
  return origin.size > 0 ? `?${origin.toString()}` : '';
}

export interface HttpRoomApiOptions {
  /** The room server, as the config gives it for its socket: the same host serves HTTP. */
  readonly realtimeUrl: string;
  readonly player: PlayerIdentity;
  /** The access code of a closed environment, kept on the device. */
  readonly accessCode: AccessCode;
  readonly fetch?: typeof fetch;
  readonly newTraceparent: () => string;
}

/** Any schema of the contract: it reads the body or says it cannot. */
interface Schema<T> {
  safeParse(body: unknown): { success: true; data: T } | { success: false };
}

/** An answer with no body, as 204 is. */
const NO_CONTENT: Schema<void> = { safeParse: () => ({ success: true, data: undefined }) };

/**
 * The HTTP routes of the room server, as the player who signed in: every call carries their
 * token, where the environment asks for it the proof that it comes from the app and, once the
 * player wrote it, the access code. A code the server turns down is forgotten.
 */
export function httpRoomApi({
  realtimeUrl,
  player,
  accessCode,
  fetch: send = fetch,
  newTraceparent,
}: HttpRoomApiOptions): RoomApi {
  const base = realtimeUrl.replace(/^ws/, 'http');

  async function call<T>(
    method: 'GET' | 'POST',
    path: string,
    schema: Schema<T>,
    body?: unknown,
  ): Promise<T> {
    const headers = new Headers({
      Authorization: `Bearer ${await player.getToken(false)}`,
      traceparent: newTraceparent(),
    });
    const appCheckToken = await player.getAppCheckToken(false);
    if (appCheckToken) headers.set('X-Firebase-AppCheck', appCheckToken);
    const code = accessCode.current();
    // Encoded, since a header only carries Latin-1 and the player may type anything.
    if (code !== undefined) headers.set('X-Access-Code', encodeURIComponent(code));
    if (body !== undefined) headers.set('Content-Type', 'application/json');

    const response = await send(`${base}${path}`, {
      method,
      headers,
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    const read: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      const error = new RoomApiError(HttpErrorDto.safeParse(read).data?.code);
      if (error.code === 'invalid-access-code' && code !== undefined) accessCode.forget(code);
      throw error;
    }
    const parsed = schema.safeParse(read);
    if (!parsed.success) throw new RoomApiError(undefined);
    return parsed.data;
  }

  return {
    openApp: (search) =>
      call('GET', `/first-access${originQueryOf(search)}`, FirstAccessResponseDto),
    declareAge: (birthYear, birthMonth) =>
      call('POST', '/first-access/age', FirstAccessResponseDto, {
        birthYear,
        ...(birthMonth !== undefined && { birthMonth }),
      }),
    acceptDocument: (document, version) =>
      call('POST', '/first-access/documents', FirstAccessResponseDto, { document, version }),
    createRoom: (request) => call('POST', '/rooms', CreateRoomResponseDto, request),
    previewRoom: (code) =>
      call('GET', `/rooms/by-code/${encodeURIComponent(code)}`, RoomPreviewResponseDto),
    previewDilemma: (publicId, purpose) =>
      call(
        'GET',
        `/dilemmas/${encodeURIComponent(publicId)}${purpose?.toStartARoom ? '?for=room' : ''}`,
        DilemmaPreviewResponseDto,
      ),
    voteAlone: (publicId, optionId) =>
      call('POST', `/dilemmas/${encodeURIComponent(publicId)}/vote`, NO_CONTENT, { optionId }),
    worldResult: (publicId, optionId, prediction) => {
      const query = new URLSearchParams({ option: optionId, prediction: String(prediction) });
      return call(
        'GET',
        `/dilemmas/${encodeURIComponent(publicId)}/world-result?${query.toString()}`,
        WorldResultResponseDto,
      );
    },
    joinRoom: (roomId, nickname, avatar, playedDilemmaIds, leavingRoomId) =>
      call('POST', `/rooms/${encodeURIComponent(roomId)}/players`, JoinRoomResponseDto, {
        nickname,
        avatar,
        playedDilemmaIds,
        ...(leavingRoomId && { leavingRoomId }),
      }),
    searchDilemmas: async (roomId, { category, q, after }) => {
      const query = new URLSearchParams();
      if (category) query.set('category', category);
      if (q) query.set('q', q);
      if (after) query.set('after', after);
      const search = query.size > 0 ? `?${query.toString()}` : '';
      return call(
        'GET',
        `/rooms/${encodeURIComponent(roomId)}/dilemmas${search}`,
        SearchDilemmasResponseDto,
      );
    },
    sendIllegalContentNotice: (notice) =>
      call('POST', '/illegal-content-notices', NO_CONTENT, notice),
    moderationNotices: async () =>
      (await call('GET', '/moderation-notices', ModerationNoticesResponseDto)).notices,
    seeModerationNotice: (noticeId) =>
      call('POST', `/moderation-notices/${encodeURIComponent(noticeId)}/seen`, NO_CONTENT),
    enterAccessCode: (code) => accessCode.remember(code),
    myData: () => call('GET', '/my-data', MyDataResponseDto),
    withdrawGameConsent: () =>
      call('POST', '/my-data/game-consent-withdrawal', FirstAccessResponseDto, {}),
    objectToAnalytics: (objects) =>
      call('POST', '/my-data/analytics-objection', NO_CONTENT, { objects }),
    requestDataDeletion: () => call('POST', '/my-data/deletion', NO_CONTENT, {}),
  };
}
