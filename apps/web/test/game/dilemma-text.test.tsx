import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DilemmaText } from '../../src/game/dilemma-text.tsx';

describe('DilemmaText', () => {
  it('should put the nickname of the person in the gap, highlighted, where the gap is', () => {
    // Act
    const { container } = render(
      <p>
        <DilemmaText text="Ves el móvil de {gap} desbloqueado" personInTheGap="Marta" />
      </p>,
    );

    // Assert
    expect(container.textContent).toBe('Ves el móvil de Marta desbloqueado');
    expect(screen.getByText('Marta').tagName).toBe('MARK');
  });

  it('should leave a text without the gap as it is', () => {
    // Act
    const { container } = render(
      <DilemmaText text="Un tranvía sin frenos" personInTheGap="Marta" />,
    );

    // Assert
    expect(container.textContent).toBe('Un tranvía sin frenos');
    expect(container.querySelector('mark')).toBeNull();
  });
});
