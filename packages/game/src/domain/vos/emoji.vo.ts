import { InvalidEmojiError } from '../errors/invalid-emoji.error.ts';

/** Longer than any emoji, family sequences included. */
const MAXIMUM_LENGTH = 32;
const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u;
const GRAPHEMES = new Intl.Segmenter('en', { granularity: 'grapheme' });

/** A reaction: one emoji, any of them, as the keyboard of the phone writes it. */
export class EmojiVO {
  readonly value: string;

  constructor(value: string) {
    const graphemes = [...GRAPHEMES.segment(value)];
    if (value.length > MAXIMUM_LENGTH || graphemes.length !== 1 || !EMOJI.test(value)) {
      throw new InvalidEmojiError(value);
    }
    this.value = value;
  }
}
