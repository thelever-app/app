import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SettingsScreen } from '../../src/settings/settings-screen.tsx';
import { renderAtRoute, TEST_DONATION_URL } from '../support/routing.tsx';

describe('SettingsScreen', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('should start with the way to support TheLever, outside the app, saying it gives no advantage', async () => {
    // Arrange
    const { t } = await renderAtRoute(<SettingsScreen />);

    // Act
    const links = screen.getAllByRole('link');

    // Assert
    const first = links.find((link) => link.getAttribute('href') !== '/app');
    expect(first?.getAttribute('aria-label')).toBe(t('appSettings.support.label'));
    expect(first?.getAttribute('href')).toBe(TEST_DONATION_URL);
    expect(first?.getAttribute('target')).toBe('_blank');
    expect(first?.textContent).toContain(t('appSettings.support.text'));
  });

  it('should show the app in the language chosen at once, and keep it on the device', async () => {
    // Arrange
    const { t, i18n } = await renderAtRoute(<SettingsScreen />);

    // Act
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t('appSettings.language')) }));
    const current = screen.getByRole('button', { name: 'Español' });
    fireEvent.click(screen.getByRole('button', { name: 'English' }));

    // Assert
    expect(current.getAttribute('aria-current')).toBe('true');
    expect(screen.queryByRole('radio')).toBeNull();
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeDefined();
    expect(i18n.language).toBe('en');
    expect(localStorage.getItem('thelever.language')).toBe('en');
  });

  it('should mute and unmute the game with the same preference as the room', async () => {
    // Arrange
    const { t, preference } = await renderAtRoute(<SettingsScreen />);
    const sound = screen.getByRole('switch', { name: new RegExp(t('appSettings.sound')) });

    // Act
    fireEvent.click(sound);

    // Assert
    expect(preference.isMuted()).toBe(true);
    expect(sound.getAttribute('aria-checked')).toBe('false');
  });

  it('should open the privacy policy, the terms and the legal notice of the public web in its language', async () => {
    // Arrange
    const { t } = await renderAtRoute(<SettingsScreen />);

    // Act
    const href = (name: string) =>
      screen.getByRole('link', { name: new RegExp(name) }).getAttribute('href');

    // Assert
    expect(href(t('appSettings.privacyPolicy'))).toBe('/es/privacidad-de-la-app');
    expect(href(t('appSettings.terms'))).toBe('/es/condiciones-de-uso');
    expect(href(t('appSettings.legalNotice'))).toBe('/es/aviso-legal');
  });

  it('should take to how TheLever is funded and to the credits', async () => {
    // Arrange
    const { t, location } = await renderAtRoute(<SettingsScreen />);

    // Act
    fireEvent.click(screen.getByRole('link', { name: t('appSettings.credits') }));

    // Assert
    expect(location()).toBe('/settings/credits');
    expect(screen.getByRole('link', { name: t('appSettings.funding') }).getAttribute('href')).toBe(
      '/settings/funding',
    );
  });

  it('should neither show nor offer to change the declared age', async () => {
    // Act
    await renderAtRoute(<SettingsScreen />);

    // Assert
    expect(screen.queryByText(/\bedad\b|\baño de nacimiento\b/i)).toBeNull();
  });
});

describe('ContactScreen', () => {
  it('should show the contact email, the languages it is answered in and the way to the web form', async () => {
    // Arrange
    const { ContactScreen } = await import('../../src/settings/contact-screen.tsx');

    // Act
    const { t } = await renderAtRoute(<ContactScreen />);

    // Assert
    expect(screen.getByText('privacidad@thelever.app')).toBeDefined();
    expect(screen.getByText(t('contact.writeText'))).toBeDefined();
    expect(screen.getByRole('link', { name: t('contact.openForm') }).getAttribute('href')).toBe(
      '/denunciar',
    );
  });

  it('should be one row of About in the settings', async () => {
    // Arrange
    const { t, location } = await renderAtRoute(<SettingsScreen />);

    // Act
    fireEvent.click(screen.getByRole('link', { name: new RegExp(t('appSettings.contact')) }));

    // Assert
    expect(location()).toBe('/settings/contact');
  });
});
