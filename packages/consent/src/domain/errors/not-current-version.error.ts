import type { LegalDocument } from '../vos/legal-document.vo.ts';

/** Only the version published now can be accepted: an app that shows an older one must reload it. */
export class NotCurrentVersionError extends Error {
  constructor(document: LegalDocument, version: number) {
    super(`version ${version} of ${document} is not the current one`);
    this.name = 'NotCurrentVersionError';
  }
}
