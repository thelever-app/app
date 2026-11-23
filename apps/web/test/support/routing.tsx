import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { vi } from 'vitest';
import { createI18n } from '../../src/i18n/i18n.ts';
import type { FirstAccessResponseDto } from '@thelever-app/protocol';
import type { RoomApi } from '../../src/room/room-api.ts';
import { RoomApiProvider } from '../../src/room/room-api-context.tsx';
import { DonationUrlProvider } from '../../src/config/donation-url.tsx';
import { SoundProvider } from '../../src/sound/sound-context.tsx';
import { SILENT } from '../../src/sound/sound-effects.ts';
import { soundPreference } from '../../src/sound/sound-preference.ts';

/** Test data: the donation page of the environment of the tests. */
export const TEST_DONATION_URL = 'https://ko-fi.test/thelever';

/** Where the first access of a device that finished it is. */
export const FIRST_ACCESS_DONE: FirstAccessResponseDto = {
  region: 'eea',
  step: 'done',
  pending: [],
  changed: [],
  current: { 'terms-of-use': 1, 'game-consent': 1 },
  underEighteen: false,
  monthOfBirthAskedFrom: 2008,
};

/** Routes of the room server that answer what the test says; anything else fails the test. */
export function fakeRoomApi(overrides: Partial<RoomApi> = {}): RoomApi {
  const unexpected = (name: string) =>
    vi.fn(() => Promise.reject(new Error(`the test did not expect ${name}`)));
  return {
    // Every device of the tests finished the first access, unless the test says otherwise.
    openApp: vi.fn(async () => FIRST_ACCESS_DONE),
    declareAge: unexpected('declareAge'),
    acceptDocument: unexpected('acceptDocument'),
    createRoom: unexpected('createRoom'),
    previewRoom: unexpected('previewRoom'),
    previewDilemma: unexpected('previewDilemma'),
    voteAlone: unexpected('voteAlone'),
    worldResult: unexpected('worldResult'),
    joinRoom: unexpected('joinRoom'),
    searchDilemmas: unexpected('searchDilemmas'),
    sendIllegalContentNotice: unexpected('sendIllegalContentNotice'),
    // Nothing decided on the reports of the device, unless the test says otherwise.
    moderationNotices: vi.fn(async () => []),
    seeModerationNotice: unexpected('seeModerationNotice'),
    enterAccessCode: vi.fn(),
    myData: unexpected('myData'),
    withdrawGameConsent: unexpected('withdrawGameConsent'),
    objectToAnalytics: unexpected('objectToAnalytics'),
    requestDataDeletion: unexpected('requestDataDeletion'),
    ...overrides,
  };
}

/** Where the screen is now, and what the history keeps with it, for a test to read after it navigates. */
function Location() {
  const { pathname, state } = useLocation();
  return (
    <output data-testid="location" data-state={JSON.stringify(state)}>
      {pathname}
    </output>
  );
}

interface RouteOptions {
  readonly api?: RoomApi;
  /** The address the screen opens at, and what the history keeps with it; / by default. */
  readonly at?: string | { readonly pathname: string; readonly state: unknown };
  /** The path of the route that shows `ui`, with its parameters; any address by default. */
  readonly path?: string;
}

/**
 * Renders `ui` in Spanish, at an address of a router in memory, with the routes of the room
 * server the test gives. `location()` says where the screen went.
 */
export async function renderAtRoute(
  ui: ReactNode,
  { api, at = '/', path = '*' }: RouteOptions = {},
) {
  const i18n = await createI18n('es');
  const preference = soundPreference();
  const rendered = render(
    <I18nextProvider i18n={i18n}>
      <RoomApiProvider api={api ?? fakeRoomApi()}>
        <SoundProvider effects={SILENT} preference={preference}>
          <DonationUrlProvider donationUrl={TEST_DONATION_URL}>
            <MemoryRouter initialEntries={[at]}>
              <Routes>
                <Route path={path} element={ui} />
                {path !== '*' && <Route path="*" element={null} />}
              </Routes>
              <Location />
            </MemoryRouter>
          </DonationUrlProvider>
        </SoundProvider>
      </RoomApiProvider>
    </I18nextProvider>,
  );
  const location = () => rendered.getByTestId('location').textContent;
  const locationState = (): unknown =>
    JSON.parse(rendered.getByTestId('location').dataset.state ?? 'null');
  return { ...rendered, t: i18n.t, i18n, preference, location, locationState };
}
