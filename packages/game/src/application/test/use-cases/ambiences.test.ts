import { describe, expect, it } from 'vitest';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import { NotHostError } from '../../../domain/errors/not-host.error.ts';
import { LobbyChangedEvent } from '../../../domain/events/lobby-changed.event.ts';
import { PlayerLeftEvent } from '../../../domain/events/player-left.event.ts';
import { ambienceOf } from '../../../domain/vos/ambience.vo.ts';
import { SequentialIdGenerator } from '../../../adapters/in-memory/sequential-id-generator.ts';
import { KeepOrderRandomness } from '../../../domain/test/support/keep-order-randomness.ts';
import { ChooseAmbienceUseCase } from '../../use-cases/choose-ambience.use-case.ts';
import { GetRoomStateUseCase } from '../../use-cases/get-room-state.use-case.ts';
import { testCatalog } from '../support/test-catalog.ts';
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

describe('GetRoomStateUseCase, with a minor in the room', () => {
  it('should tell only the host that someone in the room is under 18', async () => {
    // Arrange: Pablo declared he is 17.
    const { roomRepository, roomId, anaId, luisId, clock } = await arrange();
    const room = await roomRepository.findById(roomId);
    room!.join(
      {
        underEighteen: true,
        nickname: 'Pablo',
        identity: 'TestPabloIdentity',
        avatar: room!.suggestAvatar(new KeepOrderRandomness()),
      },
      new SequentialIdGenerator(),
      clock.now(),
    );
    await roomRepository.save(room!);
    const getRoomState = new GetRoomStateUseCase(roomRepository, testCatalog());

    // Act
    const forAna = await getRoomState.execute({ roomId, playerId: anaId, language: 'es' });
    const forLuis = await getRoomState.execute({ roomId, playerId: luisId, language: 'es' });

    // Assert
    expect(forAna.hasPlayerUnderEighteen).toBe(true);
    expect(forLuis.hasPlayerUnderEighteen).toBe(false);
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
      new PlayerLeftEvent(roomId, luisId, true, room!.version),
    );
  });
});
