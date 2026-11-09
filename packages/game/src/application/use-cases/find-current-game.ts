import type { Game } from '../../domain/entities/game.ts';
import type { Room } from '../../domain/entities/room.ts';
import { GameNotInProgressError } from '../../domain/errors/game-not-in-progress.error.ts';
import { GameNotFoundError } from '../errors/game-not-found.error.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findRoom } from './find-room.ts';

/** The room and the game in progress in it. */
export async function findCurrentGame(
  roomRepository: RoomRepository,
  gameRepository: GameRepository,
  roomId: string,
): Promise<{ room: Room; game: Game }> {
  const room = await findRoom(roomRepository, roomId);
  const gameId = room.currentGameId;
  if (!gameId) throw new GameNotInProgressError(roomId);
  const game = await gameRepository.findById(gameId);
  if (!game) throw new GameNotFoundError(gameId);
  return { room, game };
}
