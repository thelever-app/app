import { describe, expect, it } from 'vitest';
import { Room } from '../../entities/room.ts';
import { GameNotInProgressError } from '../../errors/game-not-in-progress.error.ts';
import { HostChangedEvent } from '../../events/host-changed.event.ts';
import { PlayerLeftEvent } from '../../events/player-left.event.ts';
import { FixedIdGenerator } from '../support/fixed-id-generator.ts';
import { SequentialRandomness } from '../../../adapters/in-memory/sequential-randomness.ts';

/** Ana hosts, Luis joined before Marta, all three connected, and a game in progress. */
function roomInGame(): Room {
  const randomness = new SequentialRandomness();
  const room = Room.create(
    {
      hostNickname: 'Ana',
      hostIdentity: 'TestAnaIdentity',
      groupNature: 'friends',
      place: 'together',
      dilemmaLanguage: 'es',
      code: 'K7M2Q',
    },
    new FixedIdGenerator('TestRoomId', 'Ana'),
    randomness,
  );
  room.join(
    { nickname: 'Luis', identity: 'TestLuisIdentity' },
    new FixedIdGenerator('Luis'),
    randomness,
  );
  room.join(
    { nickname: 'Marta', identity: 'TestMartaIdentity' },
    new FixedIdGenerator('Marta'),
    randomness,
  );
  room.startGame('Ana', 'TestGameId');
  for (const playerId of ['Ana', 'Luis', 'Marta']) room.connect(playerId, `${playerId}Connection`);
  room.pullEvents();
  return room;
}

describe('Room, host and leaving', () => {
  describe('leave', () => {
    it('should pass the role of a host who leaves to who has been in the room longest, for good', () => {
      // Arrange
      const room = roomInGame();

      // Act
      room.leave('Ana');
      room.connect('Ana', 'AnaOtherConnection');

      // Assert
      expect(room.host.id).toBe('Luis');
      expect(room.hasLeft('Ana')).toBe(true);
    });

    it('should pass the role of a host who leaves even when nobody else is connected', () => {
      // Arrange
      const room = roomInGame();
      room.disconnect('Luis', 'LuisConnection');
      room.disconnect('Marta', 'MartaConnection');

      // Act
      room.leave('Ana');

      // Assert
      expect(room.host.id).toBe('Luis');
    });

    it('should close the connections of who leaves and tell the room', () => {
      // Arrange
      const room = roomInGame();

      // Act
      room.leave('Marta');

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
          groupNature: 'friends',
          place: 'together',
          dilemmaLanguage: 'es',
          code: 'K7M2Q',
        },
        new FixedIdGenerator('TestRoomId', 'Ana'),
        new SequentialRandomness(),
      );

      // Act & Assert
      expect(() => room.leave('Ana')).toThrow(GameNotInProgressError);
    });
  });

  describe('join', () => {
    it('should bring back who left as a player, not as the host', () => {
      // Arrange
      const room = roomInGame();
      room.leave('Ana');
      room.pullEvents();

      // Act
      const ana = room.join(
        { nickname: 'Ana', identity: 'TestAnaIdentity' },
        new FixedIdGenerator('Unused'),
        new SequentialRandomness(),
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
      room.disconnect('Luis', 'LuisConnection');

      // Assert
      expect(room.connectedPlayerIds).toEqual(['Ana', 'Marta']);
    });
  });

  describe('handOverHost', () => {
    it('should pass the role of a disconnected host to the connected player in the room longest', () => {
      // Arrange
      const room = roomInGame();
      room.disconnect('Ana', 'AnaConnection');
      room.disconnect('Luis', 'LuisConnection');
      room.pullEvents();

      // Act
      room.handOverHost();

      // Assert
      expect(room.host.id).toBe('Marta');
      expect(room.pullEvents()).toEqual([
        new HostChangedEvent('TestRoomId', 'Marta', room.version),
      ]);
    });

    it('should not take the role from a connected host', () => {
      // Arrange
      const room = roomInGame();

      // Act
      room.handOverHost();

      // Assert
      expect(room.host.id).toBe('Ana');
    });

    it('should give the role back to the host when they connect again', () => {
      // Arrange
      const room = roomInGame();
      room.disconnect('Ana', 'AnaConnection');
      room.handOverHost();
      room.pullEvents();

      // Act
      room.connect('Ana', 'AnaOtherConnection');

      // Assert
      expect(room.host.id).toBe('Ana');
      expect(room.pullEvents().at(-1)).toEqual(
        new HostChangedEvent('TestRoomId', 'Ana', room.version),
      );
    });

    it('should keep everything through a snapshot', () => {
      // Arrange
      const room = roomInGame();
      room.disconnect('Ana', 'AnaConnection');
      room.handOverHost();
      room.leave('Marta');

      // Act
      const restored = Room.restore(room.toSnapshot());
      restored.connect('Ana', 'AnaOtherConnection');

      // Assert
      expect(restored.hasLeft('Marta')).toBe(true);
      expect(restored.host.id).toBe('Ana');
    });
  });
});
