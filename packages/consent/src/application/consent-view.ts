import type { Acceptances } from '../domain/entities/acceptances.ts';
import {
  currentVersionOf,
  type LegalDocument,
  type PublishedVersions,
} from '../domain/vos/legal-document.vo.ts';

/** What the rest of the app reads of the documents an identity accepted. */
export interface ConsentView {
  /** Still to accept before playing, in the order they are asked for. */
  readonly pending: readonly LegalDocument[];
  /** Of those, the ones accepted before in a version that is no longer enough. */
  readonly changed: readonly LegalDocument[];
  /** The version of each document that is accepted now. */
  readonly current: Readonly<Record<LegalDocument, number>>;
  /** The version of the game consent it gave last, which seals its answers. */
  readonly gameConsentVersion: number | undefined;
}

export function viewOf(acceptances: Acceptances, published: PublishedVersions): ConsentView {
  return {
    pending: acceptances.pending(published),
    changed: acceptances.changed(published),
    current: {
      'terms-of-use': currentVersionOf('terms-of-use', published),
      'game-consent': currentVersionOf('game-consent', published),
    },
    gameConsentVersion: acceptances.versionOf('game-consent'),
  };
}
