import checkCircle from '@material-symbols/svg-500/rounded/check_circle-fill.svg?url';
import { describe, expect, it } from 'vitest';
import { Icon } from '../../src/components/icon.tsx';
import { renderWithProviders } from '../support/render.tsx';

describe('Icon', () => {
  it('should be hidden from screen readers, as the element that holds it names it', async () => {
    // Act
    const { container } = await renderWithProviders(<Icon name="close" />);

    // Assert
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });

  it('should show the SVG of its name, at the size asked for', async () => {
    // Act
    const { container } = await renderWithProviders(<Icon name="checkCircle" size={20} />);

    // Assert
    const icon = container.firstElementChild as HTMLElement;
    expect(icon.style.getPropertyValue('--icon')).toBe(`url("${checkCircle}")`);
    expect(icon.style.getPropertyValue('--icon-size')).toBe('20px');
  });
});
