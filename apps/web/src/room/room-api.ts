import {
  type AvatarDto,
  type CreateRoomRequestDto,
  CreateRoomResponseDto,
  type ErrorCodeDto,
  HttpErrorDto,
  JoinRoomResponseDto,
  RoomPreviewResponseDto,
  SearchDilemmasResponseDto,
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
  createRoom(request: CreateRoomRequestDto): Promise<CreateRoomResponseDto>;
  /** The room of a code, as the player typed it or as the link carries it. */
  previewRoom(code: string): Promise<RoomPreviewResponseDto>;
  joinRoom(roomId: string, nickname: string, avatar: AvatarDto): Promise<JoinRoomResponseDto>;
  searchDilemmas(
    roomId: string,
    /** One category, or every one; what the player typed, looked for in the text and the tags. */
    criteria: { readonly category?: string; readonly q?: string },
  ): Promise<SearchDilemmasResponseDto['dilemmas']>;
  /** The access code the player wrote, which every call carries from now on. */
  enterAccessCode(code: string): void;
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
      if (error.code === 'invalid-access-code') accessCode.forget();
      throw error;
    }
    const parsed = schema.safeParse(read);
    if (!parsed.success) throw new RoomApiError(undefined);
    return parsed.data;
  }

  return {
    createRoom: (request) => call('POST', '/rooms', CreateRoomResponseDto, request),
    previewRoom: (code) =>
      call('GET', `/rooms/by-code/${encodeURIComponent(code)}`, RoomPreviewResponseDto),
    joinRoom: (roomId, nickname, avatar) =>
      call('POST', `/rooms/${encodeURIComponent(roomId)}/players`, JoinRoomResponseDto, {
        nickname,
        avatar,
      }),
    searchDilemmas: async (roomId, { category, q }) => {
      const query = new URLSearchParams();
      if (category) query.set('category', category);
      if (q) query.set('q', q);
      const search = query.size > 0 ? `?${query.toString()}` : '';
      const { dilemmas } = await call(
        'GET',
        `/rooms/${encodeURIComponent(roomId)}/dilemmas${search}`,
        SearchDilemmasResponseDto,
      );
      return dilemmas;
    },
    enterAccessCode: (code) => accessCode.remember(code),
  };
}
