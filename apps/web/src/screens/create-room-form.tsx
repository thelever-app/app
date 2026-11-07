import { GroupNatureDto, PlaceDto } from '@thelever-app/protocol';
import { useActionState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Icon, type IconName } from '../components/icon.tsx';
import { SubmitButton } from '../components/submit-button.tsx';
import { lastNickname, rememberNickname } from '../identity/last-nickname.ts';
import { deviceLanguage } from '../i18n/i18n.ts';
import { useRoomApi } from '../room/room-api-context.tsx';
import { codeOf } from './room-error.ts';
import styles from './form.module.css';

/** What the form shows after each attempt: why it failed, and what the player had written. */
interface CreateRoomState {
  readonly error: string | undefined;
  readonly nickname: string;
  readonly groupNature: string;
  readonly place: string;
}

const NATURES: readonly (readonly [GroupNatureDto, IconName])[] = [
  ['family', 'familyRestroom'],
  ['friends', 'groups'],
  ['work', 'work'],
  ['mixed', 'diversity'],
];

const PLACES: readonly (readonly [PlaceDto, IconName])[] = [
  ['together', 'groups'],
  ['remote', 'videocam'],
];

/**
 * Creating a room: the nickname, the nature of the group and the place, each one a single
 * choice, on the same screen. The dilemmas take the language of the device; the host changes it
 * in the lobby. Once created, the host enters its lobby.
 */
export function CreateRoomForm() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const api = useRoomApi();

  const [state, formAction, isPending] = useActionState(
    async (_previous: CreateRoomState, form: FormData): Promise<CreateRoomState> => {
      const typed = {
        nickname: String(form.get('nickname') ?? ''),
        groupNature: String(form.get('groupNature') ?? ''),
        place: String(form.get('place') ?? ''),
      };
      try {
        const { roomId } = await api.createRoom({
          nickname: typed.nickname,
          groupNature: GroupNatureDto.parse(typed.groupNature),
          place: PlaceDto.parse(typed.place),
          dilemmaLanguage: deviceLanguage(i18n),
        });
        rememberNickname(typed.nickname);
        void navigate(`/rooms/${roomId}`);
        return { ...typed, error: undefined };
      } catch (error) {
        return { ...typed, error: codeOf(error) };
      }
    },
    { error: undefined, nickname: lastNickname(), groupNature: '', place: '' },
  );

  return (
    <form action={formAction} className={styles.form}>
      <label className={styles.field}>
        {t('createRoom.nickname')}
        <input
          className={styles.input}
          name="nickname"
          required
          maxLength={20}
          autoComplete="nickname"
          placeholder={t('createRoom.nicknamePlaceholder')}
          defaultValue={state.nickname}
        />
      </label>

      <fieldset className={styles.choice}>
        <legend className={styles.legend}>{t('createRoom.groupNature.label')}</legend>
        <div className={styles.natures}>
          {NATURES.map(([nature, icon]) => (
            <label key={nature} className={styles.nature}>
              <input
                className={styles.radio}
                type="radio"
                name="groupNature"
                value={nature}
                required
                defaultChecked={state.groupNature === nature}
              />
              <Icon name={icon} size={22} />
              {t(`createRoom.groupNature.${nature}`)}
            </label>
          ))}
        </div>
        <p className={styles.hint}>{t('createRoom.groupNature.hint')}</p>
      </fieldset>

      <fieldset className={styles.choice}>
        <legend className={styles.legend}>{t('createRoom.place.label')}</legend>
        <div className={styles.places}>
          {PLACES.map(([place, icon]) => (
            <label key={place} className={styles.place}>
              <input
                className={styles.radio}
                type="radio"
                name="place"
                value={place}
                required
                defaultChecked={state.place === place}
              />
              <Icon name={icon} size={20} />
              {t(`createRoom.place.${place}`)}
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && (
        <p role="alert" className={styles.error}>
          {t(`roomErrors.${state.error}`, { defaultValue: t('roomErrors.unknown') })}
        </p>
      )}
      <div className={styles.submit}>
        <SubmitButton
          pending={isPending}
          text={isPending ? t('createRoom.submitting') : t('createRoom.submit')}
        />
      </div>
    </form>
  );
}
