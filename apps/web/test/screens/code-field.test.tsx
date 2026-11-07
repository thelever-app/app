import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CodeField } from '../../src/screens/code-field.tsx';
import { renderAtRoute } from '../support/routing.tsx';

async function renderCodeField() {
  const rendered = await renderAtRoute(<CodeField />);
  const field = screen.getByRole('textbox', { name: rendered.t('joinCode.label') });
  return { ...rendered, field: field as HTMLInputElement };
}

describe('CodeField', () => {
  it('should show what is typed as the code it looks for: capitals, letters and digits', async () => {
    // Arrange
    const { field, location } = await renderCodeField();

    // Act
    fireEvent.change(field, { target: { value: 'k7-m' } });

    // Assert
    expect(field.value).toBe('K7M');
    expect(location()).toBe('/');
  });

  it('should go to the room of the code as soon as it is complete, with no button', async () => {
    // Arrange
    const { field, location } = await renderCodeField();

    // Act: pasted as someone may dictate it.
    fireEvent.change(field, { target: { value: 'k7m 2q' } });

    // Assert
    expect(location()).toBe('/join/K7M2Q');
  });

  it('should keep five characters at most', async () => {
    // Arrange
    const { field } = await renderCodeField();

    // Act
    fireEvent.change(field, { target: { value: 'K7M2QX' } });

    // Assert
    expect(field.value).toBe('K7M2Q');
  });
});
