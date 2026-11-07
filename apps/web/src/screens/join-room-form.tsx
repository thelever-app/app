import { useActionState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { SubmitButton } from '../components/submit-button.tsx';
import { lastNickname, rememberNickname } from '../identity/last-nickname.ts';
import { useRoomApi } from '../room/room-api-context.tsx';
import { isJoinRefusal, JoinRefusal } from './join-refusal.tsx';
import { codeOf } from './room-error.ts';
import styles from './form.module.css';

interface JoinRoomState {
  readonly error: string | undefined;
  readonly nickname: string;
}

interface JoinRoomFormProps {
  /** The room the player saw before entering: they join it by its id, not by its code. */
  readonly roomId: string;
}

/**
 * The nickname to enter the room with, the last one used to start with; it may repeat another
 * player's, the avatar tells them apart. A room that turns the player away shows why, at full screen.
 */
export function JoinRoomForm({ roomId }: JoinRoomFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const api = useRoomApi();

  const [state, formAction, isPending] = useActionState(
    async (_previous: JoinRoomState, form: FormData): Promise<JoinRoomState> => {
      const nickname = String(form.get('nickname') ?? '');
      try {
        await api.joinRoom(roomId, nickname);
        rememberNickname(nickname);
        void navigate(`/rooms/${roomId}`);
        return { nickname, error: undefined };
      } catch (error) {
        return { nickname, error: codeOf(error) };
      }
    },
    { error: undefined, nickname: lastNickname() },
  );

  if (isJoinRefusal(state.error)) {
    return <JoinRefusal code={state.error} onAction={() => void navigate('/')} />;
  }

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
          defaultValue={state.nickname}
        />
      </label>
      {state.error && (
        <p role="alert" className={styles.error}>
          {t(`roomErrors.${state.error}`, { defaultValue: t('roomErrors.unknown') })}
        </p>
      )}
      <div className={styles.submit}>
        <SubmitButton
          pending={isPending}
          text={isPending ? t('joinRoom.submitting') : t('joinRoom.submit')}
        />
      </div>
    </form>
  );
}
