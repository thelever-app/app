import { describe, expect, it } from 'vitest';
import { RoomNicknamesForModeration } from '../room-nicknames-for-moderation.ts';

function nicknames(withdrawn: unknown[] = []) {
  return new RoomNicknamesForModeration({
    findNicknameOfReference: {
      execute: async (reference) =>
        reference.includes('TestNickname')
          ? { nickname: 'TestNickname', owner: 'TestOwner' }
          : null,
    },
    withdrawNickname: {
      execute: async (input) => {
        withdrawn.push(input);
      },
    },
  });
}

describe('RoomNicknamesForModeration', () => {
  it('should find the nickname a notice points to, and who goes by it', async () => {
    // Act & Assert
    await expect(nicknames().nicknameOf('Sala TESTS, apodo TestNickname')).resolves.toEqual({
      nickname: 'TestNickname',
      owner: 'TestOwner',
    });
  });

  it('should withdraw the nickname of that player from their rooms', async () => {
    // Arrange
    const withdrawn: unknown[] = [];

    // Act
    await nicknames(withdrawn).withdraw('TestOwner', 'TestNickname');

    // Assert
    expect(withdrawn).toEqual([{ identity: 'TestOwner', nickname: 'TestNickname' }]);
  });
});
