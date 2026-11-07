import { describe, expect, it } from 'vitest';
import { CreateRoomRequestDto, CreateRoomResponseDto } from '../../http/create-room.ts';

describe('CreateRoomRequestDto', () => {
  const request = {
    nickname: 'Ana',
    groupNature: 'friends',
    place: 'remote',
    dilemmaLanguage: 'es',
  };

  it('should accept the nickname of the host, the nature of the group, the place and the language', () => {
    // Act & Assert
    expect(CreateRoomRequestDto.parse(request)).toEqual(request);
  });

  it('should reject an empty nickname or an identity sent by the client', () => {
    // Act & Assert
    expect(CreateRoomRequestDto.safeParse({ ...request, nickname: '' }).success).toBe(false);
    expect(CreateRoomRequestDto.safeParse({ ...request, identity: 'uid' }).success).toBe(false);
  });

  it('should reject a nature of the group, a place or a language it does not know', () => {
    // Act & Assert
    expect(CreateRoomRequestDto.safeParse({ ...request, groupNature: 'team' }).success).toBe(false);
    expect(CreateRoomRequestDto.safeParse({ ...request, place: 'remotely' }).success).toBe(false);
    expect(CreateRoomRequestDto.safeParse({ ...request, dilemmaLanguage: 'ja' }).success).toBe(
      false,
    );
  });
});

describe('CreateRoomResponseDto', () => {
  it('should carry the room, its code and the player of the host', () => {
    // Arrange
    const response = { roomId: 'room-1', code: 'K7M2Q', playerId: 'player-1' };

    // Act & Assert
    expect(CreateRoomResponseDto.parse(response)).toEqual(response);
  });
});
