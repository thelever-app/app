import { Navigate, Route, Routes } from 'react-router';
import { FirstAccessGate } from './first-access/first-access-gate.tsx';
import { HOME_PATH } from './home-path.ts';
import { HomeScreen } from './screens/home-screen.tsx';
import { JoinCodeScreen } from './screens/join-code-screen.tsx';
import { JoinScreen } from './screens/join-screen.tsx';
import { PlayDilemmaScreen } from './screens/play-dilemma-screen.tsx';
import { VoteAloneScreen } from './vote-alone/vote-alone-screen.tsx';
import { RoomScreen } from './screens/room-screen.tsx';

/**
 * The addresses of the web. The room, not its game, has the address: it outlives the rematch,
 * and its lobby and its game share it. The app starts at /app: the root of the domain is the home
 * of the public web. A public page of a dilemma leads to /new/:publicId to play it with the group.
 * Any other address goes back to the start of the app. Every address waits for the first access
 * of the device, and then opens.
 */
export function App({ adsenseClient }: { readonly adsenseClient?: string | undefined }) {
  return (
    <FirstAccessGate adsenseClient={adsenseClient}>
      <Routes>
        <Route path={HOME_PATH} element={<HomeScreen />} />
        <Route path="/join" element={<JoinCodeScreen />} />
        <Route path="/join/:code" element={<JoinScreen />} />
        <Route path="/new/:publicId" element={<PlayDilemmaScreen />} />
        <Route path="/vote/:publicId" element={<VoteAloneScreen />} />
        <Route path="/rooms/:roomId" element={<RoomScreen />} />
        <Route path="*" element={<Navigate to={HOME_PATH} replace />} />
      </Routes>
    </FirstAccessGate>
  );
}
