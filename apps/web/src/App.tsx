import { Navigate, Route, Routes } from 'react-router';
import { FirstAccessGate } from './first-access/first-access-gate.tsx';
import { HOME_PATH } from './home-path.ts';
import { HomeScreen } from './screens/home-screen.tsx';
import { JoinCodeScreen } from './screens/join-code-screen.tsx';
import { JoinScreen } from './screens/join-screen.tsx';
import { PlayDilemmaScreen } from './screens/play-dilemma-screen.tsx';
import { VoteAloneScreen } from './vote-alone/vote-alone-screen.tsx';
import { RoomScreen } from './screens/room-screen.tsx';
import { IllegalContentScreen } from './moderation/illegal-content-screen.tsx';
import { ContactScreen } from './settings/contact-screen.tsx';
import { CreditsScreen } from './settings/credits-screen.tsx';
import { FundingScreen } from './settings/funding-screen.tsx';
import { NoticesScreen } from './settings/notices-screen.tsx';
import { PermissionsScreen } from './settings/permissions-screen.tsx';
import { YourDataScreen } from './settings/your-data-screen.tsx';
import { SettingsScreen } from './settings/settings-screen.tsx';
import {
  CONTACT_PATH,
  CREDITS_PATH,
  FUNDING_PATH,
  ILLEGAL_CONTENT_PATH,
  NOTICES_PATH,
  PERMISSIONS_PATH,
  SETTINGS_PATH,
  YOUR_DATA_PATH,
} from './settings/settings-paths.ts';

/**
 * The addresses of the web. The room, not its game, has the address: it outlives the rematch,
 * and its lobby and its game share it. The app starts at /app: the root of the domain is the home
 * of the public web. A public page of a dilemma leads to /new/:publicId to play it with the group.
 * Any other address goes back to the start of the app. Every address waits for the first access
 * of the device, and then opens, but the web form of illegal content, which anyone sends without
 * the app.
 */
export function App({ adsenseClient }: { readonly adsenseClient?: string | undefined }) {
  return (
    <Routes>
      <Route path={ILLEGAL_CONTENT_PATH} element={<IllegalContentScreen />} />
      <Route path="*" element={<GatedApp adsenseClient={adsenseClient} />} />
    </Routes>
  );
}

function GatedApp({ adsenseClient }: { readonly adsenseClient?: string | undefined }) {
  return (
    <FirstAccessGate adsenseClient={adsenseClient}>
      <Routes>
        <Route path={HOME_PATH} element={<HomeScreen />} />
        <Route path="/join" element={<JoinCodeScreen />} />
        <Route path="/join/:code" element={<JoinScreen />} />
        <Route path="/new/:publicId" element={<PlayDilemmaScreen />} />
        <Route path="/vote/:publicId" element={<VoteAloneScreen />} />
        <Route path="/rooms/:roomId" element={<RoomScreen />} />
        <Route path={SETTINGS_PATH} element={<SettingsScreen adsenseClient={adsenseClient} />} />
        <Route path={FUNDING_PATH} element={<FundingScreen />} />
        <Route path={CONTACT_PATH} element={<ContactScreen />} />
        <Route path={CREDITS_PATH} element={<CreditsScreen />} />
        <Route path={NOTICES_PATH} element={<NoticesScreen />} />
        <Route
          path={PERMISSIONS_PATH}
          element={<PermissionsScreen adsenseClient={adsenseClient} />}
        />
        <Route path={YOUR_DATA_PATH} element={<YourDataScreen />} />
        <Route path="*" element={<Navigate to={HOME_PATH} replace />} />
      </Routes>
    </FirstAccessGate>
  );
}
