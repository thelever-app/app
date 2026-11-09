import { describe, expect, it } from 'vitest';
import { JoinRoomUseCase } from '../../use-cases/join-room.use-case.ts';
import { RoomNotFoundError } from '../../errors/room-not-found.error.ts';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import { InvalidAvatarError } from '../../../domain/errors/invalid-avatar.error.ts';
import { NicknameAndAvatarTakenError } from '../../../domain/errors/nickname-and-avatar-taken.error.ts';
import { LobbyChangedEvent } from '../../../domain/events/lobby-changed.event.ts';
import { lobbyOfThree } from '../support/game-in-decision-phase.ts';

const PABLO = {
  nickname: 'Pablo',
  identity: 'TestPabloIdentity',
  avatar: { face: 'face-08', color: 'olive' },
};

/** The avatar Ana wears in the lobby of three. */
const ANA_AVATAR = { face: 'face-01', color: 'khaki' };

async function arrange() {
  const lobby = await lobbyOfThree();
  const notifier = new InMemoryPlayerNotifier();
  const joinRoom = new JoinRoomUseCase({
    roomRepository: lobby.roomRepository,
    gameRepository: lobby.gameRepository,
    notifier,
    idGenerator: lobby.idGenerator,
  });
  return { ...lobby, notifier, joinRoom };
}

describe('JoinRoomUseCase', () => {
  describe('execute', () => {
    it('should add a new player with the nickname and the avatar they chose', async () => {
      // Arrange
      const { joinRoom, roomRepository, roomId } = await arrange();

      // Act
      const { playerId } = await joinRoom.execute({ roomId, ...PABLO });

      // Assert
      const room = await roomRepository.findById(roomId);
      const pablo = room?.players.find(({ id }) => id === playerId);
      expect(pablo?.nickname).toBe('Pablo');
      expect(pablo?.avatar).toMatchObject(PABLO.avatar);
    });

    it('should let a player take the avatar of someone with another nickname', async () => {
      // Arrange
      const { joinRoom, roomRepository, roomId } = await arrange();

      // Act
      const { playerId } = await joinRoom.execute({ roomId, ...PABLO, avatar: ANA_AVATAR });

      // Assert
      const room = await roomRepository.findById(roomId);
      expect(room?.players.find(({ id }) => id === playerId)?.avatar).toMatchObject(ANA_AVATAR);
    });

    it('should tell everyone in the room that the lobby changed', async () => {
      // Arrange
      const { joinRoom, notifier, roomId, anaId } = await arrange();

      // Act
      const { playerId } = await joinRoom.execute({ roomId, ...PABLO });

      // Assert
      expect(notifier.receivedBy(anaId)).toEqual([
        new LobbyChangedEvent(roomId, 'player-joined', 3),
      ]);
      expect(notifier.receivedBy(playerId)).toHaveLength(1);
    });

    it('should give back the player of someone already in the room, telling nobody', async () => {
      // Arrange
      const { joinRoom, notifier, roomId, luisId } = await arrange();

      // Act
      const { playerId } = await joinRoom.execute({
        roomId,
        nickname: 'Luis',
        identity: 'TestLuisIdentity',
        avatar: PABLO.avatar,
      });

      // Assert
      expect(playerId).toBe(luisId);
      expect(notifier.receivedBy(luisId)).toEqual([]);
    });

    it('should throw an error if someone with the same nickname has that avatar', async () => {
      // Arrange
      const { joinRoom, notifier, roomId, anaId } = await arrange();

      // Act & Assert
      await expect(
        joinRoom.execute({ roomId, ...PABLO, nickname: 'ANA', avatar: ANA_AVATAR }),
      ).rejects.toThrow(NicknameAndAvatarTakenError);
      expect(notifier.receivedBy(anaId)).toEqual([]);
    });

    it('should throw an error if the avatar is not one of the closed list', async () => {
      // Arrange
      const { joinRoom, roomId } = await arrange();

      // Act & Assert
      await expect(
        joinRoom.execute({ roomId, ...PABLO, avatar: { face: 'face-01', color: 'pink' } }),
      ).rejects.toThrow(InvalidAvatarError);
    });

    it('should throw an error if the room does not exist', async () => {
      // Arrange
      const { joinRoom } = await arrange();

      // Act & Assert
      await expect(joinRoom.execute({ roomId: 'TestUnknownId', ...PABLO })).rejects.toThrow(
        RoomNotFoundError,
      );
    });
  });
});
