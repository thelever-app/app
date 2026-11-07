import { InvalidRoomCodeError } from '../errors/invalid-room-code.error.ts';
import type { Randomness } from '../ports/randomness.port.ts';
import { pickOne } from '../services/random-choice.ts';

/** Letters and digits without the ones people mix up: 0 and O, 1, I and L. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LENGTH = 5;

/** What players type, or the QR carries, to join a room. It is not the id of the room. */
export class RoomCodeVO {
  readonly value: string;

  /** Case does not matter: a code is kept in capitals. */
  constructor(value: string) {
    const code = value.trim().toUpperCase();
    if (code.length !== LENGTH || [...code].some((character) => !ALPHABET.includes(character))) {
      throw new InvalidRoomCodeError(value);
    }
    this.value = code;
  }

  static generate(randomness: Randomness): RoomCodeVO {
    const characters = Array.from({ length: LENGTH }, () => pickOne([...ALPHABET], randomness));
    return new RoomCodeVO(characters.join(''));
  }
}
