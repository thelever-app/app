import {
  DEFAULT_ROUNDS,
  type DilemmaLanguage,
  RoomSettingsVO,
  type RoomSettingsSnapshot,
  type RoomVariant,
  type TimePerDilemmaSeconds,
} from './room-settings.vo.ts';
import { randomRound, type RoundContent, type RoundSnapshot } from './round.vo.ts';

/**
 * The presets of a room (glossary, «Ambiente»): nothing in them that the settings cannot set by
 * hand. The room does not keep which one it was made with: it is told from its configuration.
 */
export const AMBIENCES = ['classic', 'spicy', 'no-filter'] as const;

export type Ambience = (typeof AMBIENCES)[number];

/** A configuration that is none of the ambiences (glossary, «Personalizada»). */
export type AmbienceOrCustom = Ambience | 'custom';

/** What choosing an ambience keeps of the configuration it had. */
export interface KeptSettings {
  readonly dilemmaLanguage: DilemmaLanguage;
  readonly timePerDilemmaSeconds: TimePerDilemmaSeconds;
  readonly newDilemmas: boolean;
}

/** What a new room keeps apart from its ambience: 60 seconds per dilemma and new dilemmas. */
export function keptForANewRoom(dilemmaLanguage: string): KeptSettings {
  return {
    dilemmaLanguage: dilemmaLanguage as DilemmaLanguage,
    timePerDilemmaSeconds: 60,
    newDilemmas: true,
  };
}

interface Preset {
  readonly variant: RoomVariant;
  readonly adultsOnly: boolean;
  readonly compromisingDilemmas: boolean;
  /** The content of each of its 8 random rounds from every category, in order. */
  readonly contents: readonly RoundContent[];
}

const PRESETS: Readonly<Record<Ambience, Preset>> = {
  classic: {
    variant: 'nominal',
    adultsOnly: false,
    compromisingDilemmas: false,
    contents: Array.from({ length: DEFAULT_ROUNDS }, () => 'any'),
  },
  spicy: {
    variant: 'nominal',
    adultsOnly: true,
    compromisingDilemmas: false,
    contents: Array.from({ length: DEFAULT_ROUNDS }, (_, index) =>
      index % 2 === 1 ? 'adults-only' : 'any',
    ),
  },
  'no-filter': {
    variant: 'anonymous',
    adultsOnly: true,
    compromisingDilemmas: true,
    contents: Array.from(
      { length: DEFAULT_ROUNDS },
      (_, index) => (['any', 'compromising', 'adults-only'] as const)[index % 3]!,
    ),
  },
};

/** The configuration of the ambience, keeping the language, the time per dilemma and new dilemmas. */
export function settingsOf(ambience: Ambience, kept: KeptSettings): RoomSettingsVO {
  const { contents, ...preset } = PRESETS[ambience];
  return new RoomSettingsVO({
    ...preset,
    ...kept,
    rounds: contents.map((content, index) => randomRound(index + 1, content)),
  });
}

/**
 * The ambience whose configuration the room has, or custom: its variant, adults only, compromising
 * dilemmas and its rounds, but not the language, the time or new dilemmas. Round 1 may play a
 * specific dilemma, as a room made from the public web does, and still be of the ambience.
 */
export function ambienceOf(settings: RoomSettingsVO): AmbienceOrCustom {
  const snapshot = settings.toSnapshot();
  return AMBIENCES.find((ambience) => matches(snapshot, PRESETS[ambience])) ?? 'custom';
}

function matches(settings: RoomSettingsSnapshot, preset: Preset): boolean {
  return (
    settings.variant === preset.variant &&
    settings.adultsOnly === preset.adultsOnly &&
    settings.compromisingDilemmas === preset.compromisingDilemmas &&
    settings.rounds.length === preset.contents.length &&
    settings.rounds.every((round, index) => follows(round, preset.contents[index]!, index))
  );
}

function follows(round: RoundSnapshot, content: RoundContent, index: number): boolean {
  if (round.origin === 'specific') return index === 0;
  return round.origin === 'random' && round.categories === null && round.content === content;
}
