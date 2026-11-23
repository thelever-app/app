import type { EraseAnalyticsData, ExportAnalyticsData } from '@thelever-app/analytics/published';
import type { EraseConsentData, ExportConsentData } from '@thelever-app/consent/published';
import type { EraseDilemmasData, ExportDilemmasData } from '@thelever-app/dilemmas/published';
import type { EraseGameData, ExportLikes, ForgetLikes } from '@thelever-app/game/published';
import type {
  GameDataOfIdentity,
  IdentitiesOfEmail,
  PersonalDataStore,
} from '@thelever-app/identity';
import type {
  EraseModerationData,
  ExportModerationData,
  SendersWithEmail,
} from '@thelever-app/moderation/published';

/** What a context publishes to export and erase the data of an identity. */
interface Published {
  readonly export: { execute(identity: string): Promise<unknown> };
  readonly erase: { execute(identity: string): Promise<void> };
}

/** A personal data store of Identity on top of what another context publishes. */
class PublishedPersonalData implements PersonalDataStore {
  readonly section: string;
  readonly #published: Published;

  constructor(section: string, published: Published) {
    this.section = section;
    this.#published = published;
  }

  async export(identity: string): Promise<unknown> {
    return this.#published.export.execute(identity);
  }

  async erase(identity: string): Promise<void> {
    await this.#published.erase.execute(identity);
  }
}

/** The legal documents accepted, with their dates, and the objection to product analytics. */
export function consentPersonalData(
  exportData: ExportConsentData,
  erase: EraseConsentData,
): PersonalDataStore {
  return new PublishedPersonalData('consent', { export: exportData, erase });
}

/** The marks of the dilemmas voted alone. */
export function dilemmasPersonalData(
  exportData: ExportDilemmasData,
  erase: EraseDilemmasData,
): PersonalDataStore {
  return new PublishedPersonalData('dilemmas', { export: exportData, erase });
}

/** Reports, notices, the decisions on their nickname and their moderation notices. */
export function moderationPersonalData(
  exportData: ExportModerationData,
  erase: EraseModerationData,
): PersonalDataStore {
  return new PublishedPersonalData('moderation', { export: exportData, erase });
}

/** The analytics events. */
export function analyticsPersonalData(
  exportData: ExportAnalyticsData,
  erase: EraseAnalyticsData,
): PersonalDataStore {
  return new PublishedPersonalData('analytics', { export: exportData, erase });
}

/** The likes, which outlive the rooms, and the game data of the rooms still kept. */
export function gamePersonalData(
  exportLikes: ExportLikes,
  eraseGameData: EraseGameData,
  forgetLikes: ForgetLikes,
): PersonalDataStore {
  return new PublishedPersonalData('likes', {
    export: exportLikes,
    erase: {
      execute: async (identity) => {
        await eraseGameData.execute(identity);
        await forgetLikes.execute(identity);
      },
    },
  });
}

/** The game data that withdrawing the game consent deletes, in Game. */
export class GameDataOfIdentityInGame implements GameDataOfIdentity {
  readonly #eraseGameData: EraseGameData;

  constructor(eraseGameData: EraseGameData) {
    this.#eraseGameData = eraseGameData;
  }

  async erase(identity: string): Promise<void> {
    await this.#eraseGameData.execute(identity);
  }
}

/** Whoever sent a notice of the web form proves a request is theirs by its email, which Moderation keeps. */
export class IdentitiesOfEmailInModeration implements IdentitiesOfEmail {
  readonly #senders: SendersWithEmail;

  constructor(senders: SendersWithEmail) {
    this.#senders = senders;
  }

  async identitiesOf(email: string): Promise<readonly string[]> {
    return this.#senders.execute(email);
  }
}
