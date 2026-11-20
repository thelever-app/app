import type { ConsentView, LegalDocument } from '@thelever-app/consent/published';
import type { FirstAccessView, Region } from '@thelever-app/identity/published';

/**
 * Where the whole first access of an identity is, from Identity and Consent: stopped in a blocked
 * country or under the minimum age, waiting for the age, waiting for the legal documents, or done.
 */
export type FirstAccessStep =
  'blocked-country' | 'age' | 'under-minimum-age' | 'documents' | 'done';

export interface FirstAccessStatus {
  readonly region: Region;
  readonly step: FirstAccessStep;
  /** The documents still to accept, in the order they are asked for. */
  readonly pending: readonly LegalDocument[];
  /** Of those, the ones accepted before in a version that is no longer enough. */
  readonly changed: readonly LegalDocument[];
  /** The version of each document the app has to show. */
  readonly current: Readonly<Record<LegalDocument, number>>;
  readonly underEighteen: boolean;
  /** The earliest year of birth for which declaring the age also asks for the month. */
  readonly monthOfBirthAskedFrom: number;
}

/** The step of Identity first; past it, the documents. */
export function statusOf(identity: FirstAccessView, consent: ConsentView): FirstAccessStatus {
  const { region, underEighteen, monthOfBirthAskedFrom } = identity;
  const step =
    identity.step !== 'done' ? identity.step : consent.pending.length > 0 ? 'documents' : 'done';
  return {
    region,
    step,
    pending: consent.pending,
    changed: consent.changed,
    current: consent.current,
    underEighteen,
    monthOfBirthAskedFrom,
  };
}
