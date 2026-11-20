/**
 * The texts the first access asks for: the terms of use, which are accepted, and the game
 * consent, which is given. Both are versioned, and the version each identity accepted is kept.
 */
export const LEGAL_DOCUMENTS = ['terms-of-use', 'game-consent'] as const;

export type LegalDocument = (typeof LEGAL_DOCUMENTS)[number];

/** A version of a legal document that has been published. */
export interface LegalDocumentVersion {
  readonly document: LegalDocument;
  readonly version: number;
  /**
   * Whether it changes the document so much that who accepted an earlier version must accept it
   * again before playing: substantial terms or a consent that needs to be given again.
   */
  readonly asksAgain: boolean;
}

/** Every version of the legal documents ever published, in any order. */
export type PublishedVersions = readonly LegalDocumentVersion[];

/**
 * What has been published. The second game consent tells that a vote alone adds to the world
 * result and that only the mark of having voted is kept: a new purpose, so it is given again.
 */
export const PUBLISHED_VERSIONS: PublishedVersions = [
  { document: 'terms-of-use', version: 1, asksAgain: true },
  { document: 'game-consent', version: 1, asksAgain: true },
  { document: 'game-consent', version: 2, asksAgain: true },
];

/** The version that is accepted now. */
export function currentVersionOf(document: LegalDocument, published: PublishedVersions): number {
  return Math.max(0, ...versionsOf(document, published).map(({ version }) => version));
}

/** The earliest version that is still enough: the last one that asks to be accepted again. */
export function versionRequiredOf(document: LegalDocument, published: PublishedVersions): number {
  const asking = versionsOf(document, published).filter(({ asksAgain }) => asksAgain);
  return Math.max(0, ...asking.map(({ version }) => version));
}

function versionsOf(document: LegalDocument, published: PublishedVersions): LegalDocumentVersion[] {
  return published.filter((version) => version.document === document);
}
