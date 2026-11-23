import { InMemoryUsage } from '../../../adapters/in-memory/in-memory-usage.ts';
import { describe, expect, it } from 'vitest';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import { LobbyChangedEvent } from '../../../domain/events/lobby-changed.event.ts';
import { PlayerLeftEvent } from '../../../domain/events/player-left.event.ts';
import { ambienceOf } from '../../../domain/vos/ambience.vo.ts';
import { SequentialIdGenerator } from '../../../adapters/in-memory/sequential-id-generator.ts';
import { KeepOrderRandomness } from '../../../domain/test/support/keep-order-randomness.ts';
import { ChangeRoomSettingsUseCase } from '../../use-cases/change-room-settings.use-case.ts';
import { GetRoomStateUseCase } from '../../use-cases/get-room-state.use-case.ts';
import { testCatalog } from '../support/test-catalog.ts';
import { LeaveRoomUseCase } from '../../use-cases/leave-room.use-case.ts';
import { lobbyOfThree } from '../support/game-in-decision-phase.ts';

async function arrange() {
  const notifier = new InMemoryPlayerNotifier();
  const lobby = await lobbyOfThree(notifier);
  const { roomRepository, gameRepository, clock, catalog } = lobby;
  return {
    ...lobby,
    notifier,
    getRoomState: new GetRoomStateUseCase(roomRepository, testCatalog()),
    changeSettings: new ChangeRoomSettingsUseCase(roomRepository, catalog, notifier),
    leaveRoom: new LeaveRoomUseCase(
      roomRepository,
      gameRepository,
      notifier,
      clock,
      new InMemoryUsage(),
    ),
  };
}

describe('GetRoomStateUseCase, with the ambiences', () => {
  it('should give only the host what each ambience would set in the room', async () => {
    // Arrange
    const { getRoomState, roomId, anaId, luisId } = await arrange();
    const random = (age: string, compromising: string) => ({
      origin: 'random',
      categories: null,
      content: { age, compromising },
    });

    // Act
    const forAna = await getRoomState.execute({ roomId, playerId: anaId, language: 'es' });
    const forLuis = await getRoomState.execute({ roomId, playerId: luisId, language: 'es' });

    // Assert
    expect(forAna.ambiences?.['no-filter']).toEqual({
      variant: 'anonymous',
      adultsOnly: true,
      compromisingDilemmas: true,
      rounds: [
        random('any', 'any'),
        random('any', 'yes'),
        random('adults-only', 'any'),
        random('adults-only', 'yes'),
        random('any', 'any'),
        random('any', 'yes'),
        random('adults-only', 'any'),
        random('adults-only', 'yes'),
      ],
    });
    expect(Object.keys(forAna.ambiences ?? {})).toEqual(['classic', 'spicy', 'no-filter']);
    expect(forLuis.ambiences).toBeNull();
  });

  it('should make the room of the ambience once the host saves what it sets, and tell everyone', async () => {
    // Arrange
    const { getRoomState, changeSettings, roomRepository, notifier, roomId, anaId, luisId } =
      await arrange();
    const { ambiences } = await getRoomState.execute({ roomId, playerId: anaId, language: 'es' });

    // Act
    await changeSettings.execute({ roomId, playerId: anaId, changes: ambiences!.spicy });

    // Assert
    const room = await roomRepository.findById(roomId);
    expect(ambienceOf(room!.settings)).toBe('spicy');
    expect(notifier.receivedBy(luisId).at(-1)).toEqual(
      new LobbyChangedEvent(roomId, 'settings-changed', room!.version),
    );
  });
});

describe('GetRoomStateUseCase, with a minor in the room', () => {
  it('should tell only the host that someone in the room is under 18', async () => {
    // Arrange: Pablo declared he is 17.
    const { getRoomState, roomRepository, roomId, anaId, luisId, clock } = await arrange();
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
