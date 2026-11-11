import type { GameStateDto } from '@thelever-app/protocol';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { createI18n } from '../../src/i18n/i18n.ts';
import type { RoomConnection } from '../../src/room/room-connection.ts';
import { RoomProvider } from '../../src/room/room-provider.tsx';
import { SoundProvider } from '../../src/sound/sound-context.tsx';
import { SILENT } from '../../src/sound/sound-effects.ts';
import { soundPreference } from '../../src/sound/sound-preference.ts';

interface ProvidersOptions {
  readonly connection?: RoomConnection;
  /** A room that has already sent this state, for screens and components that read it. */
  readonly game?: GameStateDto;
  /** The address the screen opens at, with what the history keeps with it. */
  readonly at?: { readonly pathname: string; readonly state: unknown };
}

function roomThatSent(game: GameStateDto): RoomConnection {
  return {
    send: () => {},
    subscribe: (listener) => {
      listener(game);
      return () => {};
    },
    subscribeStatus: (listener) => {
      listener('connected');
      return () => {};
    },
    getStatus: () => 'connected',
    close: () => {},
  };
}

/** A wrapper with i18n in Spanish, a silent game and, if given, the room, and the `t` it translates with. */
export async function providersFor({ game, at, ...options }: ProvidersOptions = {}) {
  const i18n = await createI18n('es');
  const connection = game ? roomThatSent(game) : options.connection;
  function Providers({ children }: { readonly children: ReactNode }) {
    const content = connection ? (
      <RoomProvider connection={connection} fallback={null} rejected={() => null}>
        {children}
      </RoomProvider>
    ) : (
      children
    );
    return (
      <MemoryRouter initialEntries={at ? [at] : ['/']}>
        <I18nextProvider i18n={i18n}>
          <SoundProvider effects={SILENT} preference={soundPreference()}>
            {content}
          </SoundProvider>
        </I18nextProvider>
      </MemoryRouter>
    );
  }
  return { Providers, t: i18n.t };
}

export async function renderWithProviders(ui: ReactNode, options: ProvidersOptions = {}) {
  const { Providers, t } = await providersFor(options);
  return { ...render(ui, { wrapper: Providers }), t };
}
