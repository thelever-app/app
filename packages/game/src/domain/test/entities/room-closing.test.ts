import { describe, expect, it } from 'vitest';
import { Room } from '../../entities/room.ts';
import { AvatarVO } from '../../vos/avatar.vo.ts';
import { FixedIdGenerator } from '../support/fixed-id-generator.ts';
import { FixedRandomness } from '../support/fixed-randomness.ts';

const CREATED_AT = new Date('2026-11-12T10:00:00Z');
const PLAYERS = ['Ana', 'Luis'];

/** That many minutes after the room was created. */
function minutesLater(minutes: number): Date {
  return new Date(CREATED_AT.getTime() + minutes * 60_000);
}

/** Ana hosts and Luis joined, nobody connected yet. */
function roomOfTwo(): Room {
  const room = Room.create(
    {
      hostNickname: 'Ana',
      hostIdentity: 'TestAnaIdentity',
      hostAvatar: new AvatarVO('face-01', 'khaki'),
      groupNature: 'friends',
      place: 'together',
      dilemmaLanguage: 'es',
      code: 'K7M2Q',
      createdAt: CREATED_AT,
    },
    new FixedIdGenerator('TestRoomId', 'Ana'),
  );
  room.join(
    {
      nickname: 'Luis',
      identity: 'TestLuisIdentity',
      avatar: room.suggestAvatar(new FixedRandomness()),
    },
    new FixedIdGenerator('Luis'),
  );
  return room;
}

/** Ana and Luis play a game, both connected. */
function roomInGame(): Room {
  const room = roomOfTwo();
  room.startGame('Ana', 'TestGameId');
  for (const playerId of PLAYERS) room.connect(playerId, `${playerId}Connection`);
  return room;
}

describe('Room, closing', () => {
  describe('isOpenAt', () => {
    it('should be open just after it is created, before anyone connects', () => {
      // Arrange
      const room = roomOfTwo();

      // Act
      const open = room.isOpenAt(minutesLater(14));

      // Assert
      expect(open).toBe(true);
    });

    it('should close 15 minutes after it is created if nobody ever connects', () => {
      // Arrange
      const room = roomOfTwo();

      // Act
      const open = room.isOpenAt(minutesLater(15));

      // Assert
      expect(open).toBe(false);
    });

    it('should stay open while a player is connected, even if nobody does anything', () => {
      // Arrange
      const room = roomInGame();

      // Act
      const open = room.isOpenAt(minutesLater(60));

      // Assert
      expect(open).toBe(true);
    });

    it('should close 15 minutes after the last connection closes', () => {
      // Arrange
      const room = roomInGame();
      room.disconnect('Ana', 'AnaConnection', minutesLater(30));
      room.disconnect('Luis', 'LuisConnection', minutesLater(40));

      // Act
      const stillOpen = room.isOpenAt(minutesLater(54));
      const open = room.isOpenAt(minutesLater(55));

      // Assert
      expect(stillOpen).toBe(true);
      expect(open).toBe(false);
    });

    it('should count from the last connection that closed, not from the first one', () => {
      // Arrange
      const room = roomInGame();
      room.disconnect('Ana', 'AnaConnection', minutesLater(30));

      // Act
      const open = room.isOpenAt(minutesLater(50));

      // Assert
      expect(open).toBe(true);
    });

    it('should count again from when a player who came back disconnects', () => {
      // Arrange
      const room = roomInGame();
      for (const playerId of PLAYERS) {
        room.disconnect(playerId, `${playerId}Connection`, minutesLater(20));
      }
      room.connect('Luis', 'LuisOtherConnection');
      room.disconnect('Luis', 'LuisOtherConnection', minutesLater(30));

      // Act
      const open = room.isOpenAt(minutesLater(44));

      // Assert
      expect(open).toBe(true);
    });

    it('should close as soon as every player has left the game', () => {
      // Arrange
      const room = roomInGame();
      room.leave('Ana', PLAYERS, minutesLater(20));
      room.leave('Luis', PLAYERS, minutesLater(21));

      // Act
      const open = room.isOpenAt(minutesLater(21));

      // Assert
      expect(open).toBe(false);
    });

    it('should stay open while a player who has not left is connected', () => {
      // Arrange
      const room = roomInGame();
      room.leave('Ana', PLAYERS, minutesLater(20));

      // Act
      const open = room.isOpenAt(minutesLater(60));

      // Assert
      expect(open).toBe(true);
    });

    it('should count from when the last connected player leaves, if someone has not left', () => {
      // Arrange
      const room = roomInGame();
      room.disconnect('Ana', 'AnaConnection', minutesLater(20));
      room.leave('Luis', PLAYERS, minutesLater(30));

      // Act
      const stillOpen = room.isOpenAt(minutesLater(44));
      const open = room.isOpenAt(minutesLater(45));

      // Assert
      expect(stillOpen).toBe(true);
      expect(open).toBe(false);
    });
  });

  describe('restore', () => {
    it('should keep when the last connection closed and when everyone left', () => {
      // Arrange
      const room = roomInGame();
      room.disconnect('Ana', 'AnaConnection', minutesLater(20));
      room.leave('Luis', PLAYERS, minutesLater(30));
      room.leave('Ana', PLAYERS, minutesLater(31));

      // Act
      const restored = Room.restore(room.toSnapshot());

      // Assert
      expect(restored.toSnapshot()).toEqual(room.toSnapshot());
      expect(restored.toSnapshot()).toMatchObject({
        lastConnectedAt: minutesLater(30),
        closedAt: minutesLater(31),
      });
    });
  });
});
