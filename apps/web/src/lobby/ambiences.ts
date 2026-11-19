import type { AmbienceDto, AmbienceOrCustomDto } from '@thelever-app/protocol';
import type { IconName } from '../components/icon.tsx';

/** The ambiences in the order the screens offer them. */
export const AMBIENCES: readonly AmbienceDto[] = ['classic', 'spicy', 'no-filter'];

/** The symbol of each ambience, and of a configuration that is none. */
export const AMBIENCE_ICONS: Readonly<Record<AmbienceOrCustomDto, IconName>> = {
  classic: 'diversity',
  spicy: 'localFireDepartment',
  'no-filter': 'visibilityOff',
  custom: 'tune',
};

/** Whether the ambience is only for people 18 or over. */
export function isForAdults(ambience: AmbienceDto): boolean {
  return ambience !== 'classic';
}
