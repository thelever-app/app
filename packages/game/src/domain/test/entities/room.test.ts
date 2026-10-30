import { describe, expect, it } from 'vitest';
import { Room } from '../../entities/room.ts';
import { Player } from '../../entities/player.ts';
import { IdMissingError } from '../../errors/id-missing.error.ts';
import { HostMissingError } from '../../errors/host-missing.error.ts';
import { NicknameMissingError } from '../../errors/nickname-missing.error.ts';
import { PlayerNotInRoomError } from '../../errors/player-not-in-room.error.ts';
import { ConnectionChangedEvent } from '../../events/connection-changed.event.ts';
import { FixedIdGenerator } from '../support/fixed-id-generator.ts';

/** Each test player has its own identity, derived from its id: TestLuisId is TestLuisIdentity. */
function player(id: string, nickname: string): Player {
  return Player.create(
    { nickname, identity: id.replace(/Id$/, 'Identity') },
    new FixedIdGenerator(id),
  );
}

function roomHostedByAna(): Room {
  return Room.create(
    { hostNickname: 'Ana', hostIdentity: 'TestAnaIdentity' },
    new FixedIdGenerator('TestId', 'TestHostId'),
  );
}

describe('Room', () => {
  describe('create', () => {
    it('should create a new Room', () => {
      // Arrange & Act
      const room = roomHostedByAna();

      // Assert
      expect(room).toBeInstanceOf(Room);
    });

    it('should have an id and a host with that nickname', () => {
      // Arrange & Act
      const room = Room.create(
        { hostNickname: 'Ana', hostIdentity: 'TestAnaIdentity' },
        new FixedIdGenerator('TestId', 'TestHostId'),
      );

      // Assert
      expect(room.id).toBe('TestId');
      expect(room.host.id).toBe('TestHostId');
      expect(room.host.nickname).toBe('Ana');
    });

    it('should throw an error if the id is missing', () => {
      // Act & Assert
      expect(() =>
        Room.create(
          { hostNickname: 'Ana', hostIdentity: 'TestAnaIdentity' },
          new FixedIdGenerator('', 'TestHostId'),
        ),
      ).toThrow(IdMissingError);
    });

    it('should throw an error if the host nickname is missing', () => {
      // Act & Assert
      expect(() =>
        Room.create(
          { hostNickname: '', hostIdentity: 'TestHostIdentity' },
          new FixedIdGenerator('TestId', 'TestHostId'),
        ),
      ).toThrow(NicknameMissingError);
    });
  });

  describe('players', () => {
    it('should not let the players be changed from outside the room', () => {
      // Arrange
      const room = roomHostedByAna();
      const intruder = player('TestIntruderId', 'TestIntruderNickname');

      // Act
      (room.players as Player[]).push(intruder);

      // Assert
      expect(room.players).toHaveLength(1);
      expect(room.players).not.toContain(intruder);
    });
  });

  describe('addPlayer', () => {
    it('should add a new player to the room', () => {
      // Arrange
      const room = roomHostedByAna();
      const luis = player('TestLuisId', 'Luis');

      // Act
      room.addPlayer(luis);

      // Assert
      expect(room.players).toContain(luis);
    });

    it('should have host as player of the room', () => {
      // Arrange & act
      const room = roomHostedByAna();

      // Assert
      expect(room.players).toEqual([room.host]);
    });

    it('should not add the same player more than once', () => {
      // Arrange
      const room = roomHostedByAna();

      // Act
      room.addPlayer(room.host);
      room.addPlayer(room.host);

      // Assert
      expect(room.players).toEqual([room.host]);
    });

    it('should add players with the same nickname but different ids', () => {
      // Arrange
      const room = roomHostedByAna();
      const namesake = player('TestPlayerId', 'Ana');

      // Act
      room.addPlayer(namesake);

      // Assert
      expect(room.players).toHaveLength(2);
    });
  });

  describe('playerWith', () => {
    it('should find a player by their identity', () => {
      // Arrange
      const room = roomHostedByAna();
      const luis = player('TestLuisId', 'Luis');
      room.addPlayer(luis);

      // Act & Assert
      expect(room.playerWith('TestLuisIdentity')).toBe(luis);
      expect(room.playerWith('TestStrangerIdentity')).toBeUndefined();
    });
  });

  describe('addPlayer with an identity already in the room', () => {
    it('should not add a second player with the same identity', () => {
      // Arrange
      const room = roomHostedByAna();
      room.addPlayer(player('TestLuisId', 'Luis'));

      // Act
      room.addPlayer(
        Player.create(
          { nickname: 'Luis again', identity: 'TestLuisIdentity' },
          new FixedIdGenerator('TestOtherLuisId'),
        ),
      );

      // Assert
      expect(room.players.map(({ id }) => id)).toEqual(['TestHostId', 'TestLuisId']);
    });
  });

  describe('connect', () => {
    it('should start with nobody connected and version 0', () => {
      // Arrange & Act
      const room = roomHostedByAna();

      // Assert
      expect(room.isConnected('TestHostId')).toBe(false);
      expect(room.version).toBe(0);
    });

    it('should connect the player and raise the version', () => {
      // Arrange
      const room = roomHostedByAna();

      // Act
      room.connect('TestHostId', 'TestConnectionId');

      // Assert
      expect(room.isConnected('TestHostId')).toBe(true);
      expect(room.version).toBe(1);
    });

    it('should record a connection changed event with the new version', () => {
      // Arrange
      const room = roomHostedByAna();

      // Act
      room.connect('TestHostId', 'TestConnectionId');

      // Assert
      expect(room.pullEvents()).toEqual([
        new ConnectionChangedEvent('TestId', 'TestHostId', true, 1),
      ]);
    });

    it('should keep a player who is already connected connected through another connection, without any event', () => {
      // Arrange
      const room = roomHostedByAna();
      room.connect('TestHostId', 'TestFirstConnectionId');
      room.pullEvents();

      // Act
      room.connect('TestHostId', 'TestSecondConnectionId');

      // Assert
      expect(room.isConnected('TestHostId')).toBe(true);
      expect(room.version).toBe(1);
      expect(room.pullEvents()).toEqual([]);
    });

    it('should throw an error if the player is not in the room', () => {
      // Arrange
      const room = roomHostedByAna();

      // Act & Assert
      expect(() => room.connect('TestUnknownId', 'TestConnectionId')).toThrow(PlayerNotInRoomError);
    });

    it('should throw an error if the connection id is missing', () => {
      // Arrange
      const room = roomHostedByAna();

      // Act & Assert
      expect(() => room.connect('TestHostId', '')).toThrow(IdMissingError);
    });
  });

  describe('disconnect', () => {
    it('should disconnect the player and raise the version', () => {
      // Arrange
      const room = roomHostedByAna();
      room.connect('TestHostId', 'TestConnectionId');

      // Act
      room.disconnect('TestHostId', 'TestConnectionId');

      // Assert
      expect(room.isConnected('TestHostId')).toBe(false);
      expect(room.version).toBe(2);
    });

    it('should record a connection changed event with the new version', () => {
      // Arrange
      const room = roomHostedByAna();
      room.connect('TestHostId', 'TestConnectionId');
      room.pullEvents();

      // Act
      room.disconnect('TestHostId', 'TestConnectionId');

      // Assert
      expect(room.pullEvents()).toEqual([
        new ConnectionChangedEvent('TestId', 'TestHostId', false, 2),
      ]);
    });

    it('should ignore the late close of a connection the player already reopened', () => {
      // Arrange
      const room = roomHostedByAna();
      room.connect('TestHostId', 'TestOldConnectionId');
      room.connect('TestHostId', 'TestNewConnectionId');
      room.pullEvents();

      // Act
      room.disconnect('TestHostId', 'TestOldConnectionId');

      // Assert
      expect(room.isConnected('TestHostId')).toBe(true);
      expect(room.version).toBe(1);
      expect(room.pullEvents()).toEqual([]);
    });

    it('should keep the player connected while an older connection is still open', () => {
      // Arrange
      const room = roomHostedByAna();
      room.connect('TestHostId', 'TestFirstConnectionId');
      room.connect('TestHostId', 'TestSecondConnectionId');
      room.pullEvents();

      // Act
      room.disconnect('TestHostId', 'TestSecondConnectionId');

      // Assert
      expect(room.isConnected('TestHostId')).toBe(true);
      expect(room.version).toBe(1);
      expect(room.pullEvents()).toEqual([]);
    });

    it('should disconnect the player when their last open connection closes', () => {
      // Arrange
      const room = roomHostedByAna();
      room.connect('TestHostId', 'TestFirstConnectionId');
      room.connect('TestHostId', 'TestSecondConnectionId');
      room.disconnect('TestHostId', 'TestSecondConnectionId');
      room.pullEvents();

      // Act
      room.disconnect('TestHostId', 'TestFirstConnectionId');

      // Assert
      expect(room.isConnected('TestHostId')).toBe(false);
      expect(room.version).toBe(2);
      expect(room.pullEvents()).toEqual([
        new ConnectionChangedEvent('TestId', 'TestHostId', false, 2),
      ]);
    });

    it('should ignore a connection of the player that is not open', () => {
      // Arrange
      const room = roomHostedByAna();
      room.connect('TestHostId', 'TestConnectionId');
      room.pullEvents();

      // Act
      room.disconnect('TestHostId', 'TestUnknownConnectionId');

      // Assert
      expect(room.isConnected('TestHostId')).toBe(true);
      expect(room.version).toBe(1);
      expect(room.pullEvents()).toEqual([]);
    });

    it('should ignore a player who is not connected', () => {
      // Arrange
      const room = roomHostedByAna();

      // Act
      room.disconnect('TestHostId', 'TestConnectionId');

      // Assert
      expect(room.version).toBe(0);
      expect(room.pullEvents()).toEqual([]);
    });

    it('should connect again after a disconnection', () => {
      // Arrange
      const room = roomHostedByAna();
      room.connect('TestHostId', 'TestConnectionId');
      room.disconnect('TestHostId', 'TestConnectionId');

      // Act
      room.connect('TestHostId', 'TestOtherConnectionId');

      // Assert
      expect(room.isConnected('TestHostId')).toBe(true);
      expect(room.version).toBe(3);
    });
  });

  describe('isConnected', () => {
    it('should throw an error if the player is not in the room', () => {
      // Arrange
      const room = roomHostedByAna();

      // Act & Assert
      expect(() => room.isConnected('TestUnknownId')).toThrow(PlayerNotInRoomError);
    });
  });

  describe('toSnapshot', () => {
    it('should include the version and every open connection of each connected player', () => {
      // Arrange
      const room = roomHostedByAna();
      room.addPlayer(player('TestLuisId', 'Luis'));
      room.connect('TestLuisId', 'TestFirstConnectionId');
      room.connect('TestLuisId', 'TestSecondConnectionId');

      // Act
      const snapshot = room.toSnapshot();

      // Assert
      expect(snapshot.version).toBe(1);
      expect(snapshot.connections).toEqual([
        { playerId: 'TestLuisId', connectionId: 'TestFirstConnectionId' },
        { playerId: 'TestLuisId', connectionId: 'TestSecondConnectionId' },
      ]);
    });

    it('should return its id, its host id and its players in the order they joined', () => {
      // Arrange
      const room = roomHostedByAna();
      room.addPlayer(player('TestLuisId', 'Luis'));
      room.addPlayer(player('TestMartaId', 'Marta'));

      // Act
      const snapshot = room.toSnapshot();

      // Assert
      expect(snapshot).toEqual({
        id: 'TestId',
        hostId: 'TestHostId',
        players: [
          { id: 'TestHostId', nickname: 'Ana', identity: 'TestAnaIdentity' },
          { id: 'TestLuisId', nickname: 'Luis', identity: 'TestLuisIdentity' },
          { id: 'TestMartaId', nickname: 'Marta', identity: 'TestMartaIdentity' },
        ],
        version: 0,
        connections: [],
      });
    });
  });

  describe('restore', () => {
    it('should rebuild the connections and the version without recording any event', () => {
      // Arrange
      const room = roomHostedByAna();
      room.connect('TestHostId', 'TestConnectionId');

      // Act
      const restored = Room.restore(room.toSnapshot());

      // Assert
      expect(restored.isConnected('TestHostId')).toBe(true);
      expect(restored.version).toBe(1);
      expect(restored.pullEvents()).toEqual([]);
    });

    it('should keep every open connection of a player after being restored', () => {
      // Arrange
      const room = roomHostedByAna();
      room.connect('TestHostId', 'TestFirstConnectionId');
      room.connect('TestHostId', 'TestSecondConnectionId');
      const restored = Room.restore(room.toSnapshot());

      // Act
      restored.disconnect('TestHostId', 'TestSecondConnectionId');

      // Assert
      expect(restored.isConnected('TestHostId')).toBe(true);
    });

    it('should rebuild the room from its snapshot', () => {
      // Arrange
      const room = roomHostedByAna();
      room.addPlayer(player('TestLuisId', 'Luis'));
      room.addPlayer(player('TestMartaId', 'Marta'));

      // Act
      const restored = Room.restore(room.toSnapshot());

      // Assert
      expect(restored.toSnapshot()).toEqual(room.toSnapshot());
    });

    it('should keep the order in which players joined when the host joined later', () => {
      // Arrange
      const snapshot = {
        id: 'TestId',
        hostId: 'TestLuisId',
        players: [
          { id: 'TestAnaId', nickname: 'Ana', identity: 'TestAnaIdentity' },
          { id: 'TestLuisId', nickname: 'Luis', identity: 'TestLuisIdentity' },
        ],
        version: 0,
        connections: [],
      };

      // Act
      const restored = Room.restore(snapshot);

      // Assert
      expect(restored.toSnapshot()).toEqual(snapshot);
    });

    it('should throw an error if the host is not among the players', () => {
      // Arrange
      const snapshot = {
        id: 'TestId',
        hostId: 'TestUnknownId',
        players: [{ id: 'TestLuisId', nickname: 'Luis', identity: 'TestLuisIdentity' }],
        version: 0,
        connections: [],
      };

      // Act & Assert
      expect(() => Room.restore(snapshot)).toThrow(HostMissingError);
    });
  });
});
