import type { LanguageDto } from '@thelever-app/protocol';
import type { PlayerIdentity } from '../identity/anonymous-player.ts';
import type { RoomApi } from './room-api.ts';
import type { RoomConnection } from './room-connection.ts';
import { type PageActivity, watchForPauses } from './pause-watcher.ts';
import { newTraceparent } from './traceparent.ts';
import {
  type Schedule,
  WebSocketRoomConnection,
  type WebSocketLike,
} from './websocket-room-connection.ts';

/** The room the web opens in development at /rooms/simulated, with nothing else running. */
export const SIMULATED_ROOM_ID = 'simulated';

export interface ConnectRoomOptions {
  /** The room of the address: /rooms/:roomId. */
  readonly roomId: string;
  readonly language: LanguageDto;
  /** In development, the simulated room has an address of its own. */
  readonly development: boolean;
  /** The room server of the environment. */
  readonly realtimeUrl: string;
  /** Only for a real room: the simulated room needs nobody signed in. */
  readonly player: PlayerIdentity;
  /** The HTTP routes of the room server, which the room uses to search dilemmas. */
  readonly api: RoomApi;
  readonly createSocket: (url: string) => WebSocketLike;
  /** Whether someone uses the page, to pause the connection while nobody does. */
  readonly pageActivity: PageActivity;
}

/** The link to the room, and the routes the screen calls while in it. */
export interface ConnectedRoom {
  readonly connection: RoomConnection;
  readonly api: RoomApi;
}

/**
 * Composition root of the screen's link to a room: the room server for the room in the address,
 * or, in development, the simulated room in the browser, which also answers the searches.
 * Closing the connection stops watching the page, so leaving the room leaves nothing running.
 */
export async function connectRoom({
  roomId,
  language,
  development,
  realtimeUrl,
  player,
  api,
  createSocket,
  pageActivity,
}: ConnectRoomOptions): Promise<ConnectedRoom> {
  if (development && roomId === SIMULATED_ROOM_ID) {
    const [{ SimulatedRoomConnection }, { DEMO_ROOM }] = await Promise.all([
      import('./simulated-room-connection.ts'),
      import('./demo-room.ts'),
    ]);
    const simulated = await SimulatedRoomConnection.open({ ...DEMO_ROOM, language });
    return {
      connection: simulated,
      api: { ...api, searchDilemmas: (_roomId, criteria) => simulated.searchDilemmas(criteria) },
    };
  }

  const schedule: Schedule = (callback, ms) => {
    const timer = setTimeout(callback, ms);
    return () => clearTimeout(timer);
  };
  const connection = WebSocketRoomConnection.open({
    url: realtimeUrl,
    roomId,
    language,
    getToken: (forceRefresh) => player.getToken(forceRefresh),
    getAppCheckToken: (forceRefresh) => player.getAppCheckToken(forceRefresh),
    createSocket,
    schedule,
    random: Math.random,
    newTraceparent,
  });
  const stopWatching = watchForPauses(connection, { pageActivity, schedule });
  return {
    connection: {
      send: (message) => connection.send(message),
      subscribe: (listener) => connection.subscribe(listener),
      subscribeStatus: (listener) => connection.subscribeStatus(listener),
      getStatus: () => connection.getStatus(),
      close: () => {
        stopWatching();
        connection.close();
      },
    },
    api,
  };
}
