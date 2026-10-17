import { describe, expect, it } from 'vitest';
import { Room } from '../../entities/room.ts';
import { Player } from '../../entities/player.ts';
import { IdMissingError } from '../../errors/id-missing.error.ts';
import { HostMissingError } from '../../errors/host-missing.error.ts';
import { NicknameMissingError } from '../../errors/nickname-missing.error.ts';
import { FixedIdGenerator } from '../support/fixed-id-generator.ts';

function player(id: string, nickname: string): Player {
  return Player.create({ nickname }, new FixedIdGenerator(id));
}

function roomHostedByAna(): Room {
  return Room.create({ hostNickname: 'Ana' }, new FixedIdGenerator('TestId', 'TestHostId'));
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
        { hostNickname: 'Ana' },
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
        Room.create({ hostNickname: 'Ana' }, new FixedIdGenerator('', 'TestHostId')),
      ).toThrow(IdMissingError);
    });

    it('should throw an error if the host nickname is missing', () => {
      // Act & Assert
      expect(() =>
        Room.create({ hostNickname: '' }, new FixedIdGenerator('TestId', 'TestHostId')),
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

  describe('toSnapshot', () => {
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
          { id: 'TestHostId', nickname: 'Ana' },
          { id: 'TestLuisId', nickname: 'Luis' },
          { id: 'TestMartaId', nickname: 'Marta' },
        ],
      });
    });
  });

  describe('restore', () => {
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
          { id: 'TestAnaId', nickname: 'Ana' },
          { id: 'TestLuisId', nickname: 'Luis' },
        ],
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
        players: [{ id: 'TestLuisId', nickname: 'Luis' }],
      };

      // Act & Assert
      expect(() => Room.restore(snapshot)).toThrow(HostMissingError);
    });
  });
});
