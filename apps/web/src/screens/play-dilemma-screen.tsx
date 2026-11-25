import type { DilemmaPreviewResponseDto } from '@thelever-app/protocol';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { Icon } from '../components/icon.tsx';
import { RoomApiError } from '../room/room-api.ts';
import { useRoomApi } from '../room/room-api-context.tsx';
import { CreateRoomForm } from './create-room-form.tsx';
import { JoinRefusal } from './join-refusal.tsx';
import { useAccessGate } from './use-access-gate.tsx';
import screen from './screen.module.css';
import styles from './play-dilemma-screen.module.css';
import { HOME_PATH } from '../home-path.ts';

type Preview =
  | { readonly status: 'loading' }
  | { readonly status: 'found'; readonly dilemma: DilemmaPreviewResponseDto }
  | { readonly status: 'not-found' }
  | { readonly status: 'only-for-adults' }
  | { readonly status: 'failed' };

/**
 * /new/:publicId, where «Play it with my group» of a public page leads: the dilemma the room starts
 * with, from the public id of the link, and the form to create the room, which puts it in its first
 * round and takes its language for the dilemmas; the other rounds are random.
 */
export function PlayDilemmaScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { publicId = '' } = useParams();
  const api = useRoomApi();
  // The answer keeps the public id it answers: while it answers another one, the screen is loading.
  const [answer, setAnswer] = useState<{ readonly publicId: string; readonly preview: Preview }>();
  const home = () => void navigate(HOME_PATH);
  // Whoever came by a link without the access code writes it before seeing the dilemma.
  const { withAccess, accessCodeScreen } = useAccessGate(home);

  useEffect(() => {
    let current = true;
    withAccess(() => api.previewDilemma(publicId, { toStartARoom: true })).then(
      (dilemma) => {
        // Without a dilemma, the visitor went back from the access code, and leaves the screen.
        if (current && dilemma) setAnswer({ publicId, preview: { status: 'found', dilemma } });
      },
      (error: unknown) => {
        if (!current) return;
        const code = error instanceof RoomApiError ? error.code : undefined;
        const status =
          code === 'dilemma-not-found'
            ? 'not-found'
            : code === 'dilemma-only-for-adults'
              ? 'only-for-adults'
              : 'failed';
        setAnswer({ publicId, preview: { status } });
      },
    );
    return () => {
      current = false;
    };
  }, [api, publicId, withAccess]);
  const preview: Preview = answer?.publicId === publicId ? answer.preview : { status: 'loading' };

  // Someone under 18 never sees a dilemma for adults: only that it is for adults.
  if (preview.status === 'only-for-adults') {
    return <JoinRefusal code="dilemma-only-for-adults" onAction={home} />;
  }

  return (
    <div className={screen.screen}>
      <div className={styles.body}>
        <div className={styles.top}>
          <button type="button" className={styles.back} aria-label={t('home.back')} onClick={home}>
            <Icon name="arrowBack" />
          </button>
          <h1 className={styles.title}>{t('playDilemma.title')}</h1>
        </div>
        {preview.status === 'loading' && <p>{t('playDilemma.loading')}</p>}
        {preview.status === 'not-found' && <p role="alert">{t('playDilemma.notFound')}</p>}
        {preview.status === 'failed' && <p role="alert">{t('roomErrors.unknown')}</p>}
        {preview.status === 'found' && (
          <>
            <CreateRoomForm firstDilemma={preview.dilemma} />
          </>
        )}
      </div>
      {accessCodeScreen}
    </div>
  );
}
