import { describe, expect, it } from 'vitest';
import { StationLine } from '../../src/components/station-line.tsx';
import { renderWithProviders } from '../support/render.tsx';

function stationsOf(container: HTMLElement) {
  return [...container.querySelectorAll('[data-station]')].map((station) =>
    station.getAttribute('data-station'),
  );
}

describe('StationLine', () => {
  it('should draw one station per dilemma: the passed ones, the current one and the next ones', async () => {
    // Act
    const { container } = await renderWithProviders(<StationLine stations={4} passed={1} />);

    // Assert
    expect(stationsOf(container)).toEqual(['passed', 'current', 'next', 'next']);
  });

  it('should mark the whole line as complete once every station is passed', async () => {
    // Act
    const { container } = await renderWithProviders(<StationLine stations={3} passed={3} />);

    // Assert
    expect(stationsOf(container)).toEqual(['passed', 'passed', 'passed']);
    expect(container.firstElementChild?.getAttribute('data-complete')).toBe('true');
  });

  it('should be hidden from screen readers, as the position is also said in words', async () => {
    // Act
    const { container } = await renderWithProviders(<StationLine stations={3} passed={0} />);

    // Assert
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });
});
