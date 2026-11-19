import { describe, expect, it } from 'vitest';
import { Room } from '../../entities/room.ts';
import { DilemmaAlreadyPlayedError } from '../../errors/dilemma-already-played.error.ts';
import { GameNotInProgressError } from '../../errors/game-not-in-progress.error.ts';
import { NotHostError } from '../../errors/not-host.error.ts';
import { LobbyChangedEvent } from '../../events/lobby-changed.event.ts';
import { AvatarVO } from '../../vos/avatar.vo.ts';
import type { LobbyDilemma } from '../../vos/round.vo.ts';
import { FixedIdGenerator } from '../support/fixed-id-generator.ts';
import { FixedRandomness } from '../support/fixed-randomness.ts';

const NOW = new Date('2026-11-18T10:00:00Z');
const PLAYED = ['TestDilemma1', 'TestDilemma2'];

function lobbyDilemma(dilemmaId: string): LobbyDilemma {
  return {
    dilemmaId,
    minimumAge: 16,
    compromising: false,
    hasGap: false,
    type: 'standard',
    scale: 'everyday',
  };
}

function join(room: Room, nickname: string): void {
  room.join(
    {
      underEighteen: false,
      nickname,
      identity: `Test${nickname}Identity`,
      avatar: room.suggestAvatar(new FixedRandomness()),
    },
    new FixedIdGenerator(nickname),
    NOW,
  );
}

/** Ana hosts Luis and Marta, who played a game that has just ended. */
function roomAfterAGame(): Room {
  const room = Room.create(
    {
      hostUnderEighteen: false,
      ambience: 'classic',
      hostNickname: 'Ana',
      hostIdentity: 'TestAnaIdentity',
      hostAvatar: new AvatarVO('face-01', 'khaki'),
      groupNature: 'friends',
      place: 'together',
      dilemmaLanguage: 'es',
      code: 'K7M2Q',
      createdAt: NOW,
    },
    new FixedIdGenerator('TestRoomId', 'Ana'),
  );
  join(room, 'Luis');
  join(room, 'Marta');
  room.startGame('Ana', 'TestGameId');
  room.pullEvents();
  return room;
}

describe('Room, rematch', () => {
  it('should take the room back to the lobby, keeping its settings and who is still in it', () => {
    // Arrange
    const room = roomAfterAGame();
    const settings = room.settings.toSnapshot();

    // Act
    room.startRematch('Ana', PLAYED);

    // Assert
    expect(room.isInLobby).toBe(true);
    expect(room.currentGameId).toBeNull();
    expect(room.settings.toSnapshot()).toEqual(settings);
    expect(room.players.map(({ id }) => id)).toEqual(['Ana', 'Luis', 'Marta']);
    expect(room.pullEvents()).toEqual([
      new LobbyChangedEvent('TestRoomId', 'rematch-started', room.version),
    ]);
  });

  it('should leave out of the rematch who left the room', () => {
    // Arrange
    const room = roomAfterAGame();
    room.leave('Marta', ['Ana', 'Luis', 'Marta'], NOW);

    // Act
    room.startRematch('Ana', PLAYED);

    // Assert
    expect(room.players.map(({ id }) => id)).toEqual(['Ana', 'Luis']);
  });

  it('should let in who was expelled from the lobby of the game before', () => {
    // Arrange
    const room = Room.restore({
      ...roomAfterAGame().toSnapshot(),
      expelledIdentities: ['TestPedroIdentity'],
    });

    // Act
    room.startRematch('Ana', PLAYED);
    join(room, 'Pedro');

    // Assert
    expect(room.hasPlayer('Pedro')).toBe(true);
  });

  it('should remember every dilemma played in the room and let no round choose one again', () => {
    // Arrange
    const room = roomAfterAGame();
    room.startRematch('Ana', PLAYED);
    room.changeSettings('Ana', {
      rounds: [{ origin: 'players' }, { origin: 'random', categories: null, content: 'any' }],
    });
    const [playersRound] = room.settings.rounds;

    // Act
    const choose = () =>
      room.chooseRoundDilemma('Luis', playersRound!.id, lobbyDilemma('TestDilemma1'));
    const setSpecific = () =>
      room.changeSettings('Ana', { rounds: [{ origin: 'specific', dilemmaId: 'TestDilemma2' }] }, [
        lobbyDilemma('TestDilemma2'),
      ]);

    // Assert
    expect(room.playedDilemmaIds).toEqual(PLAYED);
    expect(choose).toThrow(DilemmaAlreadyPlayedError);
    expect(setSpecific).toThrow(DilemmaAlreadyPlayedError);
  });

  it('should only be started by the host, after a game', () => {
    // Arrange
    const room = roomAfterAGame();

    // Act & Assert
    expect(() => room.startRematch('Luis', PLAYED)).toThrow(NotHostError);
    room.startRematch('Ana', PLAYED);
    expect(() => room.startRematch('Ana', PLAYED)).toThrow(GameNotInProgressError);
  });

  it('should keep what was played when restored', () => {
    // Arrange
    const room = roomAfterAGame();
    room.startRematch('Ana', PLAYED);

    // Act
    const restored = Room.restore(room.toSnapshot());

    // Assert
    expect(restored.playedDilemmaIds).toEqual(PLAYED);
  });
});
