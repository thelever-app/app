import './styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { LanguageDto } from '@thelever-app/protocol';
import { App } from './App.tsx';
import { loadWebConfig } from './config/web-config.ts';
import { signInAnonymousPlayer } from './identity/anonymous-player.ts';
import { createI18n, SOURCE_LANGUAGE } from './i18n/i18n.ts';
import source from './i18n/locales/es.json';
import { connectRoom } from './room/connect-room.ts';
import { RoomProvider } from './room/room-provider.tsx';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element in index.html');
const root = createRoot(container);

async function start(): Promise<void> {
  const i18n = await createI18n();
  try {
    const language = LanguageDto.safeParse(i18n.resolvedLanguage).data ?? SOURCE_LANGUAGE;
    const connection = await connectRoom({
      pathname: window.location.pathname,
      language,
      development: import.meta.env.DEV,
      loadConfig: () => loadWebConfig(),
      signIn: signInAnonymousPlayer,
      createSocket: (url) => new WebSocket(url),
    });
    root.render(
      <StrictMode>
        <I18nextProvider i18n={i18n}>
          <RoomProvider connection={connection} fallback={<p>{i18n.t('app.connecting')}</p>}>
            <App />
          </RoomProvider>
        </I18nextProvider>
      </StrictMode>,
    );
  } catch (error) {
    console.error(error);
    root.render(<p>{i18n.t('app.unavailable')}</p>);
  }
}

// If even the translations fail to load, the message comes from the source catalog, never a blank page.
start().catch((error: unknown) => {
  console.error(error);
  root.render(<p>{source.app.unavailable}</p>);
});
