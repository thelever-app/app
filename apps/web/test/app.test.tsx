import { act, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../src/App.tsx';
import { aGame } from './support/game.ts';
import { fakeConnection } from './support/fake-connection.ts';
import { renderWithProviders } from './support/render.tsx';

describe('App', () => {
  it('should show the decision phase once the game arrives', async () => {
    // Arrange
    const { connection, deliver } = fakeConnection();
    await renderWithProviders(<App />, { connection });

    // Act
    act(() => deliver(aGame()));

    // Assert
    expect(screen.getByRole('heading', { name: 'Texto del dilema 1' })).toBeDefined();
  });
});
