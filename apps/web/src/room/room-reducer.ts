import type {
  ConnectionChangedDto,
  ErrorDto,
  GameStateDto,
  ProgressUpdatedDto,
  RoomStateDto,
  ServerMessageDto,
} from '@thelever-app/protocol';

/**
 * What the screen draws: the lobby or the game as the server sent it, whether the host expelled
 * the player, and the last message it rejected.
 */
export interface RoomState {
  /** The room while the player is in its lobby; none once they get a game. */
  readonly lobby: RoomStateDto | undefined;
  readonly game: GameStateDto | undefined;
  readonly expelled: boolean;
  /** Cleared by the next state, which already shows what the server kept, or when the player dismisses it. */
  readonly rejection: ErrorDto | undefined;
}

/** A message of the room, or the player dismissing the rejection. */
export type RoomAction = ServerMessageDto | { readonly type: 'rejection-dismissed' };

export const INITIAL_ROOM_STATE: RoomState = {
  lobby: undefined,
  game: undefined,
  expelled: false,
  rejection: undefined,
};

/**
 * Turns each message of the room into the state the screen draws.
 * It copies what the server sends and never works anything out on its own (ADR 0001).
 * A message older than the state it holds is dropped, so the screen never goes backwards.
 */
export function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case 'room-state':
      return applyRoomState(state, action);
    case 'game-state':
      return applyGameState(state, action);
    case 'progress-updated':
      return applyProgress(state, action);
    case 'connection-changed':
      return applyConnection(state, action);
    case 'expelled':
      return { ...state, expelled: true };
    case 'error':
      return { ...state, rejection: action };
    case 'rejection-dismissed':
      return { ...state, rejection: undefined };
  }
}

/** The version of the room the screen holds, from the lobby or from the game. */
function roomVersionOf({ lobby, game }: RoomState): number {
  return Math.max(lobby?.roomVersion ?? 0, game?.roomVersion ?? 0);
}

/** The whole lobby, unless it is older than the room the screen holds; it clears the rejection. */
function applyRoomState(state: RoomState, message: RoomStateDto): RoomState {
  if (message.roomVersion < roomVersionOf(state)) return state;

  return { ...state, lobby: message, game: undefined, rejection: undefined };
}

/** The whole game, unless it is older than the one the screen holds; it clears the rejection. */
function applyGameState(state: RoomState, message: GameStateDto): RoomState {
  const { game } = state;
  const isOlder =
    message.roomVersion < roomVersionOf(state) ||
    (game !== undefined && message.gameVersion < game.gameVersion);
  if (isOlder) return state;

  return { ...state, lobby: undefined, game: message, rejection: undefined };
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
  const { lobby, game } = state;
  if ((!lobby && !game) || message.roomVersion <= roomVersionOf(state)) return state;

  const withConnection = <T extends { readonly playerId: string; readonly connected: boolean }>(
    players: readonly T[],
  ): T[] =>
    players.map((player) =>
      player.playerId === message.playerId ? { ...player, connected: message.connected } : player,
    );
  return {
    ...state,
    lobby: lobby && {
      ...lobby,
      roomVersion: message.roomVersion,
      players: withConnection(lobby.players),
    },
    game: game && {
      ...game,
      roomVersion: message.roomVersion,
      players: withConnection(game.players),
    },
  };
}
