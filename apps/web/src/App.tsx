import { Navigate, Route, Routes } from 'react-router';
import { HomeScreen } from './screens/home-screen.tsx';
import { JoinCodeScreen } from './screens/join-code-screen.tsx';
import { JoinScreen } from './screens/join-screen.tsx';
import { PlayDilemmaScreen } from './screens/play-dilemma-screen.tsx';
import { RoomScreen } from './screens/room-screen.tsx';

/**
 * The addresses of the web. The room, not its game, has the address: it outlives the rematch,
 * and its lobby and its game share it. A public page of a dilemma leads to /new/:publicId to play
 * it with the group. Any other address goes back to the start.
 */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/join" element={<JoinCodeScreen />} />
      <Route path="/join/:code" element={<JoinScreen />} />
      <Route path="/new/:publicId" element={<PlayDilemmaScreen />} />
      <Route path="/rooms/:roomId" element={<RoomScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
