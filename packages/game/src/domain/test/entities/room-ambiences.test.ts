import { describe, expect, it } from 'vitest';
import { Room, type RoomSettingsChanges } from '../../entities/room.ts';
import { InvalidRoomSettingError } from '../../errors/invalid-room-setting.error.ts';
import { MinorInRoomError } from '../../errors/minor-in-room.error.ts';
import { LobbyChangedEvent } from '../../events/lobby-changed.event.ts';
import { type Ambience, ambienceOf, configurationOf } from '../../vos/ambience.vo.ts';
import { AvatarVO } from '../../vos/avatar.vo.ts';
import { FixedIdGenerator } from '../support/fixed-id-generator.ts';

const NOW = new Date('2026-11-19T10:00:00Z');

const FOR_EVERYONE = {
  dilemmaId: 'TestDilemma',
  type: 'standard',
  scale: 'everyday',
  minimumAge: 16,
  hasGap: false,
  compromising: false,
} as const;

function roomOfAna({
  ambience = 'classic',
  underEighteen = false,
  firstRoundDilemma,
}: {
  readonly ambience?: string;
  readonly underEighteen?: boolean;
  readonly firstRoundDilemma?: typeof FOR_EVERYONE;
} = {}): Room {
  return Room.create(
    {
      ambience,
      hostUnderEighteen: underEighteen,
      hostNickname: 'Ana',
      hostIdentity: 'TestAnaIdentity',
      hostAvatar: new AvatarVO('face-01', 'khaki'),
      dilemmaLanguage: 'es',
      code: 'K7M2Q',
      createdAt: NOW,
      ...(firstRoundDilemma && { firstRoundDilemma }),
    },
    new FixedIdGenerator('TestId', 'TestHostId'),
  );
}

function joinLuis(room: Room, underEighteen: boolean): void {
  room.join(
    {
      underEighteen,
      nickname: 'Luis',
      identity: 'TestLuisIdentity',
      avatar: new AvatarVO('face-02', 'rust'),
    },
    new FixedIdGenerator('TestLuisId'),
    NOW,
  );
}

describe('Room, leaving the lobby', () => {
  it('should close the room when the last one leaves it', () => {
    // Arrange
    const room = roomOfAna();

    // Act
    room.leave('TestHostId', [], NOW);

    // Assert
    expect(room.isOpenAt(NOW)).toBe(false);
    expect(room.pullEvents().at(-1)).toMatchObject({
      type: 'PlayerLeft',
      playerId: 'TestHostId',
      left: true,
    });
  });

  it('should leave the dilemma a player chose without who chose it', () => {
    // Arrange
    const room = roomOfAna();
    joinLuis(room, false);
    room.changeSettings('TestHostId', { rounds: [{ id: 1, origin: 'players' }] });
    room.chooseRoundDilemma('TestLuisId', 1, FOR_EVERYONE);

    // Act
    room.leave('TestLuisId', [], NOW);

    // Assert
    expect(room.hasPlayer('TestLuisId')).toBe(false);
    expect(room.chosenDilemmas).toEqual([
      expect.objectContaining({ dilemmaId: 'TestDilemma', roundId: 1, playerId: null }),
    ]);
  });
});

