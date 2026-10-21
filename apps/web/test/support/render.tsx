import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { createI18n } from '../../src/i18n/i18n.ts';
import type { RoomConnection } from '../../src/room/room-connection.ts';
import { RoomProvider } from '../../src/room/room-provider.tsx';

interface ProvidersOptions {
  readonly connection?: RoomConnection;
}

/** A wrapper with i18n in Spanish and, if given, the room connection, and the `t` it translates with. */
export async function providersFor({ connection }: ProvidersOptions = {}) {
  const i18n = await createI18n('es');
  function Providers({ children }: { readonly children: ReactNode }) {
    const content = connection ? (
      <RoomProvider connection={connection} fallback={null}>
        {children}
      </RoomProvider>
    ) : (
      children
    );
    return <I18nextProvider i18n={i18n}>{content}</I18nextProvider>;
  }
  return { Providers, t: i18n.t };
}

export async function renderWithProviders(ui: ReactNode, options: ProvidersOptions = {}) {
  const { Providers, t } = await providersFor(options);
  return { ...render(ui, { wrapper: Providers }), t };
}
