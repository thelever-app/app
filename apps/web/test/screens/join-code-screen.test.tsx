import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { JoinCodeScreen } from '../../src/screens/join-code-screen.tsx';
import { renderAtRoute } from '../support/routing.tsx';

async function renderCodeScreen() {
  const rendered = await renderAtRoute(<JoinCodeScreen />, { at: '/join' });
  const field = screen.getByRole('textbox', { name: rendered.t('joinCode.label') });
  return { ...rendered, field: field as HTMLInputElement };
}

function submitButton(): HTMLElement {
  const button = document.querySelector<HTMLElement>('button[type="submit"]');
  if (!button) throw new Error('The screen has no submit button');
  return button;
}

describe('JoinCodeScreen', () => {
  it('should show what is typed as the code it looks for: capitals, letters and digits', async () => {
    // Arrange
    const { field, location } = await renderCodeScreen();

    // Act
    fireEvent.change(field, { target: { value: 'k7-m' } });

    // Assert
    expect(field.value).toBe('K7M');
    expect(location()).toBe('/join');
  });

  it('should say how many characters are missing, without letting the player enter yet', async () => {
    // Arrange
    const { t, field } = await renderCodeScreen();

    // Act
    fireEvent.change(field, { target: { value: 'K7M' } });

    // Assert
    expect(submitButton().textContent).toBe(t('joinCode.missing', { count: 2 }));
    expect(submitButton()).toHaveProperty('disabled', true);
    expect(screen.getByText(t('joinCode.hint'))).toBeDefined();
  });

  it('should go to the room of the code as soon as it is complete, with no button', async () => {
    // Arrange
    const { field, location } = await renderCodeScreen();

    // Act: pasted as someone may dictate it.
    fireEvent.change(field, { target: { value: 'k7m 2q' } });

    // Assert
    expect(location()).toBe('/join/K7M2Q');
  });

  it('should keep five characters at most', async () => {
    // Arrange
    const { field } = await renderCodeScreen();

    // Act
    fireEvent.change(field, { target: { value: 'K7M2QX' } });

    // Assert
    expect(field.value).toBe('K7M2Q');
  });

  it('should go back to the start', async () => {
    // Arrange
    const { t, location } = await renderCodeScreen();

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('home.back') }));

    // Assert
    expect(location()).toBe('/');
  });
});
