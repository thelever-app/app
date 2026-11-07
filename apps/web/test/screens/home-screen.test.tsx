import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomeScreen } from '../../src/screens/home-screen.tsx';
import { renderAtRoute } from '../support/routing.tsx';

describe('HomeScreen', () => {
  it('should create a room as a step of the start, and come back from it', async () => {
    // Arrange
    const { t, location } = await renderAtRoute(<HomeScreen />);

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('home.create') }));
    const creating = screen.getByRole('heading', { name: t('createRoom.title') });
    fireEvent.click(screen.getByRole('button', { name: t('home.back') }));

    // Assert
    expect(creating).toBeDefined();
    expect(screen.getByRole('heading', { name: t('home.title') })).toBeDefined();
    expect(location()).toBe('/');
  });

  it('should ask for the code of a room as a step of the start', async () => {
    // Arrange
    const { t } = await renderAtRoute(<HomeScreen />);

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('home.joinWithCode') }));

    // Assert
    expect(screen.getByRole('heading', { name: t('joinCode.title') })).toBeDefined();
    expect(screen.getByRole('textbox', { name: t('joinCode.label') })).toBeDefined();
  });
});
