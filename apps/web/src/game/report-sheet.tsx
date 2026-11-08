import type { ReportReasonDto } from '@thelever-app/protocol';
import { Dialog, RadioGroup } from 'radix-ui';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './report-sheet.module.css';

/** In the order of the design; «Puede ser ilegal» waits for the legal review. */
const REASONS: readonly ReportReasonDto[] = ['offensive', 'confusing', 'mistranslated', 'other'];
export const COMMENT_MAX_LENGTH = 280;

interface ReportSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSend: (reason: ReportReasonDto, comment: string) => void;
}

/** «¿Qué le pasa a este dilema?»: a reason and, if the player wants, a comment. */
export function ReportSheet({ open, onOpenChange, onSend }: ReportSheetProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const [reason, setReason] = useState<ReportReasonDto | undefined>(undefined);
  const [comment, setComment] = useState('');

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setReason(undefined);
          setComment('');
        }
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.sheet} aria-describedby={undefined}>
          <div aria-hidden="true" className={styles.handle} />
          <Dialog.Title id={titleId} className={styles.title}>
            {t('report.title')}
          </Dialog.Title>
          <RadioGroup.Root
            className={styles.reasons}
            aria-labelledby={titleId}
            value={reason ?? ''}
            onValueChange={(value) => setReason(value as ReportReasonDto)}
          >
            {REASONS.map((id) => (
              <RadioGroup.Item key={id} value={id} className={styles.reason}>
                {t(`report.reasons.${id}`)}
              </RadioGroup.Item>
            ))}
          </RadioGroup.Root>
          <label className={styles.commentLabel}>
            {t('report.comment')}
            <textarea
              className={styles.comment}
              rows={3}
              maxLength={COMMENT_MAX_LENGTH}
              placeholder={t('report.placeholder')}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </label>
          <p className={styles.hint}>
            <span>{t('report.noPersonalData')}</span>
            <span className={styles.counter}>
              {t('report.counter', { count: comment.length, max: COMMENT_MAX_LENGTH })}
            </span>
          </p>
          <button
            type="button"
            className={styles.send}
            disabled={reason === undefined}
            onClick={() => {
              if (reason === undefined) return;
              onSend(reason, comment);
              setReason(undefined);
              setComment('');
            }}
          >
            {reason === undefined ? t('report.chooseReason') : t('report.send')}
          </button>
          <p className={styles.note}>{t('report.note')}</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
