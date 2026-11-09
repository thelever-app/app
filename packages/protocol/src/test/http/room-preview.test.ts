import { describe, expect, it } from 'vitest';
import { RoomPreviewResponseDto } from '../../http/room-preview.ts';

describe('RoomPreviewResponseDto', () => {
  const preview = {
    roomId: 'room-1',
    hostNickname: 'Ana',
    variant: 'nominal',
    adultsOnly: true,
    players: [
      { nickname: 'Ana', avatar: { face: 'face-01', color: 'khaki' } },
      { nickname: 'Luis', avatar: { face: 'face-02', color: 'teal' } },
    ],
    suggestedAvatar: { face: 'face-03', color: 'brown' },
  };

  it('should carry whose the room is, its type, whether it is for adults, who is in and a free avatar', () => {
    // Act & Assert
    expect(RoomPreviewResponseDto.parse(preview)).toEqual(preview);
  });

  it('should reject the id or the identity of a player, as extra keys', () => {
    // Arrange
    const [ana] = preview.players;

    // Act & Assert
    for (const extra of [{ playerId: 'player-1' }, { identity: 'uid' }]) {
      const players = [{ ...ana, ...extra }];
      expect(RoomPreviewResponseDto.safeParse({ ...preview, players }).success).toBe(false);
    }
  });

  it('should accept nobody else inside, for whoever opens the room they are alone in', () => {
    // Act & Assert
    expect(RoomPreviewResponseDto.safeParse({ ...preview, players: [] }).success).toBe(true);
  });
});
