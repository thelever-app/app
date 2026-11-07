import { createContext, useContext, type ReactNode } from 'react';
import type { ConnectedRoom } from './connect-room.ts';

/** Opens the link to a room by its id, with everything the environment gives. */
export type OpenRoom = (roomId: string) => Promise<ConnectedRoom>;

const OpenRoomContext = createContext<OpenRoom | undefined>(undefined);

/** Gives the screen of a room the way to open its link, built once when the app starts. */
export function OpenRoomProvider({
  openRoom,
  children,
}: {
  openRoom: OpenRoom;
  children: ReactNode;
}) {
  return <OpenRoomContext value={openRoom}>{children}</OpenRoomContext>;
}

/** How to open the link to a room; only below OpenRoomProvider. */
export function useOpenRoom(): OpenRoom {
  const openRoom = useContext(OpenRoomContext);
  if (!openRoom) throw new Error('useOpenRoom needs an OpenRoomProvider above it');
  return openRoom;
}
