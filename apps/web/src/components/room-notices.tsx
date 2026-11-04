import { useRoom } from '../room/room-provider.tsx';
import { AnswerNotSaved } from './answer-not-saved.tsx';
import { PausedBar } from './paused-bar.tsx';
import { ReconnectingBar } from './reconnecting-bar.tsx';

/**
 * What the screen has to know about the room beyond the game: the link is down or paused, or an
 * answer was not saved.
 */
export function RoomNotices() {
  const { status, rejection, dismissRejection } = useRoom();

  if (status === 'reconnecting') return <ReconnectingBar />;
  if (status === 'paused') return <PausedBar />;
  if (rejection?.command === 'answer-dilemma') {
    return <AnswerNotSaved onDismiss={dismissRejection} />;
  }
  return null;
}
