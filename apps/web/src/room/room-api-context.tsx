import { createContext, useContext, type ReactNode } from 'react';
import type { RoomApi } from './room-api.ts';

const RoomApiContext = createContext<RoomApi | undefined>(undefined);

/** Gives every screen below the HTTP routes of the room server, as the player who signed in. */
export function RoomApiProvider({ api, children }: { api: RoomApi; children: ReactNode }) {
  return <RoomApiContext value={api}>{children}</RoomApiContext>;
}

/** The HTTP routes of the room server; only below RoomApiProvider. */
export function useRoomApi(): RoomApi {
  const api = useContext(RoomApiContext);
  if (!api) throw new Error('useRoomApi needs a RoomApiProvider above it');
  return api;
}
