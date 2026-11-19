import { describe, expect, it } from 'vitest';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import { NotHostError } from '../../../domain/errors/not-host.error.ts';
import { LobbyChangedEvent } from '../../../domain/events/lobby-changed.event.ts';
import { ambienceOf } from '../../../domain/vos/ambience.vo.ts';
import { ChooseAmbienceUseCase } from '../../use-cases/choose-ambience.use-case.ts';
import { LeaveRoomUseCase } from '../../use-cases/leave-room.use-case.ts';
import { lobbyOfThree } from '../support/game-in-decision-phase.ts';

async function arrange() {
  const notifier = new InMemoryPlayerNotifier();
  const lobby = await lobbyOfThree(notifier);
  const { roomRepository, gameRepository, clock } = lobby;
  return {
    ...lobby,
    notifier,
    chooseAmbience: new ChooseAmbienceUseCase(roomRepository, notifier),
    leaveRoom: new LeaveRoomUseCase(roomRepository, gameRepository, notifier, clock),
  };
}

describe('ChooseAmbienceUseCase', () => {
  it('should give the room the configuration of the ambience and tell everyone', async () => {
    // Arrange
    const { chooseAmbience, roomRepository, notifier, roomId, anaId, luisId } = await arrange();

    // Act
    await chooseAmbience.execute({ roomId, playerId: anaId, ambience: 'spicy' });

    // Assert
    const room = await roomRepository.findById(roomId);
    expect(ambienceOf(room!.settings)).toBe('spicy');
    expect(notifier.receivedBy(luisId).at(-1)).toEqual(
      new LobbyChangedEvent(roomId, 'settings-changed', room!.version),
    );
  });

  it('should not let anyone but the host choose it', async () => {
    // Arrange
    const { chooseAmbience, roomId, luisId } = await arrange();

    // Act & Assert
    await expect(
      chooseAmbience.execute({ roomId, playerId: luisId, ambience: 'spicy' }),
    ).rejects.toThrow(NotHostError);
  });
});

describe('LeaveRoomUseCase, in the lobby', () => {
  it('should take who leaves out of the room and tell the others', async () => {
    // Arrange
    const { leaveRoom, roomRepository, notifier, roomId, luisId, martaId } = await arrange();

    // Act
    await leaveRoom.execute({ roomId, playerId: luisId });

    // Assert
    const room = await roomRepository.findById(roomId);
    expect(room!.hasPlayer(luisId)).toBe(false);
    expect(notifier.receivedBy(martaId).at(-1)).toEqual(
      new LobbyChangedEvent(roomId, 'player-left', room!.version),
    );
  });
});
