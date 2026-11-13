import { describe, expect, it } from 'vitest';
import { Room } from '../../entities/room.ts';
import { GameNotInProgressError } from '../../errors/game-not-in-progress.error.ts';
import { HostChangedEvent } from '../../events/host-changed.event.ts';
import { PlayerLeftEvent } from '../../events/player-left.event.ts';
import { FixedRandomness } from '../support/fixed-randomness.ts';
import { AvatarVO } from '../../vos/avatar.vo.ts';
import { FixedIdGenerator } from '../support/fixed-id-generator.ts';

/** When everything in these tests happens, unless a test says otherwise. */
const NOW = new Date('2026-11-12T10:00:00Z');

/** Ana hosts, Luis joined before Marta, all three connected, and a game in progress they play. */
function roomInGame(): Room {
  const room = Room.create(
    {
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
  room.join(
    {
      nickname: 'Luis',
      identity: 'TestLuisIdentity',
      avatar: room.suggestAvatar(new FixedRandomness()),
    },
    new FixedIdGenerator('Luis'),
    NOW,
  );
  room.join(
    {
      nickname: 'Marta',
      identity: 'TestMartaIdentity',
      avatar: room.suggestAvatar(new FixedRandomness()),
    },
    new FixedIdGenerator('Marta'),
    NOW,
  );
  room.startGame('Ana', 'TestGameId');
  for (const playerId of ['Ana', 'Luis', 'Marta']) {
    room.connect(playerId, `${playerId}Connection`, NOW);
  }
  room.pullEvents();
  return room;
}

/** The players of the game in progress. */
const PLAYERS = ['Ana', 'Luis', 'Marta'];

/** Pedro joins once the game has started, so he waits in the room and does not play it. */
function pedroJoins(room: Room): void {
  room.join(
    {
      nickname: 'Pedro',
      identity: 'TestPedroIdentity',
      avatar: room.suggestAvatar(new FixedRandomness()),
    },
    new FixedIdGenerator('Pedro'),
    NOW,
  );
  room.connect('Pedro', 'PedroConnection', NOW);
  room.pullEvents();
}

describe('Room, host and leaving', () => {
  describe('leave', () => {
    it('should pass the role of a host who leaves to who has been in the room longest, for good', () => {
      // Arrange
      const room = roomInGame();

      // Act
      room.leave('Ana', PLAYERS, NOW);
      room.connect('Ana', 'AnaOtherConnection', NOW);

      // Assert
      expect(room.host.id).toBe('Luis');
      expect(room.hasLeft('Ana')).toBe(true);
    });

    it('should pass the role of a host who leaves even when nobody else is connected', () => {
      // Arrange
      const room = roomInGame();
      room.disconnect('Luis', 'LuisConnection', NOW);
      room.disconnect('Marta', 'MartaConnection', NOW);

      // Act
      room.leave('Ana', PLAYERS, NOW);

      // Assert
      expect(room.host.id).toBe('Luis');
    });

    it('should pass the role of a host who leaves only to a player of the game', () => {
      // Arrange
      const room = roomInGame();
      pedroJoins(room);
      room.leave('Luis', PLAYERS, NOW);
      room.leave('Marta', PLAYERS, NOW);

      // Act
      room.leave('Ana', PLAYERS, NOW);

      // Assert
      expect(room.host.id).toBe('Ana');
    });

    it('should close the connections of who leaves and tell the room', () => {
      // Arrange
      const room = roomInGame();

      // Act
      room.leave('Marta', PLAYERS, NOW);

      // Assert
      expect(room.isConnected('Marta')).toBe(false);
      expect(room.pullEvents().map(({ type }) => type)).toEqual([
        'ConnectionChanged',
        'PlayerLeft',
      ]);
    });

    it('should only be possible with a game in progress', () => {
      // Arrange
      const room = Room.create(
        {
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

      // Act & Assert
      expect(() => room.leave('Ana', PLAYERS, NOW)).toThrow(GameNotInProgressError);
    });
  });

  describe('join', () => {
    it('should bring back who left as a player, not as the host', () => {
      // Arrange
      const room = roomInGame();
      room.leave('Ana', PLAYERS, NOW);
      room.pullEvents();

      // Act
      const ana = room.join(
        {
          nickname: 'Ana',
          identity: 'TestAnaIdentity',
          avatar: room.suggestAvatar(new FixedRandomness()),
        },
        new FixedIdGenerator('Unused'),
        NOW,
      );

      // Assert
      expect(ana.id).toBe('Ana');
      expect(room.hasLeft('Ana')).toBe(false);
      expect(room.host.id).toBe('Luis');
      expect(room.pullEvents()).toEqual([
        new PlayerLeftEvent('TestRoomId', 'Ana', false, room.version),
      ]);
    });
  });

  describe('connectedPlayerIds', () => {
    it('should list who has a connection open, in the order they joined', () => {
      // Arrange
      const room = roomInGame();

      // Act
      room.disconnect('Luis', 'LuisConnection', NOW);

      // Assert
      expect(room.connectedPlayerIds).toEqual(['Ana', 'Marta']);
    });
  });

  describe('handOverHost', () => {
    it('should pass the role of a disconnected host to the connected player in the room longest', () => {
      // Arrange
      const room = roomInGame();
      room.disconnect('Ana', 'AnaConnection', NOW);
      room.disconnect('Luis', 'LuisConnection', NOW);
      room.pullEvents();

      // Act
      room.handOverHost(PLAYERS);

      // Assert
      expect(room.host.id).toBe('Marta');
      expect(room.pullEvents()).toEqual([
        new HostChangedEvent('TestRoomId', 'Marta', room.version),
      ]);
    });

    it('should pass the role of a disconnected host only to a player of the game', () => {
      // Arrange
      const room = roomInGame();
      pedroJoins(room);
      room.disconnect('Ana', 'AnaConnection', NOW);
      room.disconnect('Luis', 'LuisConnection', NOW);
      room.disconnect('Marta', 'MartaConnection', NOW);

      // Act
      room.handOverHost(PLAYERS);

      // Assert
      expect(room.host.id).toBe('Ana');
    });

    it('should not take the role from a connected host', () => {
      // Arrange
      const room = roomInGame();

      // Act
      room.handOverHost(PLAYERS);

      // Assert
      expect(room.host.id).toBe('Ana');
    });

    it('should give the role back to the host when they connect again', () => {
      // Arrange
      const room = roomInGame();
      room.disconnect('Ana', 'AnaConnection', NOW);
      room.handOverHost(PLAYERS);
      room.pullEvents();

      // Act
      room.connect('Ana', 'AnaOtherConnection', NOW);

      // Assert
      expect(room.host.id).toBe('Ana');
      expect(room.pullEvents().at(-1)).toEqual(
        new HostChangedEvent('TestRoomId', 'Ana', room.version),
      );
    });

    it('should keep everything through a snapshot', () => {
      // Arrange
      const room = roomInGame();
      room.disconnect('Ana', 'AnaConnection', NOW);
      room.handOverHost(PLAYERS);
      room.leave('Marta', PLAYERS, NOW);

      // Act
      const restored = Room.restore(room.toSnapshot());
      restored.connect('Ana', 'AnaOtherConnection', NOW);

      // Assert
      expect(restored.hasLeft('Marta')).toBe(true);
      expect(restored.host.id).toBe('Ana');
    });
  });
});
