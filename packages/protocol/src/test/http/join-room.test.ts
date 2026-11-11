import { describe, expect, it } from 'vitest';
import { JoinRoomRequestDto, JoinRoomResponseDto } from '../../http/join-room.ts';

describe('JoinRoomRequestDto', () => {
  const request = { nickname: 'Luis', avatar: { face: 'face-02', color: 'teal' } };

  it('should accept the nickname and the avatar of the player', () => {
    // Act & Assert
    expect(JoinRoomRequestDto.parse(request)).toEqual(request);
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
