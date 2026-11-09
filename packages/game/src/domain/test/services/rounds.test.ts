import { describe, expect, it } from 'vitest';
import { Game } from '../../entities/game.ts';
import { Room } from '../../entities/room.ts';
import { handOverHostIfAway } from '../../services/host-handover.ts';
import { revealIfEveryoneAnswered } from '../../services/reveal-if-everyone-answered.ts';
import { AvatarVO } from '../../vos/avatar.vo.ts';
import { FixedIdGenerator } from '../support/fixed-id-generator.ts';
import { KeepOrderRandomness } from '../support/keep-order-randomness.ts';
import { SequentialRandomness } from '../../../adapters/in-memory/sequential-randomness.ts';

const AT = new Date('2026-11-09T10:00:00Z');
const SEAL = {
  gameConsentVersion: 'TestGameConsentVersion',
  researchConsentVersion: null,
  commercialLicenceConsentVersion: null,
  underEighteen: false,
};

/** Ana hosts Luis and Marta, all connected, in the first round of an anonymous game of two dilemmas. */
function roomAndGame(): { room: Room; game: Game } {
  const randomness = new SequentialRandomness();
  const room = Room.create(
    {
      hostNickname: 'Ana',
      hostIdentity: 'TestAnaIdentity',
      hostAvatar: new AvatarVO('face-01', 'khaki'),
      groupNature: 'friends',
      place: 'together',
      dilemmaLanguage: 'es',
      code: 'K7M2Q',
    },
    new FixedIdGenerator('TestRoomId', 'Ana'),
  );
  for (const nickname of ['Luis', 'Marta']) {
    room.join(
      { nickname, identity: `Test${nickname}Identity`, avatar: room.suggestAvatar(randomness) },
      new FixedIdGenerator(nickname),
    );
  }
  room.startGame('Ana', 'TestGameId');
  for (const playerId of ['Ana', 'Luis', 'Marta']) room.connect(playerId, `${playerId}Connection`);
  const game = Game.create(
    {
      roomId: 'TestRoomId',
      dilemmas: ['TestDilemma1', 'TestDilemma2'].map((dilemmaId) => ({
        dilemmaId,
        version: 1,
        optionIds: ['TestPull', 'TestWait'],
        hasGap: false,
        origin: 'picked-by-the-system' as const,
        addedBy: null,
      })),
      settings: {
        variant: 'anonymous',
        groupNature: 'friends',
        place: 'together',
        dilemmaLanguage: 'es',
        timePerDilemmaSeconds: 60,
      },
    },
    new FixedIdGenerator('TestGameId'),
  );
  game.start(room.players, AT, new KeepOrderRandomness());
  room.pullEvents();
  game.pullEvents();
  return { room, game };
}

function vote(game: Game, playerId: string): void {
  game.answer(playerId, 'TestDilemma1', { vote: 'TestPull' }, SEAL, AT);
}

describe('revealIfEveryoneAnswered', () => {
  it('should reveal the dilemma once everyone connected has answered, not waiting for who left', () => {
    // Arrange
    const { room, game } = roomAndGame();
    vote(game, 'Ana');
    room.disconnect('Luis', 'LuisConnection');

    // Act & Assert
    revealIfEveryoneAnswered(room, game);
    expect(game.isInDecisionPhase).toBe(true);
    vote(game, 'Marta');
    revealIfEveryoneAnswered(room, game);
    expect(game.round?.revealedBy).toBe('everyone');
  });
});

describe('handOverHostIfAway', () => {
  it('should pass the role of a disconnected host once the dilemma is revealed', () => {
    // Arrange
    const { room, game } = roomAndGame();
    room.disconnect('Ana', 'AnaConnection');

    // Act & Assert
    handOverHostIfAway(room, game);
    expect(room.host.id).toBe('Ana');
    game.reveal('time');
    handOverHostIfAway(room, game);
    expect(room.host.id).toBe('Luis');
  });

  it('should leave the role with a connected host', () => {
    // Arrange
    const { room, game } = roomAndGame();
    game.reveal('host');

    // Act
    handOverHostIfAway(room, game);

    // Assert
    expect(room.host.id).toBe('Ana');
  });
});
