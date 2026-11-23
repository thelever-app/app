import type { NicknameReport, NicknameReportReason, NicknameReports } from '@thelever-app/game';
import type {
  NicknameReportReason as ModerationNicknameReportReason,
  ReceiveNicknameReport,
} from '@thelever-app/moderation/published';

/** Each reason of Game as Moderation names it. */
const MODERATION_REASONS: Readonly<Record<NicknameReportReason, ModerationNicknameReportReason>> = {
  offensive: 'offensive',
  impersonation: 'impersonation',
  illegal: 'illegal',
  other: 'other',
};

/**
 * The anticorruption layer between Game and Moderation for the reports of nicknames: hands
 * Moderation, through the command it publishes, who goes by the nickname and who reports it.
 */
export class ModerationNicknameReports implements NicknameReports {
  readonly #receiveNicknameReport: ReceiveNicknameReport;

  constructor(receiveNicknameReport: ReceiveNicknameReport) {
    this.#receiveNicknameReport = receiveNicknameReport;
  }

  async report({ nickname, owner, reason, comment, identity, at }: NicknameReport): Promise<void> {
    await this.#receiveNicknameReport.execute({
      nickname,
      owner,
      reason: MODERATION_REASONS[reason],
      comment,
      identity,
      reportedAt: at,
    });
  }
}
