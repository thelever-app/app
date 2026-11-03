import type { DilemmaRepository } from '../application/ports/dilemma-repository.port.ts';
import { Dilemma, type OptionSnapshot } from '../domain/entities/dilemma.ts';
import type { IdGenerator } from '../domain/ports/id-generator.port.ts';
import type { Category } from '../domain/vos/category.vo.ts';
import type { MinimumAge } from '../domain/vos/minimum-age.vo.ts';

/** A dilemma of the seed, as the curation team writes it, with the ids it always has. */
export interface SeedDilemma {
  readonly id: string;
  readonly language: string;
  readonly text: string;
  readonly options: readonly OptionSnapshot[];
  readonly category: Category;
  readonly tags: readonly string[];
  readonly minimumAge: MinimumAge;
}

/** The ids of an option: the id of its dilemma and its position, from 1. */
function options(dilemmaId: string, texts: readonly string[]) {
  return texts.map((text, index) => ({ id: `${dilemmaId}-option-${index + 1}`, text }));
}

/** Hands out the ids the seed fixes, in order, so the dilemmas keep them in every environment. */
class SeedIdGenerator implements IdGenerator {
  readonly #ids: string[];

  constructor(ids: readonly string[]) {
    this.#ids = [...ids];
  }

  generate(): string {
    const id = this.#ids.shift();
    if (id === undefined) throw new Error('the seed ran out of ids');
    return id;
  }
}

/**
 * The dilemmas every environment starts with.
 * Stable ids, so the room server, the simulated room and the seed script of the database
 * load the same dilemmas. No option is presented as the right one.
 */
export const SEED_DILEMMAS: readonly SeedDilemma[] = [
  {
    id: 'seed-trolley',
    language: 'es',
    text: 'Un tranvía sin frenos va hacia cinco personas que trabajan en la vía. Puedes desviarlo a otra vía, donde hay una sola persona. ¿Qué haces?',
    options: options('seed-trolley', ['Desviar el tranvía', 'No tocar nada']),
    category: 'life-and-death',
    tags: ['tranvía', 'sacrificio'],
    minimumAge: 16,
  },
  {
    id: 'seed-wallet',
    language: 'es',
    text: 'Encuentras una cartera con 200 € y el carné de su dueño, que vive a una hora de tu casa. ¿Qué haces?',
    options: options('seed-wallet', [
      'Llevársela en persona',
      'Dejarla en una comisaría',
      'Quedarte el dinero y enviarle el carné',
    ]),
    category: 'honesty',
    tags: ['dinero', 'desconocidos'],
    minimumAge: 16,
  },
  {
    id: 'seed-alibi',
    language: 'es',
    text: 'Tu mejor amigo te pide que digas que esta noche estuvo contigo. No es verdad. ¿Lo cubres?',
    options: options('seed-alibi', ['Sí, lo cubro', 'No, no miento por él']),
    category: 'loyalty',
    tags: ['amistad', 'mentira'],
    minimumAge: 16,
  },
  {
    id: 'seed-ventilator',
    language: 'es',
    text: 'En un hospital queda un único respirador libre y lo necesitan cuatro pacientes a la vez. ¿A quién se lo das?',
    options: options('seed-ventilator', [
      'A la niña de 8 años',
      'Al médico de 45 años',
      'A la atleta de 30 años',
      'Al hombre de 80 años',
    ]),
    category: 'life-and-death',
    tags: ['medicina', 'triaje'],
    minimumAge: 16,
  },
  {
    id: 'seed-cheating',
    language: 'es',
    text: 'Ves a un compañero copiando en el mismo examen de certificación que estás haciendo tú. ¿Qué haces?',
    options: options('seed-cheating', [
      'Avisar a quien vigila',
      'Hablar con él después',
      'No hacer nada',
    ]),
    category: 'honesty',
    tags: ['estudios', 'trampas'],
    minimumAge: 16,
  },
  {
    id: 'seed-death-date',
    language: 'es',
    text: 'Puedes saber con total certeza la fecha de tu muerte. ¿Quieres saberla?',
    options: options('seed-death-date', ['Sí, quiero saberla', 'No, prefiero no saberla']),
    category: 'life-and-death',
    tags: ['muerte', 'futuro'],
    minimumAge: 16,
  },
];

/**
 * Saves every seed dilemma and returns their ids, in order. A dilemma that is missing is created,
 * one that changed gets a new version, and one that is the same is left as it is.
 */
export async function loadSeedDilemmas(repository: DilemmaRepository): Promise<readonly string[]> {
  for (const seed of SEED_DILEMMAS) {
    const existing = await repository.findById(seed.id);
    if (existing) {
      // The options it already has keep their ids; the new ones get theirs from the seed.
      const kept = new Set(existing.options.map(({ id }) => id));
      existing.revise(
        {
          ...seed,
          options: seed.options.map(({ id, text }) => (kept.has(id) ? { id, text } : { text })),
        },
        new SeedIdGenerator(seed.options.filter(({ id }) => !kept.has(id)).map(({ id }) => id)),
      );
      await repository.save(existing);
    } else {
      await repository.save(
        Dilemma.create(
          { ...seed, options: seed.options.map(({ text }) => text) },
          new SeedIdGenerator([seed.id, ...seed.options.map(({ id }) => id)]),
        ),
      );
    }
  }
  return SEED_DILEMMAS.map(({ id }) => id);
}
