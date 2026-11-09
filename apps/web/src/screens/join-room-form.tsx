import type { AvatarDto, RoomPreviewResponseDto } from '@thelever-app/protocol';
import { useActionState, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { AvatarButton } from '../avatar/avatar-button.tsx';
import { namesakesOf } from '../avatar/namesakes.ts';
import { sameAvatar } from '../avatar/random-avatar.ts';
import { SubmitButton } from '../components/submit-button.tsx';
import { lastNickname, rememberNickname } from '../identity/last-nickname.ts';
import { AvatarPickerSheet } from '../lobby/avatar-picker-sheet.tsx';
import { useRoomApi } from '../room/room-api-context.tsx';
import { isJoinRefusal, type JoinRefusalCode } from './join-refusal.tsx';
import { codeOf } from './room-error.ts';
import styles from './form.module.css';

interface JoinRoomFormProps {
  /** The room the player saw before entering: they join it by its id, not by its code. */
  readonly roomId: string;
  /** Who was inside when the player opened the room. */
  readonly players: RoomPreviewResponseDto['players'];
  /** The avatar the room suggested, which nobody inside had. */
  readonly suggestedAvatar: AvatarDto;
  /** The room turned the player away: the screen explains why, at full screen. */
  readonly onRefused: (code: JoinRefusalCode) => void;
}

/**
 * The avatar and the nickname to enter the room with: the avatar the room suggested and the last
 * nickname used, to start with. The nickname may repeat another player's, with a soft notice, and
 * so may the avatar, but not both: the picker leaves out the avatars of whoever is called the
 * same, and the button says so if the nickname makes the avatar one of them.
 */
export function JoinRoomForm({ roomId, players, suggestedAvatar, onRefused }: JoinRoomFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const api = useRoomApi();

  const [nickname, setNickname] = useState(lastNickname);
  const [avatar, setAvatar] = useState(suggestedAvatar);
  const [pickingAvatar, setPickingAvatar] = useState(false);
  // Avatars the room refused because someone with this nickname got in with them meanwhile.
  const [refused, setRefused] = useState<readonly AvatarDto[]>([]);

  const namesakes = namesakesOf(nickname, players);
  const taken = [...namesakes.map((player) => player.avatar), ...refused];
  const lookalike = taken.some((other) => sameAvatar(other, avatar));
  const missing = nickname.trim() === '' ? 'nickname' : lookalike ? 'avatar' : undefined;

  // Why the last attempt failed; the nickname stays in its field.
  const [error, formAction, isPending] = useActionState(async (): Promise<string | undefined> => {
    try {
      await api.joinRoom(roomId, nickname, avatar);
      rememberNickname(nickname);
      void navigate(`/rooms/${roomId}`);
      return undefined;
    } catch (failure) {
      const code = codeOf(failure);
      if (code === 'nickname-and-avatar-taken') {
        setRefused((before) => [...before, avatar]);
        setPickingAvatar(true);
        return code;
      }
      if (!isJoinRefusal(code)) return code;
      onRefused(code);
      return undefined;
    }
  }, undefined);

  return (
    <form action={formAction} className={styles.form}>
      <div className={styles.identity}>
        <AvatarButton avatar={avatar} onClick={() => setPickingAvatar(true)} />
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
      </div>
      {namesakes[0] && (
        <p role="status" className={styles.notice} data-testid="namesake">
          {t('joinRoom.namesake', { nickname: namesakes[0].nickname })}
        </p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error === 'nickname-and-avatar-taken'
            ? t('joinRoom.lookalikeJustJoined', { nickname: nickname.trim() })
            : t(`roomErrors.${error}`, { defaultValue: t('roomErrors.unknown') })}
        </p>
      )}
      <div className={styles.submit}>
        <SubmitButton
          pending={isPending}
          disabled={missing !== undefined}
          text={
            isPending
              ? t('joinRoom.submitting')
              : missing === 'nickname'
                ? t('joinRoom.missingNickname')
                : missing === 'avatar'
                  ? t('joinRoom.missingAvatar')
                  : t('joinRoom.submit')
          }
        />
      </div>
      {pickingAvatar && (
        <AvatarPickerSheet
          current={avatar}
          taken={taken}
          onChoose={setAvatar}
          onClose={() => setPickingAvatar(false)}
        />
      )}
    </form>
  );
}
