import { InMemoryUsage } from '../../../adapters/in-memory/in-memory-usage.ts';
import { describe, expect, it } from 'vitest';
import { InMemoryNicknameReports } from '../../../adapters/in-memory/in-memory-nickname-reports.ts';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import { PlayerNotInRoomError } from '../../../domain/errors/player-not-in-room.error.ts';
import { LobbyChangedEvent } from '../../../domain/events/lobby-changed.event.ts';
import { InvalidReportReasonError } from '../../errors/invalid-report-reason.error.ts';
import { JoinRoomUseCase } from '../../use-cases/join-room.use-case.ts';
import { ReportNicknameUseCase } from '../../use-cases/report-nickname.use-case.ts';
import { WithdrawNicknameUseCase } from '../../use-cases/withdraw-nickname.use-case.ts';
import { InMemorySealProvider } from '../../../adapters/in-memory/in-memory-seal-provider.ts';
import { lobbyOfThree } from '../support/game-in-decision-phase.ts';

async function arrange() {
  const lobby = await lobbyOfThree();
  const notifier = new InMemoryPlayerNotifier();
  const reports = new InMemoryNicknameReports();
  return {
    ...lobby,
    notifier,
    reports,
    reportNickname: new ReportNicknameUseCase({ ...lobby, reports }),
    withdrawNickname: new WithdrawNicknameUseCase(lobby.roomRepository, notifier),
  };
}

describe('ReportNicknameUseCase', () => {
  it('should hand Moderation the nickname, who goes by it and who reports it', async () => {
    // Arrange
    const { reportNickname, reports, roomId, luisId, martaId, clock } = await arrange();

    // Act
    await reportNickname.execute({
      roomId,
      playerId: luisId,
      reportedPlayerId: martaId,
      reason: 'impersonation',
      comment: ' TestComment ',
    });

    // Assert
    expect(reports.reports).toEqual([
      {
        nickname: 'Marta',
        owner: 'TestMartaIdentity',
        reason: 'impersonation',
        comment: 'TestComment',
        identity: 'TestLuisIdentity',
        at: clock.now(),
      },
    ]);
  });

  it('should tell nobody in the room', async () => {
    // Arrange
    const { reportNickname, roomRepository, roomId, luisId, martaId } = await arrange();
    const before = (await roomRepository.findById(roomId))!.version;

    // Act
    await reportNickname.execute({
      roomId,
      playerId: luisId,
      reportedPlayerId: martaId,
      reason: 'offensive',
    });

    // Assert
    expect((await roomRepository.findById(roomId))!.version).toBe(before);
  });

  it('should not let a player report their own nickname', async () => {
    // Arrange
    const { reportNickname, roomId, luisId } = await arrange();

    // Act & Assert
    await expect(
      reportNickname.execute({
        roomId,
        playerId: luisId,
        reportedPlayerId: luisId,
        reason: 'other',
      }),
    ).rejects.toThrow(PlayerNotInRoomError);
  });

  it('should not take a reason of dilemmas', async () => {
    // Arrange
    const { reportNickname, roomId, luisId, martaId } = await arrange();

    // Act & Assert
    await expect(
      reportNickname.execute({
        roomId,
        playerId: luisId,
        reportedPlayerId: martaId,
        reason: 'confusing',
      }),
    ).rejects.toThrow(InvalidReportReasonError);
  });
});

describe('WithdrawNicknameUseCase', () => {
  it('should give the player the generic nickname of the room, with their number', async () => {
    // Arrange
    const { withdrawNickname, roomRepository, roomId, anaId, martaId, notifier } = await arrange();

    // Act
    await withdrawNickname.execute({ identity: 'TestMartaIdentity', nickname: 'Marta' });

    // Assert
    const room = await roomRepository.findById(roomId);
    expect(room?.players.find(({ id }) => id === martaId)?.nickname).toBe('Jugador 3');
    expect(notifier.receivedBy(anaId)).toEqual([expect.any(LobbyChangedEvent)]);
  });

  it('should leave a player who goes by another nickname now as they are', async () => {
    // Arrange
    const { withdrawNickname, roomRepository, roomId, anaId, martaId, notifier } = await arrange();

    // Act
    await withdrawNickname.execute({ identity: 'TestMartaIdentity', nickname: 'Martita' });

    // Assert
    const room = await roomRepository.findById(roomId);
    expect(room?.players.find(({ id }) => id === martaId)?.nickname).toBe('Marta');
    expect(notifier.receivedBy(anaId)).toEqual([]);
  });

  it('should take the next number when someone else already looks like the generic one', async () => {
    // Arrange
    const {
      withdrawNickname,
      roomRepository,
      gameRepository,
      roomId,
      martaId,
      clock,
      idGenerator,
      randomness,
    } = await arrange();
    await new JoinRoomUseCase(
      {
        sealProvider: new InMemorySealProvider(),
        roomRepository,
        gameRepository,
        notifier: new InMemoryPlayerNotifier(),
        idGenerator,
        randomness,
        clock,
      },
      new InMemoryUsage(),
    ).execute({
      roomId,
      nickname: 'Jugador 3',
      identity: 'TestPabloIdentity',
      avatar: { face: 'face-03', color: 'brown' },
    });

    // Act
    await withdrawNickname.execute({ identity: 'TestMartaIdentity', nickname: 'marta' });

    // Assert
    const room = await roomRepository.findById(roomId);
    expect(room?.players.find(({ id }) => id === martaId)?.nickname).toBe('Jugador 4');
  });
});
