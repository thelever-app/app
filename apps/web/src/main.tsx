import './styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { App } from './App.tsx';
import { createI18n } from './i18n/i18n.ts';
import source from './i18n/locales/es.json';
import { connectRoom } from './room/connect-room.ts';
import { RoomConnectionProvider } from './room/room-context.tsx';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element in index.html');
const root = createRoot(container);

async function start(): Promise<void> {
  const i18n = await createI18n();
  try {
    const connection = await connectRoom();
    root.render(
      <StrictMode>
        <I18nextProvider i18n={i18n}>
          <RoomConnectionProvider connection={connection}>
            <App />
          </RoomConnectionProvider>
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
