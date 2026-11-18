import { describe, expect, it } from 'vitest';
import { InvalidEmojiError } from '../../errors/invalid-emoji.error.ts';
import { EmojiVO } from '../../vos/emoji.vo.ts';

describe('EmojiVO', () => {
  it.each(['😂', '❤️', '👍🏽', '👩‍👩‍👧', '🇪🇸', '1️⃣'])('should take %s, one emoji', (emoji) => {
    // Act
    const vo = new EmojiVO(emoji);

    // Assert
    expect(vo.value).toBe(emoji);
  });

  it.each(['', 'a', '😂😂', 'hola', ' 😂', '1'])('should not take %j', (value) => {
    // Act & Assert
    expect(() => new EmojiVO(value)).toThrow(InvalidEmojiError);
  });
});
