import { NicknameMissingError } from '../errors/nickname-missing.error.ts';
import type { DilemmaLanguage } from './room-settings.vo.ts';

/** «Player», in the language of the room, for a nickname the team withdrew. */
const GENERIC_NICKNAMES: Readonly<Record<DilemmaLanguage, string>> = {
  es: 'Jugador',
  en: 'Player',
  fr: 'Joueur',
  de: 'Spieler',
  it: 'Giocatore',
  pt: 'Jogador',
  ca: 'Jugador',
};

/**
 * The generic nickname of the room (glossary, «Apodo genérico»): «Jugador 3», with the number of
 * the player in the room.
 */
export function genericNickname(language: DilemmaLanguage, number: number): string {
  return `${GENERIC_NICKNAMES[language]} ${number}`;
}

export class NicknameVO {
  readonly value: string;

  /** Surrounding whitespace is dropped; a value made only of whitespace is missing. */
  constructor(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new NicknameMissingError();
    }
    this.value = trimmed;
  }

  /** Two nicknames are the same when they match without counting case or accents. */
  sameAs(other: NicknameVO): boolean {
    return folded(this.value) === folded(other.value);
  }
}

function folded(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}
