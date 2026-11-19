import { Dialog } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '../components/icon.tsx';
import styles from './first-access.module.css';

const WAYS: readonly (readonly ['ads' | 'research', IconName])[] = [
  ['ads', 'ad'],
  ['research', 'science'],
];

interface FundingSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

/** How TheLever is funded (RF-117), from the game consent. */
export function FundingSheet({ open, onOpenChange }: FundingSheetProps) {
  const { t } = useTranslation();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.sheet} aria-describedby={undefined}>
          <div className={styles.sheetHeader}>
            <Dialog.Title className={styles.sheetTitle}>
              {t('firstAccess.funding.title')}
            </Dialog.Title>
            <Dialog.Close className={styles.close} aria-label={t('firstAccess.funding.close')}>
              <Icon name="close" />
            </Dialog.Close>
          </div>
          <p className={styles.title}>{t('firstAccess.funding.lead')}</p>
          <ul className={styles.points}>
            {WAYS.map(([way, icon]) => (
              <li key={way} className={styles.point}>
                <span className={styles.pointIcon}>
                  <Icon name={icon} size={20} />
                </span>
                <p className={styles.pointText}>
                  <strong>{t(`firstAccess.funding.${way}.title`)}</strong>{' '}
                  {t(`firstAccess.funding.${way}.text`)}
                </p>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
