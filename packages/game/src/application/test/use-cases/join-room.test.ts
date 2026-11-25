import { InMemoryUsage } from '../../../adapters/in-memory/in-memory-usage.ts';
import {
  InMemorySealProvider,
  SEAL_BEFORE_FIRST_ACCESS,
} from '../../../adapters/in-memory/in-memory-seal-provider.ts';
import { AdultsOnlyRoomError } from '../../../domain/errors/adults-only-room.error.ts';
import { describe, expect, it } from 'vitest';
import { CreateRoomUseCase } from '../../use-cases/create-room.use-case.ts';
import { JoinRoomUseCase } from '../../use-cases/join-room.use-case.ts';
import { RoomNotFoundError } from '../../errors/room-not-found.error.ts';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import { InvalidAvatarError } from '../../../domain/errors/invalid-avatar.error.ts';
import { NicknameAndAvatarTakenError } from '../../../domain/errors/nickname-and-avatar-taken.error.ts';
import { LobbyChangedEvent } from '../../../domain/events/lobby-changed.event.ts';
import { PlayerJoinedLateEvent } from '../../../domain/events/player-joined-late.event.ts';
import { AvatarVO } from '../../../domain/vos/avatar.vo.ts';
import { KeepOrderRandomness } from '../../../domain/test/support/keep-order-randomness.ts';
import { gameInDecisionPhase, lobbyOfThree } from '../support/game-in-decision-phase.ts';

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
  return { ...lobby, notifier, joinRoom: joinRoomOf(lobby, notifier) };
}

/** The lobby of three, with the game in its decision phase. */
async function arrangeGame() {
  const game = await gameInDecisionPhase();
  const notifier = new InMemoryPlayerNotifier();
  return { ...game, notifier, joinRoom: joinRoomOf(game, notifier) };
}

/** Pablo declared an age that makes him 17. */
const SEALS = new Map([
  ['TestPabloIdentity', { ...SEAL_BEFORE_FIRST_ACCESS, underEighteen: true }],
]);

function joinRoomOf(
  ports: Awaited<ReturnType<typeof lobbyOfThree>>,
  notifier: InMemoryPlayerNotifier,
): JoinRoomUseCase {
  return new JoinRoomUseCase(
    {
      sealProvider: new InMemorySealProvider(SEALS),
      roomRepository: ports.roomRepository,
      gameRepository: ports.gameRepository,
      notifier,
      idGenerator: ports.idGenerator,
      randomness: new KeepOrderRandomness(),
      clock: ports.clock,
    },
    new InMemoryUsage(),
  );
}

