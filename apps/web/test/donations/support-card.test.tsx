import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SupportCard } from '../../src/donations/support-card.tsx';
import { UnderEighteenProvider } from '../../src/first-access/device-age.tsx';
import { renderAtRoute, TEST_DONATION_URL } from '../support/routing.tsx';

afterEach(() => {
  localStorage.clear();
});

/** The card on the screen of a player who declared that age. */
function renderFor(underEighteen: boolean) {
  return renderAtRoute(
    <UnderEighteenProvider underEighteen={underEighteen}>
      <SupportCard />
    </UnderEighteenProvider>,
  );
}

describe('SupportCard', () => {
  it('should invite an adult to support TheLever on the donation page, outside the app', async () => {
    // Act
    const { t } = await renderFor(false);

    // Assert
    const card = screen.getByRole('complementary', { name: t('donations.card.link') });
    expect(card.textContent).toContain(t('donations.card.title'));
    expect(card.textContent).toContain(t('donations.card.text'));
    const link = screen.getByRole('link', {
      name: t('appSettings.outside', { name: t('donations.card.link') }),
    });
    expect(link.getAttribute('href')).toBe(TEST_DONATION_URL);
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('should not invite a player under 18', async () => {
    // Act
    const { t } = await renderFor(true);

    // Assert
    expect(screen.queryByRole('complementary', { name: t('donations.card.link') })).toBeNull();
  });

  it('should go once closed, and not come back on the device', async () => {
    // Arrange
    const { t, unmount } = await renderFor(false);

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('donations.card.close') }));
    const closed = screen.queryByRole('complementary', { name: t('donations.card.link') });
    unmount();
    await renderFor(false);

    // Assert
    expect(closed).toBeNull();
    expect(screen.queryByRole('complementary', { name: t('donations.card.link') })).toBeNull();
  });
});
