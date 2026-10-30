import { describe, expect, it } from 'vitest';
import { JoinRoomRequestDto, JoinRoomResponseDto } from '../../http/join-room.ts';

describe('JoinRoomRequestDto', () => {
  it('should accept the nickname of the player and reject an empty one', () => {
    // Act & Assert
    expect(JoinRoomRequestDto.parse({ nickname: 'Luis' })).toEqual({ nickname: 'Luis' });
    expect(JoinRoomRequestDto.safeParse({ nickname: '' }).success).toBe(false);
  });
});

describe('JoinRoomResponseDto', () => {
  it('should carry the player', () => {
    // Act & Assert
    expect(JoinRoomResponseDto.parse({ playerId: 'player-2' })).toEqual({ playerId: 'player-2' });
  });
});
