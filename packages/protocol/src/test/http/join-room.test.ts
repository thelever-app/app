import { describe, expect, it } from 'vitest';
import { JoinRoomRequestDto, JoinRoomResponseDto } from '../../http/join-room.ts';

describe('JoinRoomRequestDto', () => {
  const request = { nickname: 'Luis', avatar: { face: 'face-02', color: 'teal' } };

  it('should accept the nickname and the avatar of the player', () => {
    // Act & Assert
    expect(JoinRoomRequestDto.parse(request)).toEqual(request);
  });

  it('should accept the dilemmas the device says the player played, up to the most it takes', () => {
    // Arrange
    const played = Array.from({ length: 2000 }, (_, index) => `dilemma-${index}`);

    // Act & Assert
    expect(JoinRoomRequestDto.parse({ ...request, playedDilemmaIds: played })).toEqual({
      ...request,
      playedDilemmaIds: played,
    });
    const tooMany = [...played, 'dilemma-2000'];
    expect(JoinRoomRequestDto.safeParse({ ...request, playedDilemmaIds: tooMany }).success).toBe(
      false,
    );
  });

  it('should reject a nickname with invisible or control characters, but not an emoji', () => {
    // Act & Assert
    for (const hidden of ['Ana\u200b', '\u202eanA', 'An\u0000a', 'Ana\ufeff']) {
      expect(JoinRoomRequestDto.safeParse({ ...request, nickname: hidden }).success, hidden).toBe(
        false,
      );
    }
    expect(JoinRoomRequestDto.safeParse({ ...request, nickname: 'Ana 👩‍💻' }).success).toBe(true);
  });

  it('should reject a nickname longer than the screens let anyone write', () => {
    // Act & Assert
    expect(JoinRoomRequestDto.safeParse({ ...request, nickname: 'L'.repeat(20) }).success).toBe(
      true,
    );
    expect(JoinRoomRequestDto.safeParse({ ...request, nickname: 'L'.repeat(21) }).success).toBe(
      false,
    );
  });

  it('should reject an empty nickname, a missing avatar or one outside the closed list', () => {
    // Act & Assert
    expect(JoinRoomRequestDto.safeParse({ ...request, nickname: '' }).success).toBe(false);
    expect(JoinRoomRequestDto.safeParse({ nickname: 'Luis' }).success).toBe(false);
    const pink = { face: 'face-02', color: 'pink' };
    expect(JoinRoomRequestDto.safeParse({ ...request, avatar: pink }).success).toBe(false);
  });
});

describe('JoinRoomResponseDto', () => {
  it('should carry the player and whether they joined a game in progress', () => {
    // Arrange
    const response = { playerId: 'player-2', joinedLate: true };

    // Act & Assert
    expect(JoinRoomResponseDto.parse(response)).toEqual(response);
    expect(JoinRoomResponseDto.safeParse({ playerId: 'player-2' }).success).toBe(false);
  });
});
