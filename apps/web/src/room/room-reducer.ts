import type {
  ConnectionChangedDto,
  ErrorDto,
  GameStateDto,
  ProgressUpdatedDto,
  ServerMessageDto,
} from '@thelever-app/protocol';

/** What the screen draws: the game as the server sent it, and the last message it rejected. */
export interface RoomState {
  readonly game: GameStateDto | undefined;
  /** Cleared by the next state, which already shows what the server kept, or when the player dismisses it. */
  readonly rejection: ErrorDto | undefined;
}

/** A message of the room, or the player dismissing the rejection. */
export type RoomAction = ServerMessageDto | { readonly type: 'rejection-dismissed' };

export const INITIAL_ROOM_STATE: RoomState = { game: undefined, rejection: undefined };

/**
 * Turns each message of the room into the state the screen draws.
 * It copies what the server sends and never works anything out on its own (ADR 0001).
 * A message older than the state it holds is dropped, so the screen never goes backwards.
 */
export function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case 'game-state':
      return applyGameState(state, action);
    case 'progress-updated':
      return applyProgress(state, action);
    case 'connection-changed':
      return applyConnection(state, action);
    case 'error':
      return keepRejection(state, action);
    case 'rejection-dismissed':
      return dismissRejection(state);
  }
}

/** The whole game, unless it is older than the one the screen holds; it clears the rejection. */
function applyGameState(state: RoomState, message: GameStateDto): RoomState {
  const { game } = state;
  const isOlder =
    game !== undefined &&
    (message.gameVersion < game.gameVersion || message.roomVersion < game.roomVersion);
  if (isOlder) return state;

  return { game: message, rejection: undefined };
}

/** The new progress of a player, unless the game the screen holds already includes it. */
function applyProgress(state: RoomState, message: ProgressUpdatedDto): RoomState {
  const { game } = state;
  if (!game || message.gameVersion <= game.gameVersion) return state;

  return {
    ...state,
    game: {
      ...game,
      gameVersion: message.gameVersion,
      players: game.players.map((player) =>
        player.playerId === message.playerId ? { ...player, progress: message.progress } : player,
      ),
    },
  };
}

/** Whether a player is connected, unless the room the screen holds already includes the change. */
function applyConnection(state: RoomState, message: ConnectionChangedDto): RoomState {
  const { game } = state;
  if (!game || message.roomVersion <= game.roomVersion) return state;

  return {
    ...state,
    game: {
      ...game,
      roomVersion: message.roomVersion,
      players: game.players.map((player) =>
        player.playerId === message.playerId ? { ...player, connected: message.connected } : player,
      ),
    },
  };
}

/** What the server rejected, without touching the game. */
function keepRejection(state: RoomState, message: ErrorDto): RoomState {
  return { ...state, rejection: message };
}

function dismissRejection(state: RoomState): RoomState {
  return { ...state, rejection: undefined };
}
