import assert from 'node:assert/strict';
import type { DilemmaLanguage, ReportReason } from '@thelever-app/game';

/** The languages as the scenarios name them. */
const LANGUAGES: Readonly<Record<string, DilemmaLanguage>> = {
  Spanish: 'es',
  English: 'en',
  French: 'fr',
  German: 'de',
  Italian: 'it',
  Portuguese: 'pt',
  Catalan: 'ca',
};

/** The reasons to report a dilemma as the scenarios write them. */
const REPORT_REASONS: Readonly<Record<string, ReportReason>> = {
  offensive: 'offensive',
  confusing: 'confusing',
  'badly translated': 'mistranslated',
  illegal: 'illegal',
  other: 'other',
};

/** The language a scenario names, such as «English». */
export function languageNamed(name: string): DilemmaLanguage {
  const language = LANGUAGES[name];
  assert.ok(language, `The steps do not know the language "${name}"`);
  return language;
}

/** The reason to report a dilemma a scenario writes, such as «badly translated». */
export function reportReasonNamed(text: string): ReportReason {
  const reason = REPORT_REASONS[text];
  assert.ok(reason, `The steps do not know the reason "${text}"`);
  return reason;
}
