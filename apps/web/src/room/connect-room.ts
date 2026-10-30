import type { LanguageDto } from '@thelever-app/protocol';
import type { WebConfig } from '../config/web-config.ts';
import type { PlayerIdentity } from '../identity/anonymous-player.ts';
import type { RoomConnection } from './room-connection.ts';
import { WebSocketRoomConnection, type WebSocketLike } from './websocket-room-connection.ts';

export interface ConnectRoomOptions {
  /** The path of the address, which names the game: /games/:gameId. */
  readonly pathname: string;
  readonly language: LanguageDto;
  /** In development, an address without a game opens the simulated room. */
  readonly development: boolean;
  readonly loadConfig: () => Promise<WebConfig>;
  /** Only for a real game: the simulated room needs nobody signed in. */
  readonly signIn: (config: WebConfig) => Promise<PlayerIdentity>;
  readonly createSocket: (url: string) => WebSocketLike;
}

const GAME_PATH = /^\/games\/([^/]+)\/?$/;

/**
 * Composition root of the screen's link to the room: the room server for the game in the address,
 * or, in development and without a game, a simulated room in the browser.
 */
export async function connectRoom({
  pathname,
  language,
  development,
  loadConfig,
  signIn,
  createSocket,
}: ConnectRoomOptions): Promise<RoomConnection> {
  const gameId = GAME_PATH.exec(pathname)?.[1];

  if (gameId === undefined) {
    if (!development) throw new Error(`The address ${pathname} names no game`);
    const [{ SimulatedRoomConnection }, { DEMO_ROOM }] = await Promise.all([
      import('./simulated-room-connection.ts'),
      import('./demo-room.ts'),
    ]);
    return SimulatedRoomConnection.open(DEMO_ROOM);
  }

  const config = await loadConfig();
  const player = await signIn(config);
  return WebSocketRoomConnection.open({
    url: config.realtimeUrl,
    gameId: decodeURIComponent(gameId),
    language,
    getToken: (forceRefresh) => player.getToken(forceRefresh),
    createSocket,
    schedule: (callback, ms) => {
      const timer = setTimeout(callback, ms);
      return () => clearTimeout(timer);
    },
    random: Math.random,
  });
}
