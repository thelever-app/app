import {
  EraseAnalyticsDataUseCase,
  ExportAnalyticsDataUseCase,
  RecordAnalyticsEventUseCase,
} from '@thelever-app/analytics';
import { InMemoryAnalyticsEventRepository } from '@thelever-app/analytics/in-memory';
import {
  AcceptDocumentUseCase,
  EraseConsentDataUseCase,
  ExportConsentDataUseCase,
  ObjectsToAnalyticsUseCase,
  type PublishedVersions,
} from '@thelever-app/consent';
import {
  InMemoryAcceptanceRepository,
  InMemoryAnalyticsObjectionRepository,
} from '@thelever-app/consent/in-memory';
import { EraseDilemmasDataUseCase, ExportDilemmasDataUseCase } from '@thelever-app/dilemmas';
import { InMemoryWorldResultRepository } from '@thelever-app/dilemmas/in-memory';
import { EraseGameDataUseCase, ExportLikesUseCase, ForgetLikesUseCase } from '@thelever-app/game';
import {
  InMemoryDilemmaLikes,
  InMemoryGameRepository,
  InMemoryPlayerNotifier,
  InMemoryRoomRepository,
  ManualClock,
} from '@thelever-app/game/in-memory';
import {
  DeletionsToEraseUseCase,
  ErasePersonalDataUseCase,
  ExportPersonalDataUseCase,
  FirstAccessPersonalData,
  OpenAppUseCase,
  RequestDataDeletionUseCase,
} from '@thelever-app/identity';
import {
  InMemoryDataDeletionRepository,
  InMemoryFirstAccessRepository,
} from '@thelever-app/identity/in-memory';
import {
  EraseModerationDataUseCase,
  ExportModerationDataUseCase,
  ReceiveDilemmaReportUseCase,
} from '@thelever-app/moderation';
import {
  InMemoryIssueRepository,
  InMemoryModerationNoticeRepository,
  InMemoryOutbox,
} from '@thelever-app/moderation/in-memory';
import { describe, expect, it } from 'vitest';
import { AnalyticsUsage } from '../../game/analytics-usage.ts';
import {
  analyticsPersonalData,
  consentPersonalData,
  dilemmasPersonalData,
  GameDataOfIdentityInGame,
  gamePersonalData,
  moderationPersonalData,
} from '../personal-data-stores.ts';

const PUBLISHED: PublishedVersions = [
  { document: 'terms-of-use', version: 1, asksAgain: true },
  { document: 'game-consent', version: 2, asksAgain: true },
];
const AT = new Date('2026-11-23T10:00:00Z');

