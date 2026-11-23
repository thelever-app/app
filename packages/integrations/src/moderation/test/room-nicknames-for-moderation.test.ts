import { describe, expect, it } from 'vitest';
import { RoomNicknamesForModeration } from '../room-nicknames-for-moderation.ts';

describe('RoomNicknamesForModeration', () => {
  it('should withdraw the nickname of that player from their rooms', async () => {
    // Arrange
    const withdrawn: unknown[] = [];
    const nicknames = new RoomNicknamesForModeration({
      execute: async (input) => {
        withdrawn.push(input);
      },
    });

    // Act
    await nicknames.withdraw('TestOwner', 'TestNickname');

    // Assert
    expect(withdrawn).toEqual([{ identity: 'TestOwner', nickname: 'TestNickname' }]);
  });
});
