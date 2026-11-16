import type { Languages } from '../pages/page.ts';
import { ca } from './ca.ts';
import { de } from './de.ts';
import { en } from './en.ts';
import { es } from './es.ts';
import { fr } from './fr.ts';
import { it } from './it.ts';
import { pt } from './pt.ts';

/** The languages of the public web with their texts, those of the app, in the order its menu shows them. */
export const LANGUAGES: Languages = new Map([
  ['es', es],
  ['en', en],
  ['fr', fr],
  ['de', de],
  ['it', it],
  ['pt', pt],
  ['ca', ca],
]);
