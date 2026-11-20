import type { FirstAccessResponseDto } from '@thelever-app/protocol';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FirstAccessGate } from '../../src/first-access/first-access-gate.tsx';
import { RoomApiError } from '../../src/room/room-api.ts';
import { FIRST_ACCESS_DONE, fakeRoomApi, renderAtRoute } from '../support/routing.tsx';

const ASKS_FOR_THE_AGE: FirstAccessResponseDto = {
  ...FIRST_ACCESS_DONE,
  step: 'age',
  pending: ['terms-of-use', 'game-consent'],
  underEighteen: true,
};
const ASKS_FOR_THE_DOCUMENTS: FirstAccessResponseDto = {
  ...ASKS_FOR_THE_AGE,
  step: 'documents',
  underEighteen: false,
};

afterEach(() => {
  localStorage.clear();
});

function gate() {
  return (
    <FirstAccessGate adsenseClient={undefined}>
      <h1>The app</h1>
    </FirstAccessGate>
  );
}

describe('FirstAccessGate', () => {
  it('should open the app at once on a device that finished the first access', async () => {
    // Act
    await renderAtRoute(gate(), { api: fakeRoomApi() });

    // Assert
    expect(await screen.findByRole('heading', { name: 'The app' })).toBeDefined();
  });

  it('should ask for the year of birth with no year chosen and no minimum age', async () => {
    // Arrange
    const api = fakeRoomApi({ openApp: vi.fn(async () => ASKS_FOR_THE_AGE) });
    const { t } = await renderAtRoute(gate(), { api });

    // Act
    fireEvent.click(await screen.findByRole('button', { name: t('firstAccess.welcome.start') }));

    // Assert
    const year = screen.getByRole('combobox', { name: t('firstAccess.age.year') });
    expect((year as HTMLSelectElement).value).toBe('');
    // The years of the list aside, nothing on the screen says an age.
    const page = document.body.cloneNode(true) as HTMLElement;
    for (const list of page.querySelectorAll('select')) list.remove();
    expect(page.textContent).not.toMatch(/\b1[68]\b|edad mínima/);
  });

  it('should ask for the month as soon as the year chosen is of who may be under 18', async () => {
    // Arrange
    const declareAge = vi.fn(async () => ASKS_FOR_THE_DOCUMENTS);
    const api = fakeRoomApi({ openApp: vi.fn(async () => ASKS_FOR_THE_AGE), declareAge });
    const { t } = await renderAtRoute(gate(), { api });
    fireEvent.click(await screen.findByRole('button', { name: t('firstAccess.welcome.start') }));

    // Act
    fireEvent.change(screen.getByRole('combobox', { name: t('firstAccess.age.year') }), {
      target: { value: '2008' },
    });

    // Assert
    const month = screen.getByRole('combobox', { name: t('firstAccess.age.month') });
    expect((month as HTMLSelectElement).value).toBe('');
    const next = screen.getByRole('button', { name: t('firstAccess.continue') });
    expect((next as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(month, { target: { value: '3' } });
    fireEvent.click(next);
    await waitFor(() => expect(declareAge).toHaveBeenLastCalledWith(2008, 3));
  });

  it('should not ask for the month of an adult, even after choosing the year of a minor', async () => {
    // Arrange
    const declareAge = vi.fn(async () => ASKS_FOR_THE_DOCUMENTS);
    const api = fakeRoomApi({ openApp: vi.fn(async () => ASKS_FOR_THE_AGE), declareAge });
    const { t } = await renderAtRoute(gate(), { api });
    fireEvent.click(await screen.findByRole('button', { name: t('firstAccess.welcome.start') }));
    const year = screen.getByRole('combobox', { name: t('firstAccess.age.year') });
    fireEvent.change(year, { target: { value: '2010' } });

    // Act
    fireEvent.change(year, { target: { value: '2007' } });

    // Assert
    expect(screen.queryByRole('combobox', { name: t('firstAccess.age.month') })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t('firstAccess.continue') }));
    await waitFor(() => expect(declareAge).toHaveBeenLastCalledWith(2007, undefined));
  });

  it('should ask for the month when the room server still asks for it', async () => {
    // Arrange: the year turned between opening the app and sending the age.
    const declareAge = vi
      .fn()
      .mockRejectedValueOnce(new RoomApiError('month-of-birth-needed'))
      .mockResolvedValueOnce(ASKS_FOR_THE_DOCUMENTS);
    const api = fakeRoomApi({ openApp: vi.fn(async () => ASKS_FOR_THE_AGE), declareAge });
    const { t } = await renderAtRoute(gate(), { api });
    fireEvent.click(await screen.findByRole('button', { name: t('firstAccess.welcome.start') }));
    fireEvent.change(screen.getByRole('combobox', { name: t('firstAccess.age.year') }), {
      target: { value: '2007' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('firstAccess.continue') }));

    // Act
    const month = await screen.findByRole('combobox', { name: t('firstAccess.age.month') });
    fireEvent.change(month, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: t('firstAccess.continue') }));

    // Assert
    await waitFor(() => expect(declareAge).toHaveBeenLastCalledWith(2007, 3));
    expect(
      await screen.findByRole('heading', { name: t('firstAccess.consent.title') }),
    ).toBeDefined();
  });

  it('should go on from where the first access is when the age was declared elsewhere', async () => {
    // Arrange: another tab of the device declared it while this one stayed on the age.
    const openApp = vi
      .fn()
      .mockResolvedValueOnce(ASKS_FOR_THE_AGE)
      .mockResolvedValueOnce(ASKS_FOR_THE_DOCUMENTS);
    const declareAge = vi.fn().mockRejectedValue(new RoomApiError('age-already-declared'));
    const api = fakeRoomApi({ openApp, declareAge });
    const { t } = await renderAtRoute(gate(), { api });
    fireEvent.click(await screen.findByRole('button', { name: t('firstAccess.welcome.start') }));
    fireEvent.change(screen.getByRole('combobox', { name: t('firstAccess.age.year') }), {
      target: { value: '1990' },
    });

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('firstAccess.continue') }));

    // Assert
    expect(
      await screen.findByRole('heading', { name: t('firstAccess.consent.title') }),
    ).toBeDefined();
  });

  it('should keep the documents apart, unchecked, and accept them in their order', async () => {
    // Arrange
    const acceptDocument = vi
      .fn()
      .mockResolvedValueOnce({ ...ASKS_FOR_THE_DOCUMENTS, pending: ['game-consent'] })
      .mockResolvedValueOnce(FIRST_ACCESS_DONE);
    const api = fakeRoomApi({ openApp: vi.fn(async () => ASKS_FOR_THE_DOCUMENTS), acceptDocument });
    const { t } = await renderAtRoute(gate(), { api });
    const boxes = await screen.findAllByRole('checkbox');
    const continueButton = screen.getByRole('button', { name: t('firstAccess.continue') });

    // Act & Assert: nothing checked, and nothing goes on with only the terms.
    expect(boxes.map((box) => (box as HTMLInputElement).checked)).toEqual([false, false]);
    fireEvent.click(boxes[0]!);
    expect((continueButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(boxes[1]!);
    fireEvent.click(continueButton);
    await waitFor(() => expect(acceptDocument).toHaveBeenCalledTimes(2));
    expect(acceptDocument.mock.calls).toEqual([
      ['terms-of-use', 1],
      ['game-consent', 1],
    ]);
    expect(await screen.findByRole('heading', { name: 'The app' })).toBeDefined();
  });

  it('should stay on the documents of who does not accept them, saying why', async () => {
    // Arrange
    const api = fakeRoomApi({ openApp: vi.fn(async () => ASKS_FOR_THE_DOCUMENTS) });
    const { t } = await renderAtRoute(gate(), { api });

    // Act
    fireEvent.click(await screen.findByRole('button', { name: t('firstAccess.decline') }));

    // Assert
    const said = screen.getAllByRole('status').map(({ textContent }) => textContent);
    expect(said).toContain(t('firstAccess.consent.declined').replace(/<\/?strong>/g, ''));
    expect(screen.queryByRole('heading', { name: 'The app' })).toBeNull();
  });

  it('should ask for the new terms on a screen of their own', async () => {
    // Arrange
    const changed: FirstAccessResponseDto = {
      ...ASKS_FOR_THE_DOCUMENTS,
      pending: ['terms-of-use'],
      changed: ['terms-of-use'],
    };
    const api = fakeRoomApi({ openApp: vi.fn(async () => changed) });
    const { t } = await renderAtRoute(gate(), { api });

    // Act & Assert
    expect(
      await screen.findByRole('heading', { name: t('firstAccess.newTerms.title') }),
    ).toBeDefined();
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  });

  it('should stop for good under the minimum age', async () => {
    // Arrange
    const api = fakeRoomApi({
      openApp: vi.fn(async () => ({ ...ASKS_FOR_THE_AGE, step: 'under-minimum-age' as const })),
    });
    const { t } = await renderAtRoute(gate(), { api });

    // Act & Assert
    expect(
      await screen.findByRole('heading', { name: t('firstAccess.underage.title') }),
    ).toBeDefined();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('should say that TheLever is not available in a blocked country', async () => {
    // Arrange
    const api = fakeRoomApi({
      openApp: vi.fn(async () => ({
        ...ASKS_FOR_THE_AGE,
        region: 'blocked' as const,
        step: 'blocked-country' as const,
      })),
    });
    const { t } = await renderAtRoute(gate(), { api });

    // Act & Assert
    expect(
      await screen.findByRole('heading', { name: t('firstAccess.country.title') }),
    ).toBeDefined();
  });
});