describe('JoinRoomUseCase', () => {
  describe('execute', () => {
    it('should add a new player with the nickname and the avatar they chose', async () => {
      // Arrange
      const { joinRoom, roomRepository, roomId } = await arrange();

      // Act
      const { playerId, joinedLate } = await joinRoom.execute({ roomId, ...PABLO });

      // Assert
      const room = await roomRepository.findById(roomId);
      const pablo = room?.players.find(({ id }) => id === playerId);
      expect(pablo?.nickname).toBe('Pablo');
      expect(pablo?.avatar).toMatchObject(PABLO.avatar);
      expect(joinedLate).toBe(false);
    });

    it('should keep that the player is under 18, as their seal says', async () => {
      // Arrange
      const { joinRoom, roomRepository, roomId } = await arrange();

      // Act
      const { playerId } = await joinRoom.execute({ roomId, ...PABLO });

      // Assert
      const room = await roomRepository.findById(roomId);
      expect(room?.players.find(({ id }) => id === playerId)?.underEighteen).toBe(true);
    });

    it('should not let a player under 18 into a room for adults', async () => {
      // Arrange
      const { joinRoom, roomRepository, roomId } = await arrange();
      const room = await roomRepository.findById(roomId);
      room!.changeSettings(room!.host.id, { adultsOnly: true });
      await roomRepository.save(room!);

      // Act & Assert
      await expect(joinRoom.execute({ roomId, ...PABLO })).rejects.toThrow(AdultsOnlyRoomError);
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

    it('should take a new player into the game in progress, and tell everyone', async () => {
      // Arrange
      const {
        joinRoom,
        gameRepository,
        roomRepository,
        roomId,
        gameId,
        dilemmaIds,
        notifier,
        anaId,
      } = await arrangeGame();

      // Act
      const { playerId, joinedLate } = await joinRoom.execute({ roomId, ...PABLO });

      // Assert
      expect(joinedLate).toBe(true);
      const game = await gameRepository.findById(gameId);
      expect(game?.playerIds).toContain(playerId);
      const room = await roomRepository.findById(roomId);
      expect(notifier.receivedBy(anaId)).toEqual([
        new LobbyChangedEvent(roomId, 'player-joined', room!.version),
        new PlayerJoinedLateEvent(gameId, playerId, game!.version),
      ]);
      expect(() =>
        game?.answer(
          playerId,
          dilemmaIds[0] as string,
          { vote: game.dilemmas[0]?.optionIds[0] as string },
          {
            gameConsentVersion: 'TestGameConsentVersion',
            researchConsentVersion: null,
            commercialLicenceConsentVersion: null,
            underEighteen: false,
            objectsToAnalytics: false,
          },
          new Date(),
        ),
      ).not.toThrow();
    });

    it('should take into the game a player of the room who was left out of it, and tell the others', async () => {
      // Arrange
      const { joinRoom, roomRepository, gameRepository, clock, roomId, gameId, notifier, anaId } =
        await arrangeGame();
      const room = await roomRepository.findById(roomId);
      const pablo = room!.join(
        {
          underEighteen: false,
          nickname: PABLO.nickname,
          identity: PABLO.identity,
          avatar: new AvatarVO(PABLO.avatar.face, PABLO.avatar.color),
        },
        { generate: () => 'TestPabloId' },
        clock.now(),
      );
      await roomRepository.save(room!);

      // Act
      const { playerId, joinedLate } = await joinRoom.execute({ roomId, ...PABLO });

      // Assert
      expect(playerId).toBe(pablo.id);
      expect(joinedLate).toBe(true);
      const game = await gameRepository.findById(gameId);
      expect(game?.playerIds).toContain(pablo.id);
      expect(notifier.receivedBy(anaId)).toEqual([
        new PlayerJoinedLateEvent(gameId, pablo.id, game!.version),
      ]);
    });

    it('should leave as it is the game of a player who is already in it', async () => {
      // Arrange
      const { joinRoom, gameRepository, roomId, gameId, luisId } = await arrangeGame();
      const version = (await gameRepository.findById(gameId))?.version;

      // Act
      const { playerId, joinedLate } = await joinRoom.execute({
        roomId,
        nickname: 'Luis',
        identity: 'TestLuisIdentity',
        avatar: PABLO.avatar,
      });

      // Assert
      expect(playerId).toBe(luisId);
      expect(joinedLate).toBe(false);
      expect((await gameRepository.findById(gameId))?.version).toBe(version);
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

  describe('execute, leaving a room of their own', () => {
    it('should close the room the player was alone in once they join the other', async () => {
      // Arrange
      const { joinRoom, roomRepository, roomId, clock, pabloRoomId } = await arrangeTwoRooms();

      // Act
      const { playerId } = await joinRoom.execute({
        roomId,
        ...PABLO,
        leavingRoomId: pabloRoomId,
      });

      // Assert
      const left = await roomRepository.findById(pabloRoomId);
      const joined = await roomRepository.findById(roomId);
      expect(left?.isOpenAt(clock.now())).toBe(false);
      expect(joined?.players.map(({ id }) => id)).toContain(playerId);
    });

    it('should tell the connections of the player in the room they leave that they left', async () => {
      // Arrange
      const { joinRoom, notifier, roomId, pabloRoomId, pabloId } = await arrangeTwoRooms();

      // Act
      await joinRoom.execute({ roomId, ...PABLO, leavingRoomId: pabloRoomId });

      // Assert
      expect(notifier.receivedBy(pabloId)).toContainEqual(
        expect.objectContaining({ type: 'PlayerLeft', roomId: pabloRoomId, left: true }),
      );
    });

    it('should pass the host on to who came into the room the player leaves', async () => {
      // Arrange
      const { joinRoom, roomRepository, roomId, pabloRoomId } = await arrangeTwoRooms();
      const { playerId: rosaId } = await joinRoom.execute({ roomId: pabloRoomId, ...ROSA });

      // Act
      await joinRoom.execute({ roomId, ...PABLO, leavingRoomId: pabloRoomId });

      // Assert
      const left = await roomRepository.findById(pabloRoomId);
      expect(left?.players.map(({ id }) => id)).toEqual([rosaId]);
      expect(left?.host.id).toBe(rosaId);
    });

    it('should keep the room of the player when they cannot join the other', async () => {
      // Arrange
      const { joinRoom, roomRepository, roomId, clock, pabloRoomId } = await arrangeTwoRooms();

      // Act
      const joining = joinRoom.execute({
        roomId,
        ...PABLO,
        nickname: 'Ana',
        avatar: ANA_AVATAR,
        leavingRoomId: pabloRoomId,
      });

      // Assert
      await expect(joining).rejects.toThrow(NicknameAndAvatarTakenError);
      const kept = await roomRepository.findById(pabloRoomId);
      expect(kept?.isOpenAt(clock.now())).toBe(true);
      expect(kept?.players).toHaveLength(1);
    });

    it('should leave alone a room the player is not in', async () => {
      // Arrange
      const { joinRoom, roomRepository, roomId, clock, pabloRoomId } = await arrangeTwoRooms();

      // Act
      await joinRoom.execute({ roomId, ...ROSA, leavingRoomId: pabloRoomId });

      // Assert
      const untouched = await roomRepository.findById(pabloRoomId);
      expect(untouched?.isOpenAt(clock.now())).toBe(true);
      expect(untouched?.players).toHaveLength(1);
    });

    it('should leave nothing when the room the player leaves is the one they join', async () => {
      // Arrange
      const { joinRoom, roomRepository, clock, pabloRoomId } = await arrangeTwoRooms();

      // Act
      await joinRoom.execute({ roomId: pabloRoomId, ...PABLO, leavingRoomId: pabloRoomId });

      // Assert
      const kept = await roomRepository.findById(pabloRoomId);
      expect(kept?.isOpenAt(clock.now())).toBe(true);
      expect(kept?.players).toHaveLength(1);
    });

    it('should let the player in when the room they leave no longer exists', async () => {
      // Arrange
      const { joinRoom, roomRepository, roomId } = await arrangeTwoRooms();

      // Act
      const { playerId } = await joinRoom.execute({
        roomId,
        ...PABLO,
        leavingRoomId: 'TestUnknownId',
      });

      // Assert
      const joined = await roomRepository.findById(roomId);
      expect(joined?.players.map(({ id }) => id)).toContain(playerId);
    });
  });
});

const ROSA = {
  nickname: 'Rosa',
  identity: 'TestRosaIdentity',
  avatar: { face: 'face-04', color: 'brown' },
};

/** The lobby of three and, apart, a room Pablo has just created and is alone in. */
async function arrangeTwoRooms() {
  const arranged = await arrange();
  const { roomRepository, catalog, idGenerator, randomness, clock, usage } = arranged;
  const { roomId: pabloRoomId, hostId: pabloId } = await new CreateRoomUseCase(
    roomRepository,
    catalog,
    idGenerator,
    randomness,
    clock,
    new InMemorySealProvider(SEALS),
    usage,
  ).execute({
    ambience: 'classic',
    hostNickname: PABLO.nickname,
    hostIdentity: PABLO.identity,
    hostAvatar: PABLO.avatar,
    place: 'together',
    dilemmaLanguage: 'es',
  });
  return { ...arranged, pabloRoomId, pabloId };
}
