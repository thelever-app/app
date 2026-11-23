import { describe, expect, it } from 'vitest';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import { SEAL_BEFORE_FIRST_ACCESS } from '../../../adapters/in-memory/in-memory-seal-provider.ts';
import { EraseGameDataUseCase } from '../../use-cases/erase-game-data.use-case.ts';
import { gameInDecisionPhase, lobbyOfThree } from '../support/game-in-decision-phase.ts';

const SEAL = { ...SEAL_BEFORE_FIRST_ACCESS, underEighteen: false };

describe('EraseGameDataUseCase', () => {
  it('should take the player out of a lobby, with nothing kept of them', async () => {
    // Arrange
    const lobby = await lobbyOfThree();
    const erase = new EraseGameDataUseCase(
      lobby.roomRepository,
      lobby.gameRepository,
      lobby.notifier,
      lobby.clock,
    );

    // Act
    await erase.execute('TestMartaIdentity');

    // Assert
    const room = await lobby.roomRepository.findById(lobby.roomId);
    expect(room?.players.map(({ nickname }) => nickname)).toEqual(['Ana', 'Luis']);
    expect(await lobby.roomRepository.findIdsWith('TestMartaIdentity')).toEqual([]);
  });

  it('should keep nothing of the player in the game, and leave them as the generic nickname tied to nobody', async () => {
    // Arrange
    const notifier = new InMemoryPlayerNotifier();
    const playing = await gameInDecisionPhase(notifier, 'nominal');
    const { roomRepository, gameRepository, gameId, dilemmaIds, anaId, luisId, martaId, clock } =
      playing;
    const game = await gameRepository.findById(gameId);
    const [dilemmaId] = dilemmaIds;
    if (!game || !dilemmaId) throw new Error('the game did not start');
    const [vote] = game.dilemmas[0]?.optionIds ?? [];
    game.answer(
      anaId,
      dilemmaId,
      {
        vote: vote ?? null,
        votePredictions: game
          .playersToPredictBy(anaId, dilemmaId)
          .map((playerId) => ({ playerId, vote: vote ?? '' })),
      },
      SEAL,
      clock.now(),
    );
    game.answer(martaId, dilemmaId, { vote: vote ?? null, votePredictions: [] }, SEAL, clock.now());
    await gameRepository.save(game);
    const erase = new EraseGameDataUseCase(roomRepository, gameRepository, notifier, clock);

    // Act
    await erase.execute('TestMartaIdentity');

    // Assert
    const after = await gameRepository.findById(gameId);
    expect(after?.answersOf(martaId)).toEqual([]);
    expect(after?.answersOf(anaId)[0]?.votePredictions.map(({ playerId }) => playerId)).toEqual([
      luisId,
    ]);
    expect(after?.hasLeft(martaId)).toBe(true);
    const room = await roomRepository.findById(playing.roomId);
    const marta = room?.players.find(({ id }) => id === martaId);
    expect(marta?.nickname).toBe('Jugador 3');
    expect(marta?.identity).not.toBe('TestMartaIdentity');
    expect(await roomRepository.findIdsWith('TestMartaIdentity')).toEqual([]);
  });

  it('should do nothing for an identity in no room', async () => {
    // Arrange
    const lobby = await lobbyOfThree();
    const erase = new EraseGameDataUseCase(
      lobby.roomRepository,
      lobby.gameRepository,
      lobby.notifier,
      lobby.clock,
    );

    // Act & Assert
    await expect(erase.execute('TestEvaIdentity')).resolves.toBeUndefined();
  });
});
