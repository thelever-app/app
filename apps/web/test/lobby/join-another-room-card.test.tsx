import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { JoinAnotherRoomCard } from '../../src/lobby/join-another-room-card.tsx';
import { renderAtRoute } from '../support/routing.tsx';

describe('JoinAnotherRoomCard', () => {
  it('should take the host to the join screen of the other room once its code is complete', async () => {
    // Arrange
    const { t, location, locationState } = await renderAtRoute(
      <JoinAnotherRoomCard leavingRoomId="test-own-room-id" />,
      { at: '/rooms/test-own-room-id' },
    );
    const field = screen.getByRole('textbox', { name: t('lobby.joinOther.code') });
    const enter = screen.getByRole('button', { name: t('joinCode.enter') });

    // Act
    fireEvent.change(field, { target: { value: 'k7m2' } });
    const offWithFour = (enter as HTMLButtonElement).disabled;
    fireEvent.change(field, { target: { value: 'k7m2q' } });
    fireEvent.click(enter);

    // Assert
    expect(offWithFour).toBe(true);
    expect(location()).toBe('/join/K7M2Q');
    expect(locationState()).toEqual({ fromCode: true, leavingRoomId: 'test-own-room-id' });
  });
});
