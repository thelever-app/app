import type { Logger } from '@thelever-app/db';
import {
  type DilemmaRepository,
  FindDilemmaOfReferenceUseCase,
  GetDilemmasUseCase,
  ModerateDilemmaUseCase,
} from '@thelever-app/dilemmas';
import { CatalogDilemmasForModeration } from '@thelever-app/integrations/moderation';
import {
  type Clock,
  GetModerationNoticesUseCase,
  type IdGenerator,
  type IssueRepository,
  type ModerationNoticeRepository,
  type Outbox,
  type ReceiveDilemmaReport,
  ReceiveDilemmaReportUseCase,
  ReceiveIllegalContentNoticeUseCase,
  type ReceiveNicknameReport,
  ReceiveNicknameReportUseCase,
  SeeModerationNoticeUseCase,
} from '@thelever-app/moderation';
import { LanguageDto } from '@thelever-app/protocol';
import { LoggedDilemmaReports } from '../telemetry/logged-dilemma-reports.ts';

/** What Moderation keeps and reads, on the storage of the room server. */
export interface ModerationDependencies {
  readonly issues: IssueRepository;
  readonly outbox: Outbox;
  readonly moderationNotices: ModerationNoticeRepository;
  readonly dilemmaRepository: DilemmaRepository;
  readonly idGenerator: IdGenerator;
  readonly clock: Clock;
  readonly logger: Logger;
}

/**
 * What the room server does of Moderation: it receives the reports of the games and the notices
 * of the web form, and gives each player their moderation notices. Sending the issues to the
 * moderation repository and reading the decisions is the job sync-moderation's.
 */
export interface ModerationUseCases {
  readonly receiveDilemmaReport: ReceiveDilemmaReport;
  readonly receiveNicknameReport: ReceiveNicknameReport;
  readonly receiveIllegalContentNotice: ReceiveIllegalContentNoticeUseCase;
  readonly getModerationNotices: GetModerationNoticesUseCase;
  readonly seeModerationNotice: SeeModerationNoticeUseCase;
}

/** The dilemmas of the catalog as Moderation sees them, every language of the app with them. */
export function catalogDilemmasForModeration(
  dilemmaRepository: DilemmaRepository,
): CatalogDilemmasForModeration {
  return new CatalogDilemmasForModeration({
    findDilemmaOfReference: new FindDilemmaOfReferenceUseCase(dilemmaRepository),
    getDilemmas: new GetDilemmasUseCase(dilemmaRepository),
    moderateDilemma: new ModerateDilemmaUseCase(dilemmaRepository, LanguageDto.options),
  });
}

export function moderationUseCases({
  issues,
  outbox,
  moderationNotices,
  dilemmaRepository,
  idGenerator,
  clock,
  logger,
}: ModerationDependencies): ModerationUseCases {
  const ports = {
    issues,
    outbox,
    dilemmas: catalogDilemmasForModeration(dilemmaRepository),
    idGenerator,
    clock,
  };
  return {
    receiveDilemmaReport: new LoggedDilemmaReports(new ReceiveDilemmaReportUseCase(ports), logger),
    receiveNicknameReport: new ReceiveNicknameReportUseCase(ports),
    receiveIllegalContentNotice: new ReceiveIllegalContentNoticeUseCase(ports),
    getModerationNotices: new GetModerationNoticesUseCase(moderationNotices),
    seeModerationNotice: new SeeModerationNoticeUseCase(moderationNotices, clock),
  };
}
