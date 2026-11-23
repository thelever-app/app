import type { DilemmaLikes } from '../ports/dilemma-likes.port.ts';

/** A like as the file a player downloads shows it. */
export interface LikeData {
  readonly dilemmaId: string;
  readonly givenIn: 'game' | 'catalog';
  readonly at: string;
}

/**
 * The likes of an identity, which outlive the rooms. The game data of the rooms still kept are
 * not in it: they are deleted within 24 hours of the room closing, before any request by email
 * can be answered.
 */
export interface ExportLikes {
  execute(identity: string): Promise<readonly LikeData[] | undefined>;
}

export class ExportLikesUseCase implements ExportLikes {
  readonly #likes: DilemmaLikes;

  constructor(likes: DilemmaLikes) {
    this.#likes = likes;
  }

  async execute(identity: string): Promise<readonly LikeData[] | undefined> {
    const likes = await this.#likes.likesOf(identity);
    if (likes.length === 0) return undefined;
    return likes.map(({ dilemmaId, givenIn, at }) => ({
      dilemmaId,
      givenIn,
      at: at.toISOString(),
    }));
  }
}

/** Deleting the data of an identity takes back all its likes; withdrawing the game consent does not. */
export interface ForgetLikes {
  execute(identity: string): Promise<void>;
}

export class ForgetLikesUseCase implements ForgetLikes {
  readonly #likes: DilemmaLikes;

  constructor(likes: DilemmaLikes) {
    this.#likes = likes;
  }

  async execute(identity: string): Promise<void> {
    await this.#likes.forgetAllOf(identity);
  }
}
