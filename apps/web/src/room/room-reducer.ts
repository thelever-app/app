import type { GameStateDto, ServerMessageDto } from '@thelever-app/protocol';

/**
 * Turns each message of the room into the state the screen draws.
 * It copies what the server sends and never works anything out on its own (ADR 0001).
 */
export function roomReducer(
  game: GameStateDto | undefined,
  message: ServerMessageDto,
): GameStateDto | undefined {
  switch (message.type) {
    case 'game-state':
      return message;
    case 'progress-updated':
      if (!game) return undefined;

      return {
        ...game,
        players: game.players.map((player) =>
          player.playerId === message.playerId ? { ...player, progress: message.progress } : player,
        ),
      };
  }
}
