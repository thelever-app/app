import type {
  ClientMessageDto,
  ErrorCodeDto,
  ErrorDto,
  GameStateDto,
  RoomStateDto,
  AnswerDilemmaDto,
} from '@thelever-app/protocol';
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

/** What a player sends once in the room: anything but saying who connects. */
export type RoomCommandDto = Exclude<ClientMessageDto, { readonly type: 'connect' }>;

/** The answer to a dilemma as the screen holds it, complete or not yet. */
export type AnswerDraft = Omit<AnswerDilemmaDto, 'type' | 'traceparent'>;

interface Room {
  /** The room while the player is in its lobby. */
  readonly lobby: RoomStateDto | undefined;
  /** The game once the player has one; then there is no lobby. */
  readonly game: GameStateDto | undefined;
  /** How the link to the room is doing, as the browser sees it. */
  readonly status: RoomConnectionStatus;
  /** The last message the server rejected, until the next state or until the player dismisses it. */
  readonly rejection: ErrorDto | undefined;
  readonly send: (command: RoomCommandDto) => void;
  /** The answer to a dilemma as it stands: the vote and, in a nominal room, the predictions made. */
  readonly answerDilemma: (answer: AnswerDraft) => void;
  readonly dismissRejection: () => void;
}

interface RoomProviderProps {
  readonly connection: RoomConnection;
  /** What the screen shows until the room sends its first state. */
  readonly fallback: ReactNode;
  /** What the screen shows, whatever it held, once the room will not take the player back. */
  readonly rejected: (code: ErrorCodeDto | undefined) => ReactNode;
  readonly children: ReactNode;
}

const RoomContext = createContext<Room | undefined>(undefined);

/** Follows the room the player is in and shares its state with every screen below. */
export function RoomProvider({ connection, fallback, rejected, children }: RoomProviderProps) {
  const [{ lobby, game, expelled, rejection }, dispatch] = useReducer(
    roomReducer,
    INITIAL_ROOM_STATE,
  );

  useEffect(() => connection.subscribe(dispatch), [connection]);

  // The status lives in the connection, not in React: React reads it as it renders, so it is never stale.
  const subscribeStatus = useCallback(
    (onChange: () => void) => connection.subscribeStatus(onChange),
    [connection],
  );
  const getStatus = useCallback(() => connection.getStatus(), [connection]);
  const status = useSyncExternalStore(subscribeStatus, getStatus);

  const send = useCallback(
    (command: RoomCommandDto) => {
      connection.send(command);
    },
    [connection],
  );

  const answerDilemma = useCallback(
    (answer: AnswerDraft) => {
      send({ type: 'answer-dilemma', ...answer });
    },
    [send],
  );

  const dismissRejection = useCallback(() => {
    dispatch({ type: 'rejection-dismissed' });
  }, []);

  const room = useMemo(
    () =>
      (lobby ?? game) && { lobby, game, status, rejection, send, answerDilemma, dismissRejection },
    [lobby, game, status, rejection, send, answerDilemma, dismissRejection],
  );

  // The connection hands over why before it gives up, so the reason is already here.
  if (status === 'rejected') return rejected(expelled ? 'player-expelled' : rejection?.code);
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

/** The room of a screen that only shows while the player has a game. */
export function useGame(): Room & { readonly game: GameStateDto } {
  const room = useRoom();
  const { game } = room;
  if (game === undefined) {
    throw new Error('useGame must be called while the player has a game');
  }
  return { ...room, game };
}

/** The room of a screen that only shows while the player is in the lobby. */
export function useLobby(): Room & { readonly lobby: RoomStateDto } {
  const room = useRoom();
  const { lobby } = room;
  if (lobby === undefined) {
    throw new Error('useLobby must be called while the player is in the lobby');
  }
  return { ...room, lobby };
}
