import {
  type AnalyticsEventRepository,
  EraseAnalyticsDataUseCase,
  ExportAnalyticsDataUseCase,
  RecordAnalyticsEventUseCase,
} from '@thelever-app/analytics';
import {
  type AcceptanceRepository,
  type AnalyticsObjectionRepository,
  EraseConsentDataUseCase,
  ExportConsentDataUseCase,
  GetConsentUseCase,
  LiftAnalyticsObjectionUseCase,
  ObjectsToAnalyticsUseCase,
  ObjectToAnalyticsUseCase,
  type PublishedVersions,
  WithdrawGameConsentUseCase,
} from '@thelever-app/consent';
import {
  EraseDilemmasDataUseCase,
  ExportDilemmasDataUseCase,
  type WorldResultRepository,
} from '@thelever-app/dilemmas';
import {
  type DilemmaLikes,
  EraseGameDataUseCase,
  ExportLikesUseCase,
  ForgetLikesUseCase,
  type GameRepository,
  type PlayerNotifier,
  type RoomRepository,
} from '@thelever-app/game';
import {
  CarryOutDataRequestUseCase,
  type DataDeletionRepository,
  DeletionsToEraseUseCase,
  ErasePersonalDataUseCase,
  ExportPersonalDataUseCase,
  type FirstAccessRepository,
  FirstAccessPersonalData,
  GetRequestCodeUseCase,
  LogGameConsentWithdrawalUseCase,
  type PersonalDataStore,
  RequestDataDeletionUseCase,
} from '@thelever-app/identity';
import { ObjectionsInConsent } from '@thelever-app/integrations/analytics';
import {
  AnalyticsEventsInAnalytics,
  DeletionLogInIdentity,
  GameDataInGame,
} from '@thelever-app/integrations/consent';
import { AnalyticsUsage } from '@thelever-app/integrations/game';
import {
  analyticsPersonalData,
  consentPersonalData,
  dilemmasPersonalData,
  GameDataOfIdentityInGame,
  gamePersonalData,
  IdentitiesOfEmailInModeration,
  moderationPersonalData,
} from '@thelever-app/integrations/identity';
import {
  EraseModerationDataUseCase,
  ExportModerationDataUseCase,
  type IssueRepository,
  type ModerationNoticeRepository,
  SendersWithEmailUseCase,
} from '@thelever-app/moderation';

/** Every store of personal data, wherever the server and the jobs keep them. */
export interface PrivacyDependencies {
  readonly firstAccesses: FirstAccessRepository;
  readonly acceptances: AcceptanceRepository;
  readonly analyticsObjections: AnalyticsObjectionRepository;
  readonly analyticsEvents: AnalyticsEventRepository;
  readonly dataDeletions: DataDeletionRepository;
  readonly worldResults: WorldResultRepository;
  readonly likes: DilemmaLikes;
  readonly roomRepository: RoomRepository;
  readonly gameRepository: GameRepository;
  readonly issues: IssueRepository;
  readonly moderationNotices: ModerationNoticeRepository;
  readonly notifier: PlayerNotifier;
  readonly idGenerator: { generate(): string };
  readonly clock: { now(): Date };
  readonly published: PublishedVersions;
}

/**
 * What the room server does of the rights of the players over their data: the code for requests
 * by email, withdrawing the game consent, objecting to product analytics and asking for the
 * deletion; and the product analytics, which the objection stops.
 */
export interface PrivacyUseCases {
  readonly getRequestCode: GetRequestCodeUseCase;
  readonly getConsent: GetConsentUseCase;
  readonly withdrawGameConsent: WithdrawGameConsentUseCase;
  readonly objectToAnalytics: ObjectToAnalyticsUseCase;
  readonly liftAnalyticsObjection: LiftAnalyticsObjectionUseCase;
  readonly objectsToAnalytics: ObjectsToAnalyticsUseCase;
  readonly recordAnalyticsEvent: RecordAnalyticsEventUseCase;
  /** What Game records of its use, as analytics events. */
  readonly usage: AnalyticsUsage;
  readonly requestDataDeletion: RequestDataDeletionUseCase;
}

/**
 * What the jobs do with the personal data stores: the deletion job deletes what the deletion log
 * asks for, and the job of the requests by email carries them out.
 */
