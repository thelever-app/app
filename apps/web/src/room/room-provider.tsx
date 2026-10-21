import type { GameStateDto } from '@thelever-app/protocol';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import type { RoomConnection } from './room-connection.ts';
import { roomReducer } from './room-reducer.ts';

interface Room {
  readonly game: GameStateDto;
  readonly answerDilemma: (dilemmaId: string, vote: string) => void;
}

interface RoomProviderProps {
  readonly connection: RoomConnection;
  /** What the screen shows until the room sends its first state. */
  readonly fallback: ReactNode;
  readonly children: ReactNode;
}

const RoomContext = createContext<Room | undefined>(undefined);

/** Follows the room once for the whole app and shares its state with every screen below. */
export function RoomProvider({ connection, fallback, children }: RoomProviderProps) {
  const [game, dispatch] = useReducer(roomReducer, undefined);

  useEffect(() => connection.subscribe(dispatch), [connection]);

  const answerDilemma = useCallback(
    (dilemmaId: string, vote: string) => {
      connection.send({ type: 'answer-dilemma', dilemmaId, vote });
    },
    [connection],
  );

  const room = useMemo(() => game && { game, answerDilemma }, [game, answerDilemma]);

  if (!room) return fallback;
  return <RoomContext value={room}>{children}</RoomContext>;
}

export function useRoom(): Room {
  const room = useContext(RoomContext);
  if (room === undefined) {
    throw new Error('useRoom must be called inside RoomProvider');
  }
  return room;
}
