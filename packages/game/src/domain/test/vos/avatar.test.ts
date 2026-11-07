import { describe, expect, it } from 'vitest';
import { AVATAR_FACES, AvatarVO, PLAYER_COLORS } from '../../vos/avatar.vo.ts';
import { InvalidAvatarError } from '../../errors/invalid-avatar.error.ts';

describe('AvatarVO', () => {
  it('should keep its face and its colour', () => {
    // Act
    const avatar = new AvatarVO('face-03', 'teal');

    // Assert
    expect(avatar.face).toBe('face-03');
    expect(avatar.color).toBe('teal');
  });

  it('should throw an error for a face that does not exist', () => {
    // Act & Assert
    expect(() => new AvatarVO('rocket_launch', 'teal')).toThrow(InvalidAvatarError);
  });

  it('should throw an error for a colour that does not exist', () => {
    // Act & Assert
    expect(() => new AvatarVO('face-03', 'pink')).toThrow(InvalidAvatarError);
  });

  it('should be equal to another avatar with the same face and colour', () => {
    // Act & Assert
    expect(new AvatarVO('face-03', 'teal').equals(new AvatarVO('face-03', 'teal'))).toBe(true);
    expect(new AvatarVO('face-03', 'teal').equals(new AvatarVO('face-03', 'rust'))).toBe(false);
  });

  it('should offer an avatar for every face and colour, enough for a full room of 50', () => {
    // Act
    const all = AvatarVO.all();

    // Assert
    expect(all).toHaveLength(AVATAR_FACES.length * PLAYER_COLORS.length);
    expect(all.length).toBeGreaterThanOrEqual(50);
  });
});