export interface PersonalDataUseCases {
  readonly deletionsToErase: DeletionsToEraseUseCase;
  readonly erasePersonalData: ErasePersonalDataUseCase;
  readonly carryOutDataRequest: CarryOutDataRequestUseCase;
}

function eraseGameDataOf({
  roomRepository,
  gameRepository,
  notifier,
  clock,
}: PrivacyDependencies): EraseGameDataUseCase {
  return new EraseGameDataUseCase(roomRepository, gameRepository, notifier, clock);
}

export function privacyUseCases(dependencies: PrivacyDependencies): PrivacyUseCases {
  const { firstAccesses, acceptances, analyticsObjections, analyticsEvents, dataDeletions } =
    dependencies;
  const { idGenerator, clock, published } = dependencies;
  const objectsToAnalytics = new ObjectsToAnalyticsUseCase(analyticsObjections);
  const recordAnalyticsEvent = new RecordAnalyticsEventUseCase(
    analyticsEvents,
    new ObjectionsInConsent(objectsToAnalytics),
    idGenerator,
    clock,
  );
  return {
    getRequestCode: new GetRequestCodeUseCase(firstAccesses),
    getConsent: new GetConsentUseCase(acceptances, published),
    withdrawGameConsent: new WithdrawGameConsentUseCase(
      acceptances,
      published,
      clock,
      new GameDataInGame(eraseGameDataOf(dependencies)),
      new DeletionLogInIdentity(
        new LogGameConsentWithdrawalUseCase(dataDeletions, idGenerator, clock),
      ),
    ),
    objectToAnalytics: new ObjectToAnalyticsUseCase(
      analyticsObjections,
      clock,
      new AnalyticsEventsInAnalytics(new EraseAnalyticsDataUseCase(analyticsEvents)),
    ),
    liftAnalyticsObjection: new LiftAnalyticsObjectionUseCase(analyticsObjections),
    objectsToAnalytics,
    recordAnalyticsEvent,
    usage: new AnalyticsUsage(recordAnalyticsEvent),
    requestDataDeletion: new RequestDataDeletionUseCase(dataDeletions, idGenerator, clock),
  };
}

/**
 * The personal data stores of every context and, the last, the user of Firebase Auth behind each
 * identity: until every store is done, the identity can still be named in the log.
 */
export function personalDataUseCases(
  dependencies: PrivacyDependencies,
  authUsers: PersonalDataStore,
): PersonalDataUseCases {
  const { firstAccesses, acceptances, analyticsObjections, analyticsEvents, dataDeletions } =
    dependencies;
  const { worldResults, likes, issues, moderationNotices, idGenerator, clock } = dependencies;
  const eraseGameData = eraseGameDataOf(dependencies);
  const stores: PersonalDataStore[] = [
    new FirstAccessPersonalData(firstAccesses),
    consentPersonalData(
      new ExportConsentDataUseCase(acceptances, analyticsObjections),
      new EraseConsentDataUseCase(analyticsObjections),
    ),
    dilemmasPersonalData(
      new ExportDilemmasDataUseCase(worldResults),
      new EraseDilemmasDataUseCase(worldResults),
    ),
    gamePersonalData(new ExportLikesUseCase(likes), eraseGameData, new ForgetLikesUseCase(likes)),
    moderationPersonalData(
      new ExportModerationDataUseCase({ issues, notices: moderationNotices }),
      new EraseModerationDataUseCase({ issues, notices: moderationNotices }),
    ),
    analyticsPersonalData(
      new ExportAnalyticsDataUseCase(analyticsEvents),
      new EraseAnalyticsDataUseCase(analyticsEvents),
    ),
    authUsers,
  ];
  return {
    deletionsToErase: new DeletionsToEraseUseCase(dataDeletions),
    erasePersonalData: new ErasePersonalDataUseCase(
      dataDeletions,
      stores,
      new GameDataOfIdentityInGame(eraseGameData),
      clock,
    ),
    carryOutDataRequest: new CarryOutDataRequestUseCase({
      firstAccesses,
      identitiesOfEmail: new IdentitiesOfEmailInModeration(new SendersWithEmailUseCase(issues)),
      requestDeletion: new RequestDataDeletionUseCase(dataDeletions, idGenerator, clock),
      exportData: new ExportPersonalDataUseCase(stores),
    }),
  };
}
