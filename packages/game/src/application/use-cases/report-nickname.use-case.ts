import { PlayerNotInRoomError } from '../../domain/errors/player-not-in-room.error.ts';
import type { Clock } from '../../domain/ports/clock.port.ts';
import { InvalidReportReasonError } from '../errors/invalid-report-reason.error.ts';
import {
  NICKNAME_REPORT_REASONS,
  type NicknameReportReason,
  type NicknameReports,
} from '../ports/nickname-reports.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findRoom } from './find-room.ts';

export interface ReportNicknameInput {
  readonly roomId: string;
  /** Who reports. */
  readonly playerId: string;
  /** Whose nickname, another player of the room. */
  readonly reportedPlayerId: string;
  readonly reason: string;
  readonly comment?: string | null;
}

/**
 * A player reports the nickname of another player of the room to Moderation, from the menu of
 * their avatar, in the lobby or in the reveal. Nothing changes in the room: nobody else knows.
 */
export class ReportNicknameUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #reports: NicknameReports;
  readonly #clock: Clock;

  constructor(ports: {
    readonly roomRepository: RoomRepository;
    readonly reports: NicknameReports;
    readonly clock: Clock;
  }) {
    this.#roomRepository = ports.roomRepository;
    this.#reports = ports.reports;
    this.#clock = ports.clock;
  }

  async execute({
    roomId,
    playerId,
    reportedPlayerId,
    reason,
    comment,
  }: ReportNicknameInput): Promise<void> {
    if (!(NICKNAME_REPORT_REASONS as readonly string[]).includes(reason)) {
      throw new InvalidReportReasonError(reason);
    }
    const room = await findRoom(this.#roomRepository, roomId);
    const player = room.players.find(({ id }) => id === playerId);
    if (!player) throw new PlayerNotInRoomError(playerId);
    const reported = room.players.find(({ id }) => id === reportedPlayerId);
    if (!reported || reported.id === player.id) throw new PlayerNotInRoomError(reportedPlayerId);
    await this.#reports.report({
      nickname: reported.nickname,
      owner: reported.identity,
      reason: reason as NicknameReportReason,
      comment: comment?.trim() || null,
      identity: player.identity,
      at: this.#clock.now(),
    });
  }
}