function setUp() {
  const clock = new ManualClock(AT);
  let next = 0;
  const ids = { generate: () => `00000000-0000-4000-8000-${String(++next).padStart(12, '0')}` };
  const firstAccesses = new InMemoryFirstAccessRepository();
  const acceptances = new InMemoryAcceptanceRepository();
  const objections = new InMemoryAnalyticsObjectionRepository();
  const worldResults = new InMemoryWorldResultRepository();
  const likes = new InMemoryDilemmaLikes();
  const rooms = new InMemoryRoomRepository();
  const games = new InMemoryGameRepository();
  const issues = new InMemoryIssueRepository();
  const notices = new InMemoryModerationNoticeRepository();
  const events = new InMemoryAnalyticsEventRepository();
  const deletions = new InMemoryDataDeletionRepository();
  const eraseGameData = new EraseGameDataUseCase(rooms, games, new InMemoryPlayerNotifier(), clock);
  const stores = [
    new FirstAccessPersonalData(firstAccesses),
    consentPersonalData(
      new ExportConsentDataUseCase(acceptances, objections),
      new EraseConsentDataUseCase(objections),
    ),
    dilemmasPersonalData(
      new ExportDilemmasDataUseCase(worldResults),
      new EraseDilemmasDataUseCase(worldResults),
    ),
    gamePersonalData(new ExportLikesUseCase(likes), eraseGameData, new ForgetLikesUseCase(likes)),
    moderationPersonalData(
      new ExportModerationDataUseCase({ issues, notices }),
      new EraseModerationDataUseCase({ issues, notices }),
    ),
    analyticsPersonalData(
      new ExportAnalyticsDataUseCase(events),
      new EraseAnalyticsDataUseCase(events),
    ),
  ];
  const record = new RecordAnalyticsEventUseCase(
    events,
    { objects: (identity) => new ObjectsToAnalyticsUseCase(objections).execute(identity) },
    ids,
    clock,
  );
  return {
    openApp: new OpenAppUseCase(firstAccesses, clock, { integer: () => 7 }),
    accept: new AcceptDocumentUseCase(acceptances, PUBLISHED, clock),
    worldResults,
    likes,
    usage: new AnalyticsUsage(record),
    report: new ReceiveDilemmaReportUseCase({
      issues,
      outbox: new InMemoryOutbox(),
      idGenerator: ids,
      dilemmas: {
        dilemmaOf: async () => null,
        familyOf: async (dilemmaId) => [dilemmaId],
        textOf: async () => null,
        hide: async () => undefined,
        restore: async () => undefined,
        withdraw: async () => undefined,
      },
    }),
    requestDeletion: new RequestDataDeletionUseCase(deletions, ids, clock),
    toErase: new DeletionsToEraseUseCase(deletions),
    erase: new ErasePersonalDataUseCase(
      deletions,
      stores,
      new GameDataOfIdentityInGame(eraseGameData),
      clock,
    ),
    exportData: new ExportPersonalDataUseCase(stores),
  };
}

/** Ana opened the app, accepted, voted alone, liked a dilemma, reported one and created a room. */
async function anaPlayed(ports: ReturnType<typeof setUp>): Promise<void> {
  await ports.openApp.execute({ identity: 'uid-ana', country: 'ES' });
  await ports.accept.execute({ identity: 'uid-ana', document: 'terms-of-use', version: 1 });
  await ports.accept.execute({ identity: 'uid-ana', document: 'game-consent', version: 2 });
  await ports.worldResults.countVote('uid-ana', {
    dilemmaId: 'TestDilemma',
    version: 1,
    position: 0,
  });
  await ports.likes.like({
    identity: 'uid-ana',
    dilemmaId: 'TestDilemma',
    seal: {
      gameConsentVersion: '2',
      researchConsentVersion: null,
      commercialLicenceConsentVersion: null,
      underEighteen: false,
      objectsToAnalytics: false,
    },
    at: AT,
  });
  await ports.report.execute({
    dilemmaId: 'TestDilemma',
    version: 1,
    reason: 'offensive',
    comment: 'TestComment',
    language: 'es',
    identity: 'uid-ana',
    reportedAt: AT,
  });
  await ports.usage.record({ kind: 'room-created', identity: 'uid-ana', roomId: 'TestRoomId' });
}

describe('the personal data stores of every context', () => {
  it('should export a section of each store that keeps something of the player', async () => {
    // Arrange
    const ports = setUp();
    await anaPlayed(ports);

    // Act
    const exported = await ports.exportData.execute('uid-ana');

    // Assert
    expect(Object.keys(exported)).toEqual([
      'firstAccess',
      'consent',
      'dilemmas',
      'likes',
      'moderation',
      'analytics',
    ]);
  });

  it('should delete everything but the minimal record of the consent, and unlink the reports', async () => {
    // Arrange
    const ports = setUp();
    await anaPlayed(ports);
    await ports.requestDeletion.execute('uid-ana');

    // Act
    for (const id of await ports.toErase.execute({ again: false })) await ports.erase.execute(id);

    // Assert
    const exported = await ports.exportData.execute('uid-ana');
    expect(Object.keys(exported)).toEqual(['consent']);
    expect(exported['consent']).toMatchObject({ analyticsObjectedAt: null });
  });
});
