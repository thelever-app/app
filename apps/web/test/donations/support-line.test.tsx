import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SupportLine } from '../../src/donations/support-line.tsx';
import { UnderEighteenProvider } from '../../src/first-access/device-age.tsx';
import { renderAtRoute, TEST_DONATION_URL } from '../support/routing.tsx';

/** Test data: a draw that invites to donate, and one that does not. */
const INVITES = () => 0;
const DOES_NOT_INVITE = () => 0.99;

/** The line on the end of the game of a player who declared that age, with that draw. */
function renderFor(underEighteen: boolean, random: () => number) {
  return renderAtRoute(
    <UnderEighteenProvider underEighteen={underEighteen}>
      <SupportLine random={random} />
    </UnderEighteenProvider>,
  );
}

describe('SupportLine', () => {
  it('should invite an adult to support TheLever when the draw picks the game', async () => {
    // Act
    const { t } = await renderFor(false, INVITES);

    // Assert
    const link = screen.getByRole('link', {
      name: t('appSettings.outside', { name: t('donations.line') }),
    });
    expect(link.textContent).toBe(t('donations.line'));
    expect(link.getAttribute('href')).toBe(TEST_DONATION_URL);
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('should not invite when the draw does not pick the game', async () => {
    // Act
    await renderFor(false, DOES_NOT_INVITE);

    // Assert
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('should not invite a player under 18, whatever the draw', async () => {
    // Act
    await renderFor(true, INVITES);

    // Assert
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('should draw once when it shows, not on each render', async () => {
    // Arrange
    let draws = 0;
    const random = () => {
      draws += 1;
      return 0;
    };

    // Act
    const { t } = await renderFor(false, random);
    await screen.findByText(t('donations.line'));

    // Assert
    expect(draws).toBe(1);
  });
});
