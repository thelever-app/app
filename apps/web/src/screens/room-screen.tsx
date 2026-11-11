import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { RoomNotices } from '../components/room-notices.tsx';
import { LateJoinNotice, useJoinedLate } from '../game/late-join-notice.tsx';
import { NewHostNotice } from '../game/new-host-notice.tsx';
import { LobbyScreen } from '../lobby/lobby-screen.tsx';
import { DecisionPhase } from '../phases/decision-phase.tsx';
import { RevealPhase } from '../phases/reveal-phase.tsx';
import { RoomApiProvider } from '../room/room-api-context.tsx';
import type { ConnectedRoom } from '../room/connect-room.ts';
import { useOpenRoom } from '../room/open-room-context.tsx';
import { RoomProvider, useRoom } from '../room/room-provider.tsx';
import { RoomMoments } from '../sound/room-moments.tsx';
import { NoReturnScreen } from './no-return-screen.tsx';

/**
 * /rooms/:roomId: the link to that room opens when the screen does and closes when it goes, and
 * the room decides what shows: its lobby, or its game once the player has one.
 */
export function RoomScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { roomId = '' } = useParams();
  const openRoom = useOpenRoom();
  const [room, setRoom] = useState<ConnectedRoom | undefined>(undefined);

  useEffect(() => {
    // The link may open after the screen went, or after it moved to another room: then it closes.
    let current = true;
    let opened: ConnectedRoom | undefined;
    openRoom(roomId).then(
      (connected) => {
        if (current) {
          opened = connected;
          setRoom(connected);
        } else {
          connected.connection.close();
        }
      },
      (error: unknown) => console.error(error),
    );
    return () => {
      current = false;
      opened?.connection.close();
      setRoom(undefined);
    };
  }, [openRoom, roomId]);

  const connecting = <p>{t('app.connecting')}</p>;
  if (!room) return connecting;
  return (
    <RoomApiProvider api={room.api}>
      <RoomProvider
        connection={room.connection}
        fallback={connecting}
        rejected={(code) => (
          <NoReturnScreen
            code={code}
            onReload={() => window.location.reload()}
            onHome={() => void navigate('/')}
          />
        )}
      >
        <RoomNotices />
        <RoomMoments />
        <RoomContent />
      </RoomProvider>
    </RoomApiProvider>
  );
}

/** The lobby, or the game: first the notice of who has just joined it late, then its round. */
export function RoomContent() {
  const { lobby, game } = useRoom();
  const { joinedLate, forget } = useJoinedLate();
  if (lobby) return <LobbyScreen />;
  if (game && joinedLate) return <LateJoinNotice game={game} onEnter={forget} />;
  return (
    <>
      {game?.round.phase === 'reveal' ? <RevealPhase /> : <DecisionPhase />}
      <NewHostNotice />
    </>
  );
}
