import { DuplicateDilemmaError } from '../errors/duplicate-dilemma.error.ts';
import { InvalidRoomSettingError } from '../errors/invalid-room-setting.error.ts';
import { isCategory } from './category.vo.ts';
import {
  CONTENT_AGES,
  CONTENT_COMPROMISING,
  DILEMMA_ORIGINS,
  type RoundSnapshot,
} from './round.vo.ts';

/** The languages of the app, in which a room can play its dilemmas. */
export const DILEMMA_LANGUAGES = ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca'] as const;
/** How long each round gives to answer its dilemma; when it runs out, the dilemma is revealed. */
export const TIMES_PER_DILEMMA_IN_SECONDS = [30, 45, 60, 90] as const;
/** A game plays from 1 to 12 rounds; the ambiences set 8 random ones from every category. */
export const MINIMUM_ROUNDS = 1;
/** The highest id a round may have: what the protocol and the database keep. */
export const MAXIMUM_ROUND_ID = 32_767;
export const MAXIMUM_ROUNDS = 12;
export const DEFAULT_ROUNDS = 8;

/** Nominal: everyone sees who voted what and predicts. Anonymous: only votes, nobody sees anyone's. */
export type RoomVariant = 'nominal' | 'anonymous';
export type DilemmaLanguage = (typeof DILEMMA_LANGUAGES)[number];
export type TimePerDilemmaSeconds = (typeof TIMES_PER_DILEMMA_IN_SECONDS)[number];

export interface RoomSettingsSnapshot {
  readonly variant: RoomVariant;
  readonly adultsOnly: boolean;
  /** Whether the games may include compromising dilemmas: only in an anonymous room. */
  readonly compromisingDilemmas: boolean;
  readonly dilemmaLanguage: DilemmaLanguage;
  /** The rounds of the game, in the order it plays them. */
  readonly rounds: readonly RoundSnapshot[];
  readonly timePerDilemmaSeconds: TimePerDilemmaSeconds;
  /** Whether the random rounds keep room for dilemmas in exploration. */
  readonly newDilemmas: boolean;
}

/** How the host sets up the games of the room. It lasts across rematches; each game copies it. */
export class RoomSettingsVO {
  readonly #settings: RoomSettingsSnapshot;

  constructor(settings: RoomSettingsSnapshot) {
    if (settings.variant !== 'nominal' && settings.variant !== 'anonymous') {
      throw new InvalidRoomSettingError('variant', settings.variant);
    }
    if (!(DILEMMA_LANGUAGES as readonly string[]).includes(settings.dilemmaLanguage)) {
      throw new InvalidRoomSettingError('dilemma language', settings.dilemmaLanguage);
    }
    if (
      !(TIMES_PER_DILEMMA_IN_SECONDS as readonly number[]).includes(settings.timePerDilemmaSeconds)
    ) {
      throw new InvalidRoomSettingError('time per dilemma', settings.timePerDilemmaSeconds);
    }
    if (settings.compromisingDilemmas && settings.variant !== 'anonymous') {
      throw new InvalidRoomSettingError('compromising dilemmas', settings.variant);
    }
    this.#settings = { ...settings, rounds: checkedRounds(settings.rounds, settings) };
  }

  get variant(): RoomVariant {
    return this.#settings.variant;
  }

  get adultsOnly(): boolean {
    return this.#settings.adultsOnly;
  }

  get dilemmaLanguage(): DilemmaLanguage {
    return this.#settings.dilemmaLanguage;
  }

  get rounds(): readonly RoundSnapshot[] {
    return this.#settings.rounds.map(copyRound);
  }

  get timePerDilemmaSeconds(): TimePerDilemmaSeconds {
    return this.#settings.timePerDilemmaSeconds;
  }

  get newDilemmas(): boolean {
    return this.#settings.newDilemmas;
  }

  /** The highest minimum age the dilemmas of the room may have. */
  get maximumMinimumAge(): 16 | 18 {
    return this.#settings.adultsOnly ? 18 : 16;
  }

  get compromisingDilemmas(): boolean {
    return this.#settings.compromisingDilemmas;
  }

  /** New settings with the changes; what is not changed stays. */
  with(changes: Partial<RoomSettingsSnapshot>): RoomSettingsVO {
    return new RoomSettingsVO({ ...this.#settings, ...changes });
  }

  toSnapshot(): RoomSettingsSnapshot {
    return { ...this.#settings, rounds: this.rounds };
  }
}

/**
 * From 1 to 12 rounds, each with an id of its own and a known origin; a random one, with known
 * categories and a content the room allows, and a dilemma in one round only.
 */
function checkedRounds(
  rounds: readonly RoundSnapshot[],
  { adultsOnly, compromisingDilemmas }: RoomSettingsSnapshot,
): RoundSnapshot[] {
  if (rounds.length < MINIMUM_ROUNDS || rounds.length > MAXIMUM_ROUNDS) {
    throw new InvalidRoomSettingError('number of rounds', rounds.length);
  }
  const ids = new Set<number>();
  const dilemmaIds = new Set<string>();
  return rounds.map((round) => {
    if (
      !Number.isInteger(round.id) ||
      round.id < 1 ||
      round.id > MAXIMUM_ROUND_ID ||
      ids.has(round.id)
    ) {
      throw new InvalidRoomSettingError('round id', round.id);
    }
    ids.add(round.id);
    if (!(DILEMMA_ORIGINS as readonly string[]).includes(round.origin)) {
      throw new InvalidRoomSettingError('dilemma origin', round.origin);
    }
    if (round.origin === 'random') {
      const { categories } = round;
      if (categories !== null) {
        const unknown = categories.find((category) => !isCategory(category));
        if (categories.length === 0 || unknown !== undefined) {
          throw new InvalidRoomSettingError('category', unknown ?? 'none');
        }
      }
      // A known age and compromising, each any where the room does not allow it.
      const { age, compromising } = round.content ?? {};
      const allowed =
        (CONTENT_AGES as readonly unknown[]).includes(age) &&
        (CONTENT_COMPROMISING as readonly unknown[]).includes(compromising) &&
        (age === 'any' || adultsOnly) &&
        (compromising === 'any' || compromisingDilemmas);
      if (!allowed) {
        throw new InvalidRoomSettingError('content of a round', `${age} ${compromising}`);
      }
    }
    if (round.origin === 'specific') {
      const { dilemmaId } = round.dilemma ?? {};
      if (typeof dilemmaId !== 'string' || dilemmaId.trim() === '') {
        throw new InvalidRoomSettingError('dilemma of a specific round', dilemmaId);
      }
      if (dilemmaIds.has(dilemmaId)) throw new DuplicateDilemmaError(dilemmaId);
      dilemmaIds.add(dilemmaId);
    }
    return copyRound(round);
  });
}

function copyRound(round: RoundSnapshot): RoundSnapshot {
  switch (round.origin) {
    case 'random':
      return {
        id: round.id,
        origin: 'random',
        categories: round.categories && [...new Set(round.categories)],
        content: { age: round.content.age, compromising: round.content.compromising },
      };
    case 'specific':
      return { id: round.id, origin: 'specific', dilemma: { ...round.dilemma } };
    case 'players':
      return { id: round.id, origin: 'players' };
  }
}
