import './styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { App } from './App.tsx';
import { createI18n } from './i18n/i18n.ts';
import { connectRoom } from './room/connect-room.ts';
import { RoomConnectionProvider } from './room/room-context.tsx';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element in index.html');
const root = createRoot(container);
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
