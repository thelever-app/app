import {
  familyOf,
  type FindDilemmaOfReference,
  type GetDilemmas,
  type ModerateDilemma,
} from '@thelever-app/dilemmas/published';
import type { ModeratedDilemmas } from '@thelever-app/moderation';

/**
 * The anticorruption layer between Moderation and Dilemmas (ADR 0001): what Moderation needs of
 * the dilemmas, through what Dilemmas publishes. In the command of Moderation, so in PostgreSQL a
 * dilemma is hidden or withdrawn with the issue that decided it.
 */
export class CatalogDilemmasForModeration implements ModeratedDilemmas {
  readonly #findDilemmaOfReference: FindDilemmaOfReference;
  readonly #getDilemmas: GetDilemmas;
  readonly #moderateDilemma: ModerateDilemma;
  readonly #languages: readonly string[];

  /** `languages`: every language a dilemma of the catalog is played in, as for moderating it. */
  constructor(ports: {
    readonly findDilemmaOfReference: FindDilemmaOfReference;
    readonly getDilemmas: GetDilemmas;
    readonly moderateDilemma: ModerateDilemma;
    readonly languages: readonly string[];
  }) {
    this.#findDilemmaOfReference = ports.findDilemmaOfReference;
    this.#getDilemmas = ports.getDilemmas;
    this.#moderateDilemma = ports.moderateDilemma;
    this.#languages = ports.languages;
  }

  async familyOf(dilemmaId: string): Promise<readonly string[]> {
    return familyOf(dilemmaId, this.#languages);
  }

  async dilemmaOf(reference: string): Promise<string | null> {
    return this.#findDilemmaOfReference.execute(reference);
  }

  async textOf(dilemmaId: string): Promise<string | null> {
    try {
      const {
        dilemmas: [dilemma],
      } = await this.#getDilemmas.execute({ dilemmas: [{ dilemmaId }] });
      return dilemma?.text ?? null;
    } catch {
      return null;
    }
  }

  async hide(dilemmaId: string): Promise<void> {
    await this.#moderateDilemma.execute({ dilemmaId, action: 'hide' });
  }

  async restore(dilemmaId: string): Promise<void> {
    await this.#moderateDilemma.execute({ dilemmaId, action: 'restore' });
  }

  async withdraw(dilemmaId: string): Promise<void> {
    await this.#moderateDilemma.execute({ dilemmaId, action: 'withdraw' });
  }
}
