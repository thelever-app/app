import type { LegalDocument } from '../vos/legal-document.vo.ts';

/** Only the game consent is withdrawn: the terms of use are what using the app is. */
export class NotWithdrawableError extends Error {
  constructor(document: LegalDocument) {
    super(`${document} cannot be withdrawn`);
    this.name = 'NotWithdrawableError';
  }
}
