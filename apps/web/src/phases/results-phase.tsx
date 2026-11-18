import { useNavigate } from 'react-router';
import { HOME_PATH } from '../home-path.ts';
import { EndScreen } from '../results/end-screen.tsx';
import { RankingScreen } from '../results/ranking-screen.tsx';
import { useGame } from '../room/room-provider.tsx';

/**
 * After the last round of an anonymous room: the ranking of who reads the group best, from which
 * any player takes everyone to the end of the game.
 */
export function ResultsPhase({ onShowQr }: { readonly onShowQr: () => void }) {
  const navigate = useNavigate();
  const { game, send } = useGame();
  const leave = () => {
    send({ type: 'leave-room' });
    void navigate(HOME_PATH);
  };
  if (game.stage.kind === 'ended') return <EndScreen game={game} onLeave={leave} />;
  return (
    <RankingScreen
      game={game}
      // The results come after the last round, at the position that follows it.
      onMoveOn={() => send({ type: 'move-on', fromPosition: game.dilemmas.length })}
      onLeave={leave}
      onShowQr={onShowQr}
    />
  );
}
