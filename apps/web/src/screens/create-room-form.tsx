import { GroupNatureDto, PlaceDto } from '@thelever-app/protocol';
import { useActionState, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { AvatarButton } from '../avatar/avatar-button.tsx';
import { randomAvatar } from '../avatar/random-avatar.ts';
import { Icon, type IconName } from '../components/icon.tsx';
import { AvatarPickerSheet } from '../lobby/avatar-picker-sheet.tsx';
import { SubmitButton } from '../components/submit-button.tsx';
import { lastNickname, rememberNickname } from '../identity/last-nickname.ts';
import { deviceLanguage } from '../i18n/i18n.ts';
import { useRoomApi } from '../room/room-api-context.tsx';
import { codeOf } from './room-error.ts';
import { useAccessGate } from './use-access-gate.tsx';
import styles from './form.module.css';

/** What the room is created with, as the player fills it in. */
interface CreateRoomChoices {
  readonly nickname: string;
  readonly groupNature: GroupNatureDto | undefined;
  readonly place: PlaceDto | undefined;
}

/** The first thing still to fill in, which the button asks for instead of creating the room. */
function missingOf({ nickname, groupNature, place }: CreateRoomChoices) {
  if (nickname.trim() === '') return 'nickname';
  if (groupNature === undefined) return 'groupNature';
  if (place === undefined) return 'place';
  return undefined;
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
 * Creating a room: the avatar, the nickname, the nature of the group and the place, each one a
 * single choice, on the same screen. The avatar starts at random and may be any: nobody is in the
 * room yet. The dilemmas take the language of the device; the host changes it
 * in the lobby. The button says what is still missing, and creates the room once nothing is.
 * Once created, the host enters its lobby.
 */
export function CreateRoomForm() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const api = useRoomApi();
  const { withAccess, accessCodeScreen } = useAccessGate();

  const [choices, setChoices] = useState<CreateRoomChoices>(() => ({
    nickname: lastNickname(),
    groupNature: undefined,
    place: undefined,
  }));
  const [avatar, setAvatar] = useState(() => randomAvatar());
  const [pickingAvatar, setPickingAvatar] = useState(false);
  const missing = missingOf(choices);
  // React resets the form once its action ends, and a radio goes back to its defaultChecked: the
  // radios carry the choice there, and tell it with onChange, instead of being controlled.

  // Why the last attempt failed; what the player chose stays in the fields.
  const [error, formAction, isPending] = useActionState(async (): Promise<string | undefined> => {
    const { nickname, groupNature, place } = choices;
    if (groupNature === undefined || place === undefined) return undefined;
    try {
      const created = await withAccess(() =>
        api.createRoom({
          nickname,
          avatar,
          groupNature,
          place,
          dilemmaLanguage: deviceLanguage(i18n),
        }),
      );
      // Back from the access code: the form stays as the player left it.
      if (!created) return undefined;
      rememberNickname(nickname);
      void navigate(`/rooms/${created.roomId}`);
      return undefined;
    } catch (failure) {
      return codeOf(failure);
    }
  }, undefined);

  return (
    <>
      <form action={formAction} className={styles.form}>
        <div className={styles.identity}>
          <AvatarButton avatar={avatar} onClick={() => setPickingAvatar(true)} />
          <label className={styles.field}>
            {t('createRoom.nickname')}
            <input
              className={styles.input}
              name="nickname"
              required
              maxLength={20}
              autoComplete="nickname"
              placeholder={t('createRoom.nicknamePlaceholder')}
              value={choices.nickname}
              onChange={(event) => setChoices({ ...choices, nickname: event.target.value })}
            />
          </label>
        </div>

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
                  defaultChecked={choices.groupNature === nature}
                  onChange={() => setChoices({ ...choices, groupNature: nature })}
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
                  defaultChecked={choices.place === place}
                  onChange={() => setChoices({ ...choices, place })}
                />
                <Icon name={icon} size={20} />
                {t(`createRoom.place.${place}`)}
              </label>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className={styles.error}>
            {t(`roomErrors.${error}`, { defaultValue: t('roomErrors.unknown') })}
          </p>
        )}
        <div className={styles.submit}>
          <SubmitButton
            pending={isPending}
            disabled={missing !== undefined}
            text={
              isPending
                ? t('createRoom.submitting')
                : missing
                  ? t(`createRoom.missing.${missing}`)
                  : t('createRoom.submit')
            }
          />
        </div>
        {pickingAvatar && (
          <AvatarPickerSheet
            current={avatar}
            taken={[]}
            onChoose={setAvatar}
            onClose={() => setPickingAvatar(false)}
          />
        )}
      </form>
      {accessCodeScreen}
    </>
  );
}