describe('Room with ambiences', () => {
  describe('create', () => {
    it.each(['classic', 'spicy', 'no-filter'] as const)(
      'should start with the configuration of %s',
      (ambience) => {
        // Act
        const room = roomOfAna({ ambience });

        // Assert
        expect(ambienceOf(room.settings)).toBe(ambience);
        expect(room.settings.dilemmaLanguage).toBe('es');
        expect(room.settings.timePerDilemmaSeconds).toBe(60);
        expect(room.settings.newDilemmas).toBe(true);
      },
    );

    it('should throw an error for an ambience that does not exist', () => {
      // Act & Assert
      expect(() => roomOfAna({ ambience: 'TestNoAmbience' })).toThrow(InvalidRoomSettingError);
    });

    it.each(['spicy', 'no-filter'])(
      'should not let a host under 18 create a room %s',
      (ambience) => {
        // Act & Assert
        expect(() => roomOfAna({ ambience, underEighteen: true })).toThrow(MinorInRoomError);
      },
    );

    it('should let a host under 18 create a classic room', () => {
      // Act & Assert
      expect(roomOfAna({ underEighteen: true }).settings.adultsOnly).toBe(false);
    });

    it('should keep the ambience with the dilemma of the public web in round 1', () => {
      // Act
      const room = roomOfAna({ ambience: 'spicy', firstRoundDilemma: FOR_EVERYONE });

      // Assert
      expect(room.settings.rounds[0]).toEqual({ id: 1, origin: 'specific', dilemma: FOR_EVERYONE });
      expect(ambienceOf(room.settings)).toBe('spicy');
    });
  });

  describe('changeSettings to what an ambience sets', () => {
    /** The changes that give the room what the ambience sets, as the settings save them. */
    const changesOf = (ambience: Ambience): RoomSettingsChanges => {
      const { contents, ...configuration } = configurationOf(ambience);
      return {
        ...configuration,
        rounds: contents.map((content) => ({ origin: 'random', categories: null, content })),
      };
    };

    it('should make the room of the ambience, keeping the language, the time and new dilemmas', () => {
      // Arrange
      const room = roomOfAna();
      room.changeSettings(
        'TestHostId',
        {
          timePerDilemmaSeconds: 45,
          rounds: [
            {
              id: 1,
              origin: 'random',
              categories: null,
              content: { age: 'any', compromising: 'any' },
            },
            { id: 2, origin: 'specific', dilemmaId: 'TestDilemma' },
          ],
        },
        [FOR_EVERYONE],
      );
      room.pullEvents();

      // Act
      room.changeSettings('TestHostId', changesOf('no-filter'));

      // Assert
      expect(ambienceOf(room.settings)).toBe('no-filter');
      expect(room.settings.rounds[1]).toMatchObject({ origin: 'random' });
      expect(room.settings.dilemmaLanguage).toBe('es');
      expect(room.settings.timePerDilemmaSeconds).toBe(45);
      expect(room.pullEvents()).toEqual([new LobbyChangedEvent('TestId', 'settings-changed', 2)]);
    });

    it('should not take an ambience for adults with someone under 18 in the room', () => {
      // Arrange
      const room = roomOfAna();
      joinLuis(room, true);

      // Act & Assert
      expect(() => room.changeSettings('TestHostId', changesOf('spicy'))).toThrow(MinorInRoomError);
      expect(() => room.changeSettings('TestHostId', changesOf('classic'))).not.toThrow();
    });
  });

  describe('changeSettings', () => {
    it('should not turn on adults only with someone under 18 in the room, until they leave', () => {
      // Arrange
      const room = roomOfAna();
      joinLuis(room, true);

      // Act & Assert
      expect(room.hasPlayerUnderEighteen).toBe(true);
      expect(() => room.changeSettings('TestHostId', { adultsOnly: true })).toThrow(
        MinorInRoomError,
      );
      room.leave('TestLuisId', [], NOW);
      expect(room.hasPlayerUnderEighteen).toBe(false);
      room.changeSettings('TestHostId', { adultsOnly: true });
      expect(room.settings.adultsOnly).toBe(true);
    });

    it('should turn off compromising dilemmas when the room is made nominal, and keep them off', () => {
      // Arrange
      const room = roomOfAna();
      room.changeSettings('TestHostId', { variant: 'anonymous', compromisingDilemmas: true });

      // Act
      room.changeSettings('TestHostId', { variant: 'nominal' });
      room.changeSettings('TestHostId', { variant: 'anonymous' });

      // Assert
      expect(room.settings.compromisingDilemmas).toBe(false);
    });

    it.each([
      {
        content: { age: 'adults-only', compromising: 'any' },
        change: { adultsOnly: false },
        left: { age: 'any', compromising: 'any' },
      },
      {
        content: { age: 'any', compromising: 'yes' },
        change: { compromisingDilemmas: false },
        left: { age: 'any', compromising: 'any' },
      },
      {
        content: { age: 'any', compromising: 'yes' },
        change: { variant: 'nominal' },
        left: { age: 'any', compromising: 'any' },
      },
      {
        content: { age: 'adults-only', compromising: 'yes' },
        change: { compromisingDilemmas: false },
        left: { age: 'adults-only', compromising: 'any' },
      },
      {
        content: { age: 'from-16', compromising: 'no' },
        change: { adultsOnly: false },
        left: { age: 'any', compromising: 'no' },
      },
    ] as const)(
      'should take $content back to any where $change rules it out',
      ({ content, change, left }) => {
        // Arrange
        const room = roomOfAna({ ambience: 'no-filter' });
        room.changeSettings('TestHostId', {
          rounds: [
            {
              id: 1,
              origin: 'random',
              categories: null,
              content: { age: 'any', compromising: 'any' },
            },
            { id: 2, origin: 'random', categories: ['honesty'], content },
          ],
        });

        // Act
        room.changeSettings('TestHostId', change);

        // Assert
        expect(room.settings.rounds[1]).toEqual({
          id: 2,
          origin: 'random',
          categories: ['honesty'],
          content: left,
        });
      },
    );
  });
});
