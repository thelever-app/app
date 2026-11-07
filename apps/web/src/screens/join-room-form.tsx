import { useActionState, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { SubmitButton } from '../components/submit-button.tsx';
import { lastNickname, rememberNickname } from '../identity/last-nickname.ts';
import { useRoomApi } from '../room/room-api-context.tsx';
import { isJoinRefusal, type JoinRefusalCode } from './join-refusal.tsx';
import { codeOf } from './room-error.ts';
import styles from './form.module.css';

interface JoinRoomFormProps {
  /** The room the player saw before entering: they join it by its id, not by its code. */
  readonly roomId: string;
  /** The room turned the player away: the screen explains why, at full screen. */
  readonly onRefused: (code: JoinRefusalCode) => void;
}

/**
 * The nickname to enter the room with, the last one used to start with; it may repeat another
 * player's, the avatar tells them apart. The button asks for it while it is blank.
 */
export function JoinRoomForm({ roomId, onRefused }: JoinRoomFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const api = useRoomApi();

  const [nickname, setNickname] = useState(lastNickname);

  // Why the last attempt failed; the nickname stays in its field.
  const [error, formAction, isPending] = useActionState(async (): Promise<string | undefined> => {
    try {
      await api.joinRoom(roomId, nickname);
      rememberNickname(nickname);
      void navigate(`/rooms/${roomId}`);
      return undefined;
    } catch (failure) {
      const code = codeOf(failure);
      if (!isJoinRefusal(code)) return code;
      onRefused(code);
      return undefined;
    }
  }, undefined);

  return (
    <form action={formAction} className={styles.form}>
      <label className={styles.field}>
        {t('joinRoom.nickname')}
        <input
          className={styles.input}
          name="nickname"
          required
          maxLength={20}
          autoComplete="nickname"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className={styles.error}>
          {t(`roomErrors.${error}`, { defaultValue: t('roomErrors.unknown') })}
        </p>
      )}
      <div className={styles.submit}>
        <SubmitButton
          pending={isPending}
          disabled={nickname.trim() === ''}
          text={
            isPending
              ? t('joinRoom.submitting')
              : nickname.trim() === ''
                ? t('joinRoom.missingNickname')
                : t('joinRoom.submit')
          }
        />
      </div>
    </form>
  );
}
