import { InvalidRoomSettingError } from '../errors/invalid-room-setting.error.ts';

/** The languages of the app, in which a room can play its dilemmas. */
export const DILEMMA_LANGUAGES = ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca'] as const;
export const DILEMMA_COUNTS = [6, 8, 10, 12] as const;
/** How long each round gives to answer its dilemma; when it runs out, the dilemma is revealed. */
export const TIMES_PER_DILEMMA_IN_SECONDS = [30, 45, 60, 90] as const;
/** How many dilemmas each player may add in the lobby; none, and nobody adds any. */
export const DILEMMAS_PER_PLAYER = [0, 1, 2, 3] as const;

/** Nominal: everyone sees who voted what and predicts. Anonymous: only votes, nobody sees anyone's. */
export type RoomVariant = 'nominal' | 'anonymous';
export type DilemmaLanguage = (typeof DILEMMA_LANGUAGES)[number];
export type DilemmaCount = (typeof DILEMMA_COUNTS)[number];
export type TimePerDilemmaSeconds = (typeof TIMES_PER_DILEMMA_IN_SECONDS)[number];
export type DilemmasPerPlayer = (typeof DILEMMAS_PER_PLAYER)[number];

export interface RoomSettingsSnapshot {
  readonly variant: RoomVariant;
  readonly adultsOnly: boolean;
  readonly dilemmaLanguage: DilemmaLanguage;
  /**
   * The ids of the categories of Dilemmas a game by categories plays, which the room does not
   * check: null plays every category, and an empty list none, so only what the players add.
   */
  readonly categories: readonly string[] | null;
  readonly dilemmaCount: DilemmaCount;
  readonly timePerDilemmaSeconds: TimePerDilemmaSeconds;
  /** Whether a game by categories keeps room for dilemmas in exploration. */
  readonly newDilemmas: boolean;
  readonly dilemmasPerPlayer: DilemmasPerPlayer;
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
    const categories = settings.categories?.map((category) => category.trim()) ?? null;
    const blank = categories?.findIndex((category) => category === '') ?? -1;
    if (blank !== -1) throw new InvalidRoomSettingError('category', settings.categories?.[blank]);
    if (!(DILEMMA_COUNTS as readonly number[]).includes(settings.dilemmaCount)) {
      throw new InvalidRoomSettingError('number of dilemmas', settings.dilemmaCount);
    }
    if (
      !(TIMES_PER_DILEMMA_IN_SECONDS as readonly number[]).includes(settings.timePerDilemmaSeconds)
    ) {
      throw new InvalidRoomSettingError('time per dilemma', settings.timePerDilemmaSeconds);
    }
    if (!(DILEMMAS_PER_PLAYER as readonly number[]).includes(settings.dilemmasPerPlayer)) {
      throw new InvalidRoomSettingError('dilemmas per player', settings.dilemmasPerPlayer);
    }
    this.#settings = { ...settings, categories: categories && [...new Set(categories)] };
  }

  /** A nominal room for everyone, with every category and new dilemmas, where players cannot add any. */
  static defaults(dilemmaLanguage: string): RoomSettingsVO {
    return new RoomSettingsVO({
      variant: 'nominal',
      adultsOnly: false,
      dilemmaLanguage: dilemmaLanguage as DilemmaLanguage,
      categories: null,
      dilemmaCount: 8,
      timePerDilemmaSeconds: 60,
      newDilemmas: true,
      dilemmasPerPlayer: 0,
    });
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

  get categories(): readonly string[] | null {
    return this.#settings.categories && [...this.#settings.categories];
  }

  get dilemmaCount(): DilemmaCount {
    return this.#settings.dilemmaCount;
  }

  get timePerDilemmaSeconds(): TimePerDilemmaSeconds {
    return this.#settings.timePerDilemmaSeconds;
  }

  get newDilemmas(): boolean {
    return this.#settings.newDilemmas;
  }

  get dilemmasPerPlayer(): DilemmasPerPlayer {
    return this.#settings.dilemmasPerPlayer;
  }

  /** The highest minimum age the dilemmas of the room may have. */
  get maximumMinimumAge(): 16 | 18 {
    return this.#settings.adultsOnly ? 18 : 16;
  }

  /** New settings with the changes; what is not changed stays. */
  with(changes: Partial<RoomSettingsSnapshot>): RoomSettingsVO {
    return new RoomSettingsVO({ ...this.#settings, ...changes });
  }

  toSnapshot(): RoomSettingsSnapshot {
    return { ...this.#settings, categories: this.categories };
  }
}
