import {
  GAME_LIKE_WEIGHT,
  type DilemmaLike,
  type DilemmaLikes,
} from '../../application/ports/dilemma-likes.port.ts';

/** Keeps the likes it gets, one per identity and dilemma, for tests and the simulated room. */
export class InMemoryDilemmaLikes implements DilemmaLikes {
  readonly #likes = new Map<string, DilemmaLike & { readonly weight: number }>();

  async like(like: DilemmaLike): Promise<void> {
    const key = keyOf(like.identity, like.dilemmaId);
    if (this.#likes.get(key)?.weight === GAME_LIKE_WEIGHT) return;
    this.#likes.set(key, { ...like, seal: { ...like.seal }, weight: GAME_LIKE_WEIGHT });
  }

  async unlike(identity: string, dilemmaId: string): Promise<void> {
    this.#likes.delete(keyOf(identity, dilemmaId));
  }

  async hasLiked(identity: string, dilemmaId: string): Promise<boolean> {
    return this.#likes.has(keyOf(identity, dilemmaId));
  }

  async likesOf(
    identity: string,
  ): Promise<readonly (DilemmaLike & { readonly givenIn: 'game' | 'catalog' })[]> {
    return [...this.#likes.values()]
      .filter((like) => like.identity === identity)
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .map(({ weight, ...like }) => ({
        ...like,
        seal: { ...like.seal },
        givenIn: weight === GAME_LIKE_WEIGHT ? 'game' : 'catalog',
      }));
  }

  async forgetAllOf(identity: string): Promise<void> {
    for (const [key, like] of this.#likes) {
      if (like.identity === identity) this.#likes.delete(key);
    }
  }

  /** What the likes of a dilemma weigh in all, as the rating counts them. */
  weightOf(dilemmaId: string): number {
    return [...this.#likes.values()]
      .filter((like) => like.dilemmaId === dilemmaId)
      .reduce((total, { weight }) => total + weight, 0);
  }

  get likes(): readonly (DilemmaLike & { readonly weight: number })[] {
    return [...this.#likes.values()].map((like) => ({ ...like, seal: { ...like.seal } }));
  }
}

function keyOf(identity: string, dilemmaId: string): string {
  return `${identity}\u0000${dilemmaId}`;
}
