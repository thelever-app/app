import type { ErrorCodeDto, ErrorDto, GameStateDto } from '@thelever-app/protocol';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { RoomConnection, RoomConnectionStatus } from './room-connection.ts';
import { INITIAL_ROOM_STATE, roomReducer } from './room-reducer.ts';

interface Room {
  readonly game: GameStateDto;
  /** How the link to the room is doing, as the browser sees it. */
  readonly status: RoomConnectionStatus;
  /** The last message the server rejected, until the next state or until the player dismisses it. */
  readonly rejection: ErrorDto | undefined;
  readonly answerDilemma: (dilemmaId: string, vote: string) => void;
  readonly dismissRejection: () => void;
}

interface RoomProviderProps {
  readonly connection: RoomConnection;
  /** What the screen shows until the room sends its first state. */
  readonly fallback: ReactNode;
  /** What the screen shows, with or without a game, once the room will not take the player back. */
  readonly rejected: (code: ErrorCodeDto | undefined) => ReactNode;
  readonly children: ReactNode;
}

const RoomContext = createContext<Room | undefined>(undefined);

/** Follows the room once for the whole app and shares its state with every screen below. */
export function RoomProvider({ connection, fallback, rejected, children }: RoomProviderProps) {
  const [{ game, rejection }, dispatch] = useReducer(roomReducer, INITIAL_ROOM_STATE);

  useEffect(() => connection.subscribe(dispatch), [connection]);

  // The status lives in the connection, not in React: React reads it as it renders, so it is never stale.
  const subscribeStatus = useCallback(
    (onChange: () => void) => connection.subscribeStatus(onChange),
    [connection],
  );
  const getStatus = useCallback(() => connection.getStatus(), [connection]);
  const status = useSyncExternalStore(subscribeStatus, getStatus);

  const answerDilemma = useCallback(
    (dilemmaId: string, vote: string) => {
      connection.send({ type: 'answer-dilemma', dilemmaId, vote });
    },
    [connection],
  );

  const dismissRejection = useCallback(() => {
    dispatch({ type: 'rejection-dismissed' });
  }, []);

  const room = useMemo(
    () => game && { game, status, rejection, answerDilemma, dismissRejection },
    [game, status, rejection, answerDilemma, dismissRejection],
  );

  // The connection hands over why before it gives up, so the code is already here.
  if (status === 'rejected') return rejected(rejection?.code);
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
