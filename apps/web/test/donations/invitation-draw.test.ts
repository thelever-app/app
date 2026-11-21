import { describe, expect, it } from 'vitest';
import { INVITATION_ODDS, invitesToDonate } from '../../src/donations/invitation-draw.ts';

describe('invitesToDonate', () => {
  it('should invite to donate in one game in three', () => {
    // Act & Assert
    expect(INVITATION_ODDS).toBe(1 / 3);
  });

  it('should invite when the draw falls below the odds', () => {
    // Act & Assert
    expect(invitesToDonate(() => 0)).toBe(true);
    expect(invitesToDonate(() => INVITATION_ODDS - Number.EPSILON)).toBe(true);
  });

  it('should not invite when the draw falls on the odds or above', () => {
    // Act & Assert
    expect(invitesToDonate(() => INVITATION_ODDS)).toBe(false);
    expect(invitesToDonate(() => 0.99)).toBe(false);
  });
});
