import { describe, expect, it } from 'vitest';
import { InMemoryUsage } from '../../../adapters/in-memory/in-memory-usage.ts';
import { playersOf, recordEndIfJustEnded, recordUsage } from '../../use-cases/record-usage.ts';
import { lobbyOfThree } from '../support/game-in-decision-phase.ts';

describe('the facts of use of the game', () => {
  it('should record who created the room, who joined it and who plays the game that starts', async () => {
    // Arrange
    const lobby = await lobbyOfThree();

    // Act
    const { gameId } = await lobby.startGame.execute({
      roomId: lobby.roomId,
      playerId: lobby.anaId,
    });

    // Assert
    expect(lobby.usage.facts).toEqual([
      { kind: 'room-created', identity: 'TestAnaIdentity', roomId: lobby.roomId },
      { kind: 'room-joined', identity: 'TestLuisIdentity', roomId: lobby.roomId },
      { kind: 'room-joined', identity: 'TestMartaIdentity', roomId: lobby.roomId },
      {
        kind: 'game-started',
        identities: ['TestAnaIdentity', 'TestLuisIdentity', 'TestMartaIdentity'],
        players: 3,
        roomId: lobby.roomId,
        gameId,
      },
    ]);
  });

  it('should record a game that ends only once, when it reaches its end', async () => {
    // Arrange
    const lobby = await lobbyOfThree();
    const { gameId } = await lobby.startGame.execute({
      roomId: lobby.roomId,
      playerId: lobby.anaId,
    });
    const room = await lobby.roomRepository.findById(lobby.roomId);
    const game = await lobby.gameRepository.findById(gameId);
    if (!room || !game) throw new Error('the game did not start');
    const usage = new InMemoryUsage();

    // Act: the game is still in its rounds.
    await recordEndIfJustEnded(usage, room, game, 'rounds');

    // Assert
    expect(usage.facts).toEqual([]);
  });

  it('should count a forgotten player among the players, with no fact of theirs', async () => {
    // Arrange
    const lobby = await lobbyOfThree();
    const { gameId } = await lobby.startGame.execute({
      roomId: lobby.roomId,
      playerId: lobby.anaId,
    });
    const room = await lobby.roomRepository.findById(lobby.roomId);
    const game = await lobby.gameRepository.findById(gameId);
    if (!room || !game) throw new Error('the game did not start');

    // Act: Luis deleted their data while the game goes on.
    room.forget('TestLuisIdentity');

    // Assert
    expect(playersOf(room, game)).toEqual({
      identities: ['TestAnaIdentity', 'TestMartaIdentity'],
      players: 3,
    });
  });

  it('should never fail the command when the fact cannot be kept', async () => {
    // Act & Assert
    await expect(
      recordUsage(
        { record: async () => Promise.reject(new Error('analytics are down')) },
        { kind: 'room-created', identity: 'TestAnaIdentity', roomId: 'TestRoomId' },
      ),
    ).resolves.toBeUndefined();
  });
});
