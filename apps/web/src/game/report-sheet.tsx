import type { NicknameReportReasonDto, ReportReasonDto } from '@thelever-app/protocol';
import { Dialog, RadioGroup } from 'radix-ui';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { legalPathsIn } from '../first-access/legal-links.ts';
import styles from './report-sheet.module.css';

/** In the order of the design. */
const DILEMMA_REASONS: readonly ReportReasonDto[] = [
  'offensive',
  'confusing',
  'mistranslated',
  'illegal',
  'other',
];
const NICKNAME_REASONS: readonly NicknameReportReasonDto[] = [
  'offensive',
  'impersonation',
  'illegal',
  'other',
];
export const COMMENT_MAX_LENGTH = 280;

/** What is reported: the dilemma on screen, or the nickname of another player. */
export type ReportTarget =
  { readonly kind: 'dilemma' } | { readonly kind: 'nickname'; readonly nickname: string };

type ReasonOf<T extends ReportTarget> = T extends { kind: 'dilemma' }
  ? ReportReasonDto
  : NicknameReportReasonDto;

interface ReportSheetProps<T extends ReportTarget> {
  readonly target: T;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSend: (reason: ReasonOf<T>, comment: string) => void;
}

/**
 * «¿Qué le pasa a este dilema?», or to the nickname of a player: a reason and, if the player
 * wants, a comment, which never carries personal data.
 */
export function ReportSheet<T extends ReportTarget>({
  target,
  open,
  onOpenChange,
  onSend,
}: ReportSheetProps<T>) {
  const { t, i18n } = useTranslation();
  const titleId = useId();
  const [reason, setReason] = useState<ReasonOf<T> | undefined>(undefined);
  const [comment, setComment] = useState('');
  const reasons = (
    target.kind === 'dilemma' ? DILEMMA_REASONS : NICKNAME_REASONS
  ) as readonly ReasonOf<T>[];

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
            {target.kind === 'dilemma'
              ? t('report.title')
              : t('report.nicknameTitle', { name: target.nickname })}
          </Dialog.Title>
          <RadioGroup.Root
            className={styles.reasons}
            aria-labelledby={titleId}
            value={reason ?? ''}
            onValueChange={(value) => setReason(value as ReasonOf<T>)}
          >
            {reasons.map((id) => (
              <RadioGroup.Item key={id} value={id} className={styles.reason}>
                {t(`report.reasons.${id as ReportReasonDto | NicknameReportReasonDto}`)}
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
            <span>
              {t('report.noPersonalData')}{' '}
              <a
                className={styles.privacy}
                href={legalPathsIn(i18n.resolvedLanguage ?? 'es').privacy}
                target="_blank"
                rel="noopener"
              >
                {t('report.privacy')}
              </a>
            </span>
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
