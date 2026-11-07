import { describe, expect, it } from 'vitest';
import { RoomPreviewResponseDto } from '../../http/room-preview.ts';

describe('RoomPreviewResponseDto', () => {
  const preview = {
    roomId: 'room-1',
    hostNickname: 'Ana',
    variant: 'nominal',
    adultsOnly: true,
    playerCount: 4,
  };

  it('should carry whose the room is, its type, whether it is for adults and how many are in', () => {
    // Act & Assert
    expect(RoomPreviewResponseDto.parse(preview)).toEqual(preview);
  });

  it('should reject the players themselves, as an extra key', () => {
    // Act & Assert
    expect(RoomPreviewResponseDto.safeParse({ ...preview, players: [] }).success).toBe(false);
  });
});
