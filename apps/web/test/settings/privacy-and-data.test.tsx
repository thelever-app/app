import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PermissionsScreen } from '../../src/settings/permissions-screen.tsx';
import { SettingsScreen } from '../../src/settings/settings-screen.tsx';
import { YourDataScreen } from '../../src/settings/your-data-screen.tsx';
import { fakeRoomApi, renderAtRoute } from '../support/routing.tsx';

const MINE = {
  requestCode: 'K7Q4-MD2X-9PRT',
  gameConsent: 'given' as const,
  objectsToAnalytics: false,
};

vi.mock('../../src/identity/forget-device.ts', () => ({ forgetDevice: vi.fn(async () => {}) }));

describe('Settings › Privacy and data', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should offer the permissions, the data, the cookies and the deletion', async () => {
    // Arrange
    const { t } = await renderAtRoute(<SettingsScreen />);

    // Act
    const block = screen.getByRole('region', { name: t('appSettings.privacy') });

    // Assert
    expect(block.textContent).toContain(t('appSettings.permissions'));
    expect(block.textContent).toContain(t('appSettings.yourData'));
    expect(block.textContent).toContain(t('appSettings.cookies'));
    expect(block.textContent).toContain(t('appSettings.deleteData'));
  });

  it('should tell what is deleted and what is kept before deleting, and start the device from scratch', async () => {
    // Arrange
    const requestDataDeletion = vi.fn(async () => {});
    const { t } = await renderAtRoute(<SettingsScreen />, {
      api: fakeRoomApi({ requestDataDeletion }),
    });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t('appSettings.deleteData')) }));
    const sheet = await screen.findByRole('dialog', { name: t('deleteData.title') });

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('deleteData.confirm') }));

    // Assert
    expect(sheet.textContent).toContain(t('deleteData.consent'));
    expect(sheet.textContent).toContain(t('deleteData.history'));
    expect(await screen.findByRole('heading', { name: t('dataDeleted.title') })).toBeDefined();
    expect(requestDataDeletion).toHaveBeenCalledOnce();
    const { forgetDevice } = await import('../../src/identity/forget-device.ts');
    expect(forgetDevice).toHaveBeenCalledOnce();
  });

  it('should keep everything if the deletion could not be asked for', async () => {
    // Arrange
    const { t } = await renderAtRoute(<SettingsScreen />, {
      api: fakeRoomApi({
        requestDataDeletion: vi.fn(async () => Promise.reject(new Error('down'))),
      }),
    });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t('appSettings.deleteData')) }));

    // Act
    fireEvent.click(await screen.findByRole('button', { name: t('deleteData.confirm') }));

    // Assert
    expect(await screen.findByRole('alert')).toBeDefined();
    expect(screen.queryByRole('heading', { name: t('dataDeleted.title') })).toBeNull();
  });
});

describe('PermissionsScreen', () => {
  it('should object to product analytics at once', async () => {
    // Arrange
    const objectToAnalytics = vi.fn(async () => {});
    const { t } = await renderAtRoute(<PermissionsScreen adsenseClient={undefined} />, {
      api: fakeRoomApi({ myData: vi.fn(async () => MINE), objectToAnalytics }),
    });
    const analytics = await screen.findByRole('switch', {
      name: new RegExp(t('permissions.analytics')),
    });
    await waitFor(() => expect(analytics.getAttribute('aria-checked')).toBe('true'));

    // Act
    fireEvent.click(analytics);

    // Assert
    expect(analytics.getAttribute('aria-checked')).toBe('false');
    expect(analytics.textContent).toContain(t('permissions.analyticsOff'));
    expect(objectToAnalytics).toHaveBeenCalledWith(true);
  });

  it('should warn before withdrawing the game consent, and withdraw it only on confirming', async () => {
    // Arrange
    const withdrawGameConsent = vi.fn(async () => Promise.reject(new Error('down')));
    const { t } = await renderAtRoute(<PermissionsScreen adsenseClient={undefined} />, {
      api: fakeRoomApi({ myData: vi.fn(async () => MINE), withdrawGameConsent }),
    });
    const game = await screen.findByRole('switch', { name: new RegExp(t('permissions.game')) });
    await waitFor(() => expect(game.getAttribute('aria-checked')).toBe('true'));

    // Act
    fireEvent.click(game);
    const sheet = await screen.findByRole('dialog', { name: t('permissions.withdraw.title') });

    // Assert
    expect(sheet.textContent).toContain(t('permissions.withdraw.blocked'));
    expect(sheet.textContent).toContain(t('permissions.withdraw.deleted'));
    expect(withdrawGameConsent).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: t('permissions.withdraw.confirm') }));
    await waitFor(() => expect(withdrawGameConsent).toHaveBeenCalledOnce());
  });
});

describe('YourDataScreen', () => {
  it('should show the code for requests by email and how to use it', async () => {
    // Arrange & Act
    const { t } = await renderAtRoute(<YourDataScreen />, {
      api: fakeRoomApi({ myData: vi.fn(async () => MINE) }),
    });

    // Assert
    expect(await screen.findByText('K7Q4-MD2X-9PRT')).toBeDefined();
    expect(screen.getByText(t('yourData.codeText'))).toBeDefined();
    expect(screen.getByRole('button', { name: t('yourData.copy') })).toBeDefined();
  });
});
