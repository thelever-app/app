import { describe, expect, it } from 'vitest';
import { Room } from '../../entities/room.ts';
import { RoomClosedError } from '../../errors/room-closed.error.ts';
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
    CREATED_AT,
  );
  return room;
}

/** Ana and Luis play a game, both connected. */
function roomInGame(): Room {
  const room = roomOfTwo();
  room.startGame('Ana', 'TestGameId');
  for (const playerId of PLAYERS) room.connect(playerId, `${playerId}Connection`, CREATED_AT);
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
      room.connect('Luis', 'LuisOtherConnection', minutesLater(20));
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

  describe('closing connections late', () => {
    it('should count from the latest connection that closed, also one that closed while another was still open', () => {
      // Arrange: Luis leaves at 40 while the connection of Ana, through an instance that died at 30, is still open.
      const room = roomInGame();
      room.disconnect('Luis', 'LuisConnection', minutesLater(40));
      room.disconnect('Ana', 'AnaConnection', minutesLater(30));

      // Act
      const open = room.isOpenAt(minutesLater(54));

      // Assert
      expect(open).toBe(true);
    });
  });

  describe('a closed room lets nobody in', () => {
    it('should not let anyone join once nobody has been connected for 15 minutes', () => {
      // Arrange
      const room = roomOfTwo();

      // Act & Assert
      expect(() =>
        room.join(
          {
            nickname: 'Pedro',
            identity: 'TestPedroIdentity',
            avatar: new AvatarVO('face-04', 'teal'),
          },
          new FixedIdGenerator('Pedro'),
          minutesLater(15),
        ),
      ).toThrow(RoomClosedError);
    });

    it('should not let a player of the room back in once everyone has left', () => {
      // Arrange
      const room = roomInGame();
      for (const playerId of PLAYERS) room.leave(playerId, PLAYERS, minutesLater(20));
      const luis = room.players[1]!;

      // Act & Assert
      expect(() =>
        room.join(
          { nickname: luis.nickname, identity: luis.identity, avatar: luis.avatar },
          new FixedIdGenerator('Luis'),
          minutesLater(20),
        ),
      ).toThrow(RoomClosedError);
    });

    it('should not let a player of the room connect once it is closed', () => {
      // Arrange
      const room = roomInGame();
      for (const playerId of PLAYERS) {
        room.disconnect(playerId, `${playerId}Connection`, minutesLater(20));
      }

      // Act & Assert
      expect(() => room.connect('Luis', 'LuisOtherConnection', minutesLater(35))).toThrow(
        RoomClosedError,
      );
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
