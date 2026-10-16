import { describe, expect, it } from 'vitest';
import { Room } from '../../entities/room.ts';
import { Player } from '../../entities/player.ts';
import { IdMissingError } from '../../errors/id-missing.error.ts';
import { HostMissingError } from '../../errors/host-missing.error.ts';

describe('Room', () => {
  describe('constructor', () => {
    it('should create a new Room', () => {
      // Arrange & Act
      const room = new Room('TestId', new Player('TestHostId', 'TestHostNickname'));

      // Assert
      expect(room).toBeInstanceOf(Room);
    });

    it('should have an id and a host', () => {
      // Arrange
      const id = 'TestId';
      const host = new Player('TestHostId', 'TestHostNickname');

      // Act
      const room = new Room(id, host);

      // Assert
      expect(room.id).toBe(id);
      expect(room.host).toBe(host);
    });

    it('should throw an error if the id is missing', () => {
      // Arrange
      const id = '';
      const host = new Player('TestHostId', 'TestHostNickname');

      // Act & Assert
      expect(() => new Room(id, host)).toThrow(IdMissingError);
    });

    it('should throw an error if the host is missing', () => {
      // Arrange
      const id = 'TestId';

      // Act & Assert
      expect(() => new Room(id, undefined as unknown as Player)).toThrow(HostMissingError);
    });
  });

  describe('players', () => {
    it('should not let the players be changed from outside the room', () => {
      // Arrange
      const host = new Player('TestHostId', 'TestHostNickname');
      const room = new Room('TestId', host);
      const intruder = new Player('TestIntruderId', 'TestIntruderNickname');

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
      const host = new Player('TestHostId', 'TestHostNickname');
      const room = new Room('TestId', host);
      const player = new Player('TestPlayerId', 'TestPlayerNickname');

      // Act
      room.addPlayer(player);

      // Assert
      expect(room.players).toContain(player);
    });

    it('should have host as player of the room', () => {
      // Arrange & act
      const host = new Player('TestHostId', 'TestHostNickname');
      const room = new Room('TestId', host);

      // Assert
      expect(room.players).toHaveLength(1);
      expect(room.players).toContain(host);
    });

    it('should not add the same player more than once', () => {
      // Arrange
      const host = new Player('TestHostId', 'TestHostNickname');
      const room = new Room('TestId', host);

      // Act
      room.addPlayer(host);
      room.addPlayer(host);

      // Assert
      expect(room.players).toHaveLength(1);
      expect(room.players).toContain(host);
    });

    it('should add players with the same nickname but different ids', () => {
      // Arrange
      const host = new Player('TestHostId', 'Ana');
      const room = new Room('TestId', host);
      const namesake = new Player('TestPlayerId', 'Ana');

      // Act
      room.addPlayer(namesake);

      // Assert
      expect(room.players).toHaveLength(2);
    });
  });
});
