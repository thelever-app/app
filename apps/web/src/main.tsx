import './styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router';
import { App } from './App.tsx';
import { loadWebConfig } from './config/web-config.ts';
import { deviceAccessCode } from './identity/access-code.ts';
import { signInAnonymousPlayer } from './identity/anonymous-player.ts';
import { lazyPlayer } from './identity/lazy-player.ts';
import { createI18n, deviceLanguage } from './i18n/i18n.ts';
import source from './i18n/locales/es.json';
import { connectRoom } from './room/connect-room.ts';
import { documentActivity } from './room/document-activity.ts';
import { httpRoomApi } from './room/room-api.ts';
import { RoomApiProvider } from './room/room-api-context.tsx';
import { OpenRoomProvider, type OpenRoom } from './room/open-room-context.tsx';
import { newTraceparent } from './room/traceparent.ts';
import answerConfirmed from './assets/sounds/answer-confirmed.m4a';
import dilemmaRevealed from './assets/sounds/dilemma-revealed.m4a';
import gameStarted from './assets/sounds/game-started.m4a';
import lastSeconds from './assets/sounds/last-seconds.m4a';
import playerJoined from './assets/sounds/player-joined.m4a';
import { SoundProvider } from './sound/sound-context.tsx';
import { soundPreference } from './sound/sound-preference.ts';
import { browserAudio, webSoundEffects } from './sound/web-sound-effects.ts';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element in index.html');
const root = createRoot(container);

/**
 * Composition root of the web: the config of the environment, the player, signed in when a call
 * first needs it, the HTTP routes of the room server, how to open the link to a room and the sound
 * of the game.
 */
async function start(): Promise<void> {
  const i18n = await createI18n();
  try {
    const language = deviceLanguage(i18n);
    const config = await loadWebConfig();
    const player = lazyPlayer(() => signInAnonymousPlayer(config));
    const api = httpRoomApi({
      realtimeUrl: config.realtimeUrl,
      player,
      accessCode: deviceAccessCode(),
      newTraceparent,
    });
    const openRoom: OpenRoom = (roomId) =>
      connectRoom({
        roomId,
        language,
        development: import.meta.env.DEV,
        realtimeUrl: config.realtimeUrl,
        player,
        api,
        createSocket: (url) => new WebSocket(url),
        pageActivity: documentActivity(document),
      });
    const preference = soundPreference();
    const effects = webSoundEffects(
      {
        'player-joined': playerJoined,
        'game-started': gameStarted,
        'answer-confirmed': answerConfirmed,
        'last-seconds': lastSeconds,
        'dilemma-revealed': dilemmaRevealed,
      },
      preference,
      browserAudio(),
    );
    root.render(
      <StrictMode>
        <I18nextProvider i18n={i18n}>
          <RoomApiProvider api={api}>
            <OpenRoomProvider openRoom={openRoom}>
              <SoundProvider effects={effects} preference={preference}>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </SoundProvider>
            </OpenRoomProvider>
          </RoomApiProvider>
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
