import { act, render } from '@testing-library/react';
import type { RoomStateDto } from '@thelever-app/protocol';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { createI18n } from '../../src/i18n/i18n.ts';
import { LobbyScreen } from '../../src/lobby/lobby-screen.tsx';
import type { RoomApi } from '../../src/room/room-api.ts';
import { RoomApiProvider } from '../../src/room/room-api-context.tsx';
import { RoomProvider } from '../../src/room/room-provider.tsx';
import { SoundProvider } from '../../src/sound/sound-context.tsx';
import { SILENT } from '../../src/sound/sound-effects.ts';
import { soundPreference } from '../../src/sound/sound-preference.ts';
import { fakeConnection } from './fake-connection.ts';
import { aRoom } from './room.ts';
import { fakeRoomApi } from './routing.tsx';

/** Two dilemmas of the catalog that suit the room, as the search finds them. */
export const FOUND: Awaited<ReturnType<RoomApi['searchDilemmas']>>['dilemmas'] = [
  {
    dilemmaId: 'test-dilemma-1',
    text: 'TestText1',
    minimumAge: 16,
    compromising: false,
    category: 'honesty',
    tags: ['family'],
    optionCount: 2,
  },
  {
    dilemmaId: 'test-dilemma-2',
    text: 'TestText2',
    minimumAge: 16,
    compromising: false,
    category: 'loyalty',
    tags: [],
    optionCount: 4,
  },
];

/** Luis is the one using the screen in the lobby of Ana. */
export const AS_LUIS = { playerId: 'test-luis-id' };

/** The lobby of the room as the screen of one of its players gets it. */
export async function renderLobby(room: RoomStateDto = aRoom(), api: RoomApi = fakeRoomApi()) {
  const i18n = await createI18n('es');
  const fake = fakeConnection();
  render(
    <I18nextProvider i18n={i18n}>
      <RoomApiProvider api={api}>
        <MemoryRouter>
          <SoundProvider effects={SILENT} preference={soundPreference()}>
            <RoomProvider connection={fake.connection} fallback={null} rejected={() => null}>
              <LobbyScreen />
            </RoomProvider>
          </SoundProvider>
        </MemoryRouter>
      </RoomApiProvider>
    </I18nextProvider>,
  );
  act(() => fake.deliver(room));
  return { t: i18n.t, send: fake.connection.send, deliver: fake.deliver };
}
