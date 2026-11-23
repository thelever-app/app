import { describe, expect, it } from 'vitest';
import { DataDeletion } from '../../entities/data-deletion.ts';

const REQUESTED = new Date('2026-11-23T10:00:00Z');

function requested(): DataDeletion {
  return DataDeletion.request({
    id: 'deletion-1',
    identity: 'uid-ana',
    reason: 'request',
    now: REQUESTED,
  });
}

describe('DataDeletion', () => {
  it('should be pending from the moment it is requested', () => {
    // Act
    const deletion = requested();

    // Assert
    expect(deletion.isPending).toBe(true);
    expect(deletion.toSnapshot()).toEqual({
      id: 'deletion-1',
      identity: 'uid-ana',
      reason: 'request',
      requestedAt: REQUESTED,
      erasedAt: null,
    });
  });

  it('should keep when every store deleted the data', () => {
    // Arrange
    const deletion = requested();
    const erased = new Date('2026-11-24T03:00:00Z');

    // Act
    deletion.erased(erased);

    // Assert
    expect(deletion.isPending).toBe(false);
    expect(deletion.toSnapshot().erasedAt).toEqual(erased);
  });

  it('should keep the first time it was erased when it is erased again after a restore', () => {
    // Arrange
    const deletion = requested();
    const first = new Date('2026-11-24T03:00:00Z');
    deletion.erased(first);

    // Act
    deletion.erased(new Date('2026-11-30T03:00:00Z'));

    // Assert
    expect(deletion.toSnapshot().erasedAt).toEqual(first);
  });

  it('should come back from its snapshot as it was', () => {
    // Arrange
    const deletion = requested();
    deletion.erased(new Date('2026-11-24T03:00:00Z'));

    // Act
    const again = DataDeletion.fromSnapshot(deletion.toSnapshot());

    // Assert
    expect(again.toSnapshot()).toEqual(deletion.toSnapshot());
  });
});
