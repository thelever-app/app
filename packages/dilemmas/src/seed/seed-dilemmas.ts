import type { DilemmaRepository } from '../application/ports/dilemma-repository.port.ts';
import { Dilemma, type DilemmaSnapshot } from '../domain/entities/dilemma.ts';

/** The ids of an option: the id of its dilemma and its position, from 1. */
function options(dilemmaId: string, texts: readonly string[]) {
  return texts.map((text, index) => ({ id: `${dilemmaId}-option-${index + 1}`, text }));
}

/**
 * The dilemmas every environment starts with.
 * Stable ids, so the room server, the simulated room and the seed script of the database
 * load the same dilemmas. No option is presented as the right one.
 */
export const SEED_DILEMMAS: readonly DilemmaSnapshot[] = [
  {
    id: 'seed-trolley',
    language: 'es',
    text: 'Un tranvía sin frenos va hacia cinco personas que trabajan en la vía. Puedes desviarlo a otra vía, donde hay una sola persona. ¿Qué haces?',
    options: options('seed-trolley', ['Desviar el tranvía', 'No tocar nada']),
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
  },
  {
    id: 'seed-alibi',
    language: 'es',
    text: 'Tu mejor amigo te pide que digas que esta noche estuvo contigo. No es verdad. ¿Lo cubres?',
    options: options('seed-alibi', ['Sí, lo cubro', 'No, no miento por él']),
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
  },
  {
    id: 'seed-death-date',
    language: 'es',
    text: 'Puedes saber con total certeza la fecha de tu muerte. ¿Quieres saberla?',
    options: options('seed-death-date', ['Sí, quiero saberla', 'No, prefiero no saberla']),
  },
];

/** Saves every seed dilemma and returns their ids, in order. */
export async function loadSeedDilemmas(repository: DilemmaRepository): Promise<readonly string[]> {
  for (const snapshot of SEED_DILEMMAS) {
    await repository.save(Dilemma.restore(snapshot));
  }
  return SEED_DILEMMAS.map(({ id }) => id);
}
