import type { RoomPreviewResponseDto } from '@thelever-app/protocol';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Avatar } from '../avatar/avatar.tsx';
import { Icon } from '../components/icon.tsx';
import { RoomApiError } from '../room/room-api.ts';
import { useRoomApi } from '../room/room-api-context.tsx';
import { isJoinRefusal, JoinRefusal, type JoinRefusalCode } from './join-refusal.tsx';
import { JoinRoomForm } from './join-room-form.tsx';
import screen from './screen.module.css';
import styles from './join-screen.module.css';

type Preview =
  | { readonly status: 'loading' }
  | { readonly status: 'found'; readonly room: RoomPreviewResponseDto }
  | { readonly status: 'refused'; readonly code: JoinRefusalCode }
  | { readonly status: 'failed' };

/** How many of those inside the card of the room draws; the count says how many there are. */
const VISIBLE_PLAYERS = 5;

/**
 * /join/:code, where the link, the QR and the code field lead: whose room it is, what kind and who
 * is inside before entering, and the avatar and the nickname to enter with. A room that turns the player away, before or
 * on joining, leaves the screen to the reason why.
 */
export function JoinScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { code = '' } = useParams();
  const api = useRoomApi();
  // The answer keeps the code it answers: while it answers another one, the screen is loading.
  const [answer, setAnswer] = useState<{ readonly code: string; readonly preview: Preview }>();

  useEffect(() => {
    let current = true;
    api.previewRoom(code).then(
      (room) => {
        if (current) setAnswer({ code, preview: { status: 'found', room } });
      },
      (error: unknown) => {
        if (!current) return;
        const refusal = error instanceof RoomApiError ? error.code : undefined;
        setAnswer({
          code,
          preview: isJoinRefusal(refusal)
            ? { status: 'refused', code: refusal }
            : { status: 'failed' },
        });
      },
    );
    return () => {
      current = false;
    };
  }, [api, code]);
  const preview: Preview = answer?.code === code ? answer.preview : { status: 'loading' };

  // Whoever typed the code goes back to it, as they left it; whoever came by the link or the QR,
  // to the start. A room that does not exist sends everyone to type another code.
  const fromCode = (useLocation().state as { fromCode?: boolean } | null)?.fromCode === true;
  const back = () => void (fromCode ? navigate(-1) : navigate('/'));
  const tryAnotherCode = () => void (fromCode ? navigate(-1) : navigate('/join'));
  const home = () => void navigate('/');
  if (preview.status === 'refused') {
    const action = preview.code === 'room-code-not-found' ? tryAnotherCode : home;
    return <JoinRefusal code={preview.code} onAction={action} />;
  }

  return (
    <div className={screen.screen}>
      <div className={styles.body}>
        <button type="button" className={styles.back} aria-label={t('home.back')} onClick={back}>
          <Icon name="arrowBack" />
        </button>
        {preview.status === 'loading' && <p>{t('joinRoom.loading')}</p>}
        {preview.status === 'failed' && <p role="alert">{t('roomErrors.unknown')}</p>}
        {preview.status === 'found' && (
          <>
            <section
              className={styles.preview}
              aria-label={t('joinRoom.roomOf', { host: preview.room.hostNickname, code })}
            >
              <span className={styles.signage} data-testid="room-of">
                {t('joinRoom.roomOf', { host: preview.room.hostNickname, code })}
              </span>
              <div className={styles.inside}>
                <ul className={styles.avatars} data-testid="room-avatars">
                  {preview.room.players.slice(0, VISIBLE_PLAYERS).map(({ avatar }, index) => (
                    <li key={index}>
                      <Avatar avatar={avatar} size="xs" />
                    </li>
                  ))}
                </ul>
                <span className={styles.count} data-testid="player-count">
                  {t('joinRoom.inTheRoom', { count: preview.room.players.length })}
                </span>
              </div>
              <p className={styles.line} data-testid="room-variant">
                <Icon
                  name={preview.room.variant === 'nominal' ? 'visibility' : 'visibilityOff'}
                  size={20}
                />
                <span>
                  <strong>{t(`variant.${preview.room.variant}.name`)}</strong>{' '}
                  {t(`variant.${preview.room.variant}.text`)}
                </span>
              </p>
              {preview.room.adultsOnly && (
                <p className={styles.line} data-testid="room-adults-only">
                  {t('joinRoom.adultsOnly')}
                </p>
              )}
            </section>
            <JoinRoomForm
              roomId={preview.room.roomId}
              players={preview.room.players}
              suggestedAvatar={preview.room.suggestedAvatar}
              onRefused={(refusal) =>
                setAnswer({ code, preview: { status: 'refused', code: refusal } })
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
