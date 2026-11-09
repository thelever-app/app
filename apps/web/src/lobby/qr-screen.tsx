import { Dialog } from 'radix-ui';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { encode } from 'uqr';
import { Icon } from '../components/icon.tsx';
import { invitationLink, spelled } from './invitation.ts';
import styles from './qr-screen.module.css';

interface QrScreenProps {
  readonly code: string;
  readonly onClose: () => void;
}

/** The modules of the QR as one path: a square per dark module. */
function pathOf(data: readonly (readonly boolean[])[]): string {
  return data
    .flatMap((row, y) => row.flatMap((dark, x) => (dark ? [`M${x} ${y}h1v1h-1z`] : [])))
    .join('');
}

/** The QR of the invitation link at full screen, for the others to point their cameras at. */
export function QrScreen({ code, onClose }: QrScreenProps) {
  const { t } = useTranslation();
  const link = invitationLink(code);
  const { size, data } = useMemo(() => encode(link, { border: 0 }), [link]);

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Content className={styles.screen} aria-describedby={undefined}>
          <Dialog.Close className={styles.close} aria-label={t('qr.close')}>
            <Icon name="close" size={26} />
          </Dialog.Close>
          <Dialog.Title className={styles.title}>{t('qr.title')}</Dialog.Title>
          <div className={styles.frame}>
            <svg
              viewBox={`0 0 ${size} ${size}`}
              width="248"
              height="248"
              role="img"
              aria-label={t('qr.label', { code })}
              shapeRendering="crispEdges"
              data-link={link}
            >
              <path d={pathOf(data)} fill="currentColor" />
            </svg>
          </div>
          <p className={styles.code} aria-label={t('qr.code', { code: spelled(code) })}>
            {code}
          </p>
          <p className={styles.or}>{t('qr.or', { host: window.location.host })}</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
