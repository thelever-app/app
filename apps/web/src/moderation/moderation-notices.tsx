import type { ModerationNoticeDto } from '@thelever-app/protocol';
import { Dialog } from 'radix-ui';
import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import { forgetNickname } from '../identity/last-nickname.ts';
import { useRoomApi } from '../room/room-api-context.tsx';
import { deviceLanguage } from '../i18n/i18n.ts';
import styles from './moderation-notices.module.css';

/**
 * The decisions on the reports of the player and on their nickname, only on their screen, one
 * after the other, the first time the app opens after the team decides. «Entendido» marks each
 * one as seen, and it is not shown again; one that could not be marked shows again next time.
 */
export function ModerationNotices() {
  const api = useRoomApi();
  const [notices, setNotices] = useState<readonly ModerationNoticeDto[]>([]);

  useEffect(() => {
    let current = true;
    api
      .moderationNotices()
      .then((unseen) => {
        if (current) setNotices(unseen);
      })
      // Without the room server the app opens all the same: they wait for the next time.
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [api]);

  const [notice] = notices;
  if (!notice) return null;
  const understood = () => {
    if (notice.subject.kind === 'nickname') forgetNickname(notice.subject.nickname);
    void api.seeModerationNotice(notice.id).catch(() => {});
    setNotices((shown) => shown.slice(1));
  };
  return <NoticeSheet key={notice.id} notice={notice} onUnderstood={understood} />;
}

function NoticeSheet({
  notice,
  onUnderstood,
}: {
  readonly notice: ModerationNoticeDto;
  readonly onUnderstood: () => void;
}) {
  const { t, i18n } = useTranslation();
  const language = deviceLanguage(i18n);
  const dateOf = (iso: string) =>
    new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'long' }).format(new Date(iso));
  const { subject } = notice;
  const title =
    subject.kind === 'report'
      ? t('moderationNotice.reportTitle')
      : t('moderationNotice.nicknameTitle');

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onUnderstood()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.sheet} aria-describedby={undefined}>
          <div aria-hidden="true" className={styles.handle} />
          <Dialog.Title className={styles.title}>{title}</Dialog.Title>
          {subject.kind === 'report' ? (
            <>
              <p className={styles.text}>
                <Trans
                  i18nKey={
                    subject.content.kind === 'dilemma'
                      ? 'moderationNotice.aboutDilemma'
                      : 'moderationNotice.aboutNickname'
                  }
                  values={{
                    ...(subject.content.kind === 'dilemma'
                      ? { text: subject.content.text }
                      : { nickname: subject.content.nickname }),
                    date: dateOf(subject.reportedAt),
                    reason: t(`moderationNotice.reasons.${subject.reason}`),
                  }}
                  components={{ strong: <strong /> }}
                />
              </p>
              <div className={styles.decision}>
                <Icon name="checkCircle" size={22} />
                <span>
                  <strong>
                    {notice.outcome === 'kept'
                      ? t('moderationNotice.kept')
                      : subject.content.kind === 'dilemma'
                        ? t('moderationNotice.withdrawnDilemma')
                        : t('moderationNotice.withdrawnNickname')}
                  </strong>{' '}
                  {t('moderationNotice.rule', { rule: notice.rule })}
                </span>
              </div>
            </>
          ) : (
            <>
              <p className={styles.text}>
                {t('moderationNotice.nicknameWhat', { nickname: subject.nickname })}
              </p>
              <dl className={styles.reasons}>
                <div>
                  <dt>{t('moderationNotice.reasonLabel')}</dt>
                  <dd>{t(`moderationNotice.reasonSentences.${subject.reason}`)}</dd>
                </div>
                <div>
                  <dt>{t('moderationNotice.factsLabel')}</dt>
                  <dd>{subject.facts[language] ?? subject.facts.es}</dd>
                </div>
                <div>
                  <dt>{t('moderationNotice.ruleLabel')}</dt>
                  <dd>{t('moderationNotice.ruleValue', { rule: notice.rule })}</dd>
                </div>
                <div>
                  <dt>{t('moderationNotice.whoLabel')}</dt>
                  <dd>{t('moderationNotice.whoValue')}</dd>
                </div>
              </dl>
              <p className={styles.text}>{t('moderationNotice.nicknameEffect')}</p>
            </>
          )}
          <p className={styles.appeal}>{t('moderationNotice.appeal')}</p>
          <button type="button" className={styles.understood} onClick={onUnderstood}>
            {t('moderationNotice.understood')}
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
