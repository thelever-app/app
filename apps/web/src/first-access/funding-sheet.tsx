import { Dialog } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import { FundingPoints } from './funding-points.tsx';
import styles from './first-access.module.css';

interface FundingSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

/** How TheLever is funded, from the game consent. */
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
          <FundingPoints />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
