import { RoomNotices } from './components/room-notices.tsx';
import { DecisionPhase } from './phases/decision-phase.tsx';

export function App() {
  return (
    <>
      <RoomNotices />
      <DecisionPhase />
    </>
  );
}
