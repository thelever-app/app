import type { Randomness } from '../ports/randomness.port.ts';

/** Crockford's base 32: digits and capitals without I, L, O and U, which are misread. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
/** 60 bits: among a million identities, a code made up at random is someone's once in 10^12. */
const LENGTH = 12;
const GROUP = 4;
/** What people write for a character of the alphabet they mix it up with. */
const MISREAD: Readonly<Record<string, string>> = { O: '0', I: '1', L: '1' };

/**
 * The code for requests by email: it shows on the device of a player without an account, and a
 * request that brings it is theirs. It is made once, with the first access, and never changes.
 */
export class RequestCodeVO {
  /** In capitals, without groups: how it is kept. */
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static generate(randomness: Randomness): RequestCodeVO {
    const characters = Array.from({ length: LENGTH }, () =>
      ALPHABET.charAt(randomness.integer(ALPHABET.length)),
    );
    return new RequestCodeVO(characters.join(''));
  }

  /**
   * The code someone wrote, however they wrote it: case, spaces and dashes do not matter, and O,
   * I and L are read as the digits they look like. Nothing if it cannot be a code.
   */
  static parse(written: string): RequestCodeVO | undefined {
    const characters = [...written.toUpperCase().replace(/[\s-]/g, '')].map(
      (character) => MISREAD[character] ?? character,
    );
    if (characters.length !== LENGTH) return undefined;
    if (characters.some((character) => !ALPHABET.includes(character))) return undefined;
    return new RequestCodeVO(characters.join(''));
  }

  /** As the device shows it: three groups of four, `K7Q4-MD2X-9PRT`. */
  toString(): string {
    return this.value.match(new RegExp(`.{${GROUP}}`, 'g'))?.join('-') ?? this.value;
  }
}
