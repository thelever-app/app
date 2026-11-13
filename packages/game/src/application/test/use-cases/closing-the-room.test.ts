import { describe, expect, it } from 'vitest';
import { RoomCodeNotFoundError } from '../../errors/room-code-not-found.error.ts';
import { ConnectPlayerUseCase } from '../../use-cases/connect-player.use-case.ts';
import { CreateRoomUseCase } from '../../use-cases/create-room.use-case.ts';
import { DeleteClosedRoomsUseCase } from '../../use-cases/delete-closed-rooms.use-case.ts';
import { DisconnectConnectionsUseCase } from '../../use-cases/disconnect-connections.use-case.ts';
import { DisconnectPlayerUseCase } from '../../use-cases/disconnect-player.use-case.ts';
import { GetRoomPreviewUseCase } from '../../use-cases/get-room-preview.use-case.ts';
import { JoinRoomUseCase } from '../../use-cases/join-room.use-case.ts';
import { LeaveRoomUseCase } from '../../use-cases/leave-room.use-case.ts';
import type { Room } from '../../../domain/entities/room.ts';
import { RoomClosedError } from '../../../domain/errors/room-closed.error.ts';
import { InMemoryRoomRepository } from '../../../adapters/in-memory/in-memory-room-repository.ts';
import { FixedRandomness } from '../../../domain/test/support/fixed-randomness.ts';
import { gameInDecisionPhase, lobbyOfThree } from '../support/game-in-decision-phase.ts';

const MINUTE_MS = 60_000;
const IDENTITIES = ['TestAnaIdentity', 'TestLuisIdentity', 'TestMartaIdentity'] as const;

/** The use cases that let someone in, or out, of the room of the arranged lobby or game. */
function useCasesOf(arranged: Awaited<ReturnType<typeof lobbyOfThree>>) {
  const { roomRepository, gameRepository, notifier, idGenerator, randomness, clock } = arranged;
  return {
    getRoomPreview: new GetRoomPreviewUseCase(roomRepository, new FixedRandomness(), clock),
    joinRoom: new JoinRoomUseCase({
      roomRepository,
      gameRepository,
      notifier,
      idGenerator,
      randomness,
      clock,
    }),
    connectPlayer: new ConnectPlayerUseCase(
      roomRepository,
      gameRepository,
      notifier,
      idGenerator,
      clock,
    ),
    disconnectPlayer: new DisconnectPlayerUseCase(roomRepository, gameRepository, notifier, clock),
    disconnectConnections: new DisconnectConnectionsUseCase(roomRepository, notifier),
    leaveRoom: new LeaveRoomUseCase(roomRepository, gameRepository, notifier, clock),
    deleteClosedRooms: new DeleteClosedRoomsUseCase(roomRepository, gameRepository, clock),
  };
}

/** The game of the arranged room in progress, with its three players connected. */
async function connectedGame() {
  const arranged = await gameInDecisionPhase();
  const useCases = useCasesOf(arranged);
  const connections = [];
  for (const identity of IDENTITIES) {
    connections.push(await useCases.connectPlayer.execute({ roomId: arranged.roomId, identity }));
  }
  return { ...arranged, ...useCases, connections };
}

/** Everyone in the arranged game disconnects, one after the other. */
async function everyoneDisconnects(arranged: Awaited<ReturnType<typeof connectedGame>>) {
  for (const { playerId, connectionId } of arranged.connections) {
    await arranged.disconnectPlayer.execute({ roomId: arranged.roomId, playerId, connectionId });
  }
}

async function codeOf(arranged: { roomRepository: InMemoryRoomRepository; roomId: string }) {
  const room = await arranged.roomRepository.findById(arranged.roomId);
  return room!.code;
}

