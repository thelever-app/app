import type { FirstAccess, FirstAccessStep } from '../domain/entities/first-access.ts';
import { monthOfBirthAskedFrom } from '../domain/vos/declared-age.vo.ts';
import type { Region } from '../domain/vos/region.vo.ts';

/** What the rest of the app reads of a first access, at a given moment. */
export interface FirstAccessView {
  readonly region: Region;
  readonly step: FirstAccessStep;
  readonly underEighteen: boolean;
  /** The earliest year of birth for which declaring the age also asks for the month. */
  readonly monthOfBirthAskedFrom: number;
}

export function viewOf(firstAccess: FirstAccess, now: Date): FirstAccessView {
  return {
    region: firstAccess.region,
    step: firstAccess.step(now),
    underEighteen: firstAccess.isUnderEighteen(now),
    monthOfBirthAskedFrom: monthOfBirthAskedFrom(now),
  };
}
