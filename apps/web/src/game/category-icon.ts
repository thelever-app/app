import type { CategoryDto } from '@thelever-app/protocol';
import type { IconName } from '../components/icon.tsx';

/** The icon each category of dilemmas shows with its name. */
export const CATEGORY_ICONS: Readonly<Record<CategoryDto, IconName>> = {
  'life-and-death': 'ecgHeart',
  honesty: 'verified',
  loyalty: 'handshake',
  justice: 'balance',
  'love-and-relationships': 'favorite',
  'work-and-money': 'payments',
  'technology-and-the-future': 'smartToy',
};
