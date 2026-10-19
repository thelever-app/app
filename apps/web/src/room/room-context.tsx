import { createContext, useContext, type ReactNode } from 'react';
import type { RoomConnection } from './room-connection.ts';

const RoomConnectionContext = createContext<RoomConnection | undefined>(undefined);

interface RoomConnectionProviderProps {
  readonly connection: RoomConnection;
  readonly children: ReactNode;
}

export function RoomConnectionProvider({ connection, children }: RoomConnectionProviderProps) {
  return <RoomConnectionContext value={connection}>{children}</RoomConnectionContext>;
}

export function useRoomConnection(): RoomConnection {
  const connection = useContext(RoomConnectionContext);
  if (connection === undefined) {
    throw new Error('useRoomConnection must be called inside RoomConnectionProvider');
  }
  return connection;
}
