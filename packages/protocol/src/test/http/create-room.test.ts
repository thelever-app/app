import { describe, expect, it } from 'vitest';
import { CreateRoomRequestDto, CreateRoomResponseDto } from '../../http/create-room.ts';

describe('CreateRoomRequestDto', () => {
  it('should accept the nickname of the host', () => {
    // Act & Assert
    expect(CreateRoomRequestDto.parse({ nickname: 'Ana' })).toEqual({ nickname: 'Ana' });
  });

  it('should reject an empty nickname or an identity sent by the client', () => {
    // Act & Assert
    expect(CreateRoomRequestDto.safeParse({ nickname: '' }).success).toBe(false);
    expect(CreateRoomRequestDto.safeParse({ nickname: 'Ana', identity: 'uid' }).success).toBe(
      false,
    );
  });
});

describe('CreateRoomResponseDto', () => {
  it('should carry the room and the player of the host', () => {
    // Arrange
    const response = { roomId: 'room-1', playerId: 'player-1' };

    // Act & Assert
    expect(CreateRoomResponseDto.parse(response)).toEqual(response);
  });
});