describe('Closing the room', () => {
  describe('GetRoomPreviewUseCase', () => {
    it('should still show a room nobody has connected to for less than 15 minutes', async () => {
      // Arrange
      const arranged = await lobbyOfThree();
      const { getRoomPreview } = useCasesOf(arranged);
      arranged.clock.advance(14 * MINUTE_MS);

      // Act
      const preview = await getRoomPreview.execute({
        code: await codeOf(arranged),
        identity: 'TestPedroIdentity',
      });

      // Assert
      expect(preview.roomId).toBe(arranged.roomId);
    });

    it('should not show a room nobody has connected to for 15 minutes', async () => {
      // Arrange
      const arranged = await lobbyOfThree();
      const { getRoomPreview } = useCasesOf(arranged);
      const code = await codeOf(arranged);
      arranged.clock.advance(15 * MINUTE_MS);

      // Act
      const preview = getRoomPreview.execute({ code, identity: 'TestPedroIdentity' });

      // Assert
      await expect(preview).rejects.toThrow(RoomCodeNotFoundError);
    });

    it('should count the 15 minutes from when the last player disconnected', async () => {
      // Arrange
      const arranged = await connectedGame();
      const code = await codeOf(arranged);
      arranged.clock.advance(30 * MINUTE_MS);
      await everyoneDisconnects(arranged);
      arranged.clock.advance(14 * MINUTE_MS);

      // Act
      const preview = await arranged.getRoomPreview.execute({
        code,
        identity: 'TestPedroIdentity',
      });

      // Assert
      expect(preview.roomId).toBe(arranged.roomId);
    });

    it('should keep showing a room whose players are connected, even if nobody does anything', async () => {
      // Arrange
      const arranged = await connectedGame();
      arranged.clock.advance(20 * MINUTE_MS);

      // Act
      const preview = await arranged.getRoomPreview.execute({
        code: await codeOf(arranged),
        identity: 'TestPedroIdentity',
      });

      // Assert
      expect(preview.roomId).toBe(arranged.roomId);
    });

    it('should not show a room every player has left', async () => {
      // Arrange
      const arranged = await connectedGame();
      const code = await codeOf(arranged);
      for (const playerId of [arranged.anaId, arranged.luisId, arranged.martaId]) {
        await arranged.leaveRoom.execute({ roomId: arranged.roomId, playerId });
      }

      // Act
      const preview = arranged.getRoomPreview.execute({ code, identity: 'TestPedroIdentity' });

      // Assert
      await expect(preview).rejects.toThrow(RoomCodeNotFoundError);
    });
  });

  describe('JoinRoomUseCase', () => {
    it('should not let anyone join a closed room', async () => {
      // Arrange
      const arranged = await lobbyOfThree();
      const { joinRoom } = useCasesOf(arranged);
      arranged.clock.advance(15 * MINUTE_MS);

      // Act
      const joined = joinRoom.execute({
        roomId: arranged.roomId,
        nickname: 'Pedro',
        identity: 'TestPedroIdentity',
        avatar: { face: 'face-04', color: 'teal' },
      });

      // Assert
      await expect(joined).rejects.toThrow(RoomClosedError);
    });

    it('should not let a player of a closed room back in', async () => {
      // Arrange
      const arranged = await connectedGame();
      for (const playerId of [arranged.anaId, arranged.luisId, arranged.martaId]) {
        await arranged.leaveRoom.execute({ roomId: arranged.roomId, playerId });
      }

      // Act
      const joined = arranged.joinRoom.execute({
        roomId: arranged.roomId,
        nickname: 'Luis',
        identity: 'TestLuisIdentity',
        avatar: { face: 'face-02', color: 'teal' },
      });

      // Assert
      await expect(joined).rejects.toThrow(RoomClosedError);
    });
  });

  describe('ConnectPlayerUseCase', () => {
    it('should not let a player of a closed room connect again', async () => {
      // Arrange
      const arranged = await connectedGame();
      await everyoneDisconnects(arranged);
      arranged.clock.advance(15 * MINUTE_MS);

      // Act
      const connected = arranged.connectPlayer.execute({
        roomId: arranged.roomId,
        identity: 'TestLuisIdentity',
      });

      // Assert
      await expect(connected).rejects.toThrow(RoomClosedError);
    });
  });

  describe('DisconnectConnectionsUseCase', () => {
    it('should count the 15 minutes from when the connections it closes were last seen', async () => {
      // Arrange
      const arranged = await connectedGame();
      const code = await codeOf(arranged);
      const lastSeenAt = new Date(arranged.clock.now().getTime() + 5 * MINUTE_MS);
      arranged.clock.advance(20 * MINUTE_MS);

      // Act
      await arranged.disconnectConnections.execute({
        roomId: arranged.roomId,
        connections: arranged.connections,
        at: lastSeenAt,
      });

      // Assert
      const preview = arranged.getRoomPreview.execute({ code, identity: 'TestPedroIdentity' });
      await expect(preview).rejects.toThrow(RoomCodeNotFoundError);
    });
  });

  describe('DeleteClosedRoomsUseCase', () => {
    it('should delete a closed room with its game', async () => {
      // Arrange
      const arranged = await connectedGame();
      await everyoneDisconnects(arranged);
      arranged.clock.advance(15 * MINUTE_MS);

      // Act
      await arranged.deleteClosedRooms.execute();

      // Assert
      expect(await arranged.roomRepository.findById(arranged.roomId)).toBeUndefined();
      expect(await arranged.gameRepository.findById(arranged.gameId)).toBeUndefined();
    });

    it('should delete a room every player has left at once', async () => {
      // Arrange
      const arranged = await connectedGame();
      for (const playerId of [arranged.anaId, arranged.luisId, arranged.martaId]) {
        await arranged.leaveRoom.execute({ roomId: arranged.roomId, playerId });
      }

      // Act
      await arranged.deleteClosedRooms.execute();

      // Assert
      expect(await arranged.roomRepository.findById(arranged.roomId)).toBeUndefined();
    });

    it('should keep a room with a player connected', async () => {
      // Arrange
      const arranged = await connectedGame();
      arranged.clock.advance(60 * MINUTE_MS);

      // Act
      await arranged.deleteClosedRooms.execute();

      // Assert
      expect(await arranged.roomRepository.findById(arranged.roomId)).toBeDefined();
      expect(await arranged.gameRepository.findById(arranged.gameId)).toBeDefined();
    });

    it('should keep a room nobody has connected to for less than 15 minutes', async () => {
      // Arrange
      const arranged = await connectedGame();
      await everyoneDisconnects(arranged);
      arranged.clock.advance(14 * MINUTE_MS);

      // Act
      await arranged.deleteClosedRooms.execute();

      // Assert
      expect(await arranged.roomRepository.findById(arranged.roomId)).toBeDefined();
    });

    it('should delete the other closed rooms when it cannot delete one, and then fail', async () => {
      // Arrange
      const undeletable = new Set<string>();
      const failing = new (class extends InMemoryRoomRepository {
        override async delete(room: Room): Promise<boolean> {
          if (undeletable.has(room.id)) throw new Error('The database is gone');
          return super.delete(room);
        }
      })();
      const arranged = await lobbyOfThree(undefined, undefined, undefined, failing);
      undeletable.add(arranged.roomId);
      const { roomId: otherRoomId } = await new CreateRoomUseCase(
        failing,
        arranged.idGenerator,
        arranged.randomness,
        arranged.clock,
      ).execute({
        hostNickname: 'Pedro',
        hostIdentity: 'TestPedroIdentity',
        hostAvatar: { face: 'face-04', color: 'teal' },
        groupNature: 'friends',
        place: 'together',
        dilemmaLanguage: 'es',
      });
      arranged.clock.advance(15 * MINUTE_MS);
      const { deleteClosedRooms } = useCasesOf(arranged);

      // Act
      const deleted = deleteClosedRooms.execute();

      // Assert
      await expect(deleted).rejects.toThrow(AggregateError);
      await expect(deleted).rejects.toMatchObject({
        errors: [{ message: 'The database is gone' }],
      });
      expect(await failing.findById(arranged.roomId)).toBeDefined();
      expect(await failing.findById(otherRoomId)).toBeUndefined();
    });
  });
});
