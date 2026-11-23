import {
  type AmbienceDto,
  type LanguageDto,
  NICKNAME_MAX_LENGTH,
  withoutHiddenCharacters,
  PlaceDto,
} from '@thelever-app/protocol';
import { useActionState, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { AvatarButton } from '../avatar/avatar-button.tsx';
import { randomAvatar } from '../avatar/random-avatar.ts';
import { Icon, type IconName } from '../components/icon.tsx';
import { useUnderEighteen } from '../first-access/device-age.tsx';
import { AMBIENCE_ICONS, AMBIENCES, isForAdults } from '../lobby/ambiences.ts';
import { AvatarPickerSheet } from '../lobby/avatar-picker-sheet.tsx';
import { SubmitButton } from '../components/submit-button.tsx';
import { playedDilemmas } from '../game/played-dilemmas.ts';
import { lastNickname, rememberNickname } from '../identity/last-nickname.ts';
import { deviceLanguage } from '../i18n/i18n.ts';
import { useRoomApi } from '../room/room-api-context.tsx';
import { codeOf } from './room-error.ts';
import { useAccessGate } from './use-access-gate.tsx';
import styles from './form.module.css';

/** What the room is created with, as the player fills it in. */
interface CreateRoomChoices {
  readonly nickname: string;
  readonly place: PlaceDto | undefined;
  readonly ambience: AmbienceDto | undefined;
}

/** The first thing still to fill in, which the button asks for instead of creating the room. */
function missingOf({ nickname, place, ambience }: CreateRoomChoices) {
  if (nickname.trim() === '') return 'nickname';
  if (place === undefined) return 'place';
  if (ambience === undefined) return 'ambience';
  return undefined;
}

export interface CreateRoomFormProps {
  /** The dilemma of the general catalog for the first round of the room, with its language. */
  readonly firstDilemma?: { readonly dilemmaId: string; readonly language: LanguageDto };
}

const PLACES: readonly (readonly [PlaceDto, IconName])[] = [
  ['together', 'groups'],
  ['remote', 'videocam'],
];

/**
 * Creating a room: the avatar, the nickname, the place and the ambience, each one a single choice,
 * on the same screen; who declared they are under 18 cannot choose an
 * ambience for adults. The avatar starts at random and may be any: nobody is in the
 * room yet. The dilemmas take the language of the device, or that of the dilemma of its first
 * round; the host changes it in the lobby. The button says what is still missing, and creates the
 * room once nothing is. Once created, the host enters its lobby.
 */
export function CreateRoomForm({ firstDilemma }: CreateRoomFormProps = {}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const api = useRoomApi();
  const { withAccess, accessCodeScreen } = useAccessGate();
  const underEighteen = useUnderEighteen();

  const [choices, setChoices] = useState<CreateRoomChoices>(() => ({
    nickname: lastNickname(),
    place: undefined,
    ambience: undefined,
  }));
  const [avatar, setAvatar] = useState(() => randomAvatar());
  const [pickingAvatar, setPickingAvatar] = useState(false);
  const missing = missingOf(choices);
  // React resets the form once its action ends, and a radio goes back to its defaultChecked: the
  // radios carry the choice there, and tell it with onChange, instead of being controlled.

  // Why the last attempt failed; what the player chose stays in the fields.
  const [error, formAction, isPending] = useActionState(async (): Promise<string | undefined> => {
    const { nickname, place, ambience } = choices;
    if (place === undefined || ambience === undefined) {
      return undefined;
    }
    try {
      const created = await withAccess(() =>
        api.createRoom({
          nickname,
          ambience,
          avatar,
          place,
          dilemmaLanguage: firstDilemma?.language ?? deviceLanguage(i18n),
          ...(firstDilemma && { firstRoundDilemmaId: firstDilemma.dilemmaId }),
          playedDilemmaIds: playedDilemmas(),
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
              maxLength={NICKNAME_MAX_LENGTH}
              autoComplete="nickname"
              placeholder={t('createRoom.nicknamePlaceholder')}
              value={choices.nickname}
              onChange={(event) =>
                setChoices({ ...choices, nickname: withoutHiddenCharacters(event.target.value) })
              }
            />
          </label>
        </div>

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

        <fieldset className={styles.choice}>
          <legend className={styles.legend}>{t('createRoom.ambience')}</legend>
          <div className={styles.ambiences}>
            {AMBIENCES.map((ambience) => {
              const locked = underEighteen && isForAdults(ambience);
              return (
                <label key={ambience} className={styles.ambience} data-locked={locked || undefined}>
                  <input
                    className={styles.radio}
                    type="radio"
                    name="ambience"
                    value={ambience}
                    required
                    disabled={locked}
                    defaultChecked={choices.ambience === ambience}
                    onChange={() => setChoices({ ...choices, ambience })}
                  />
                  <span className={styles.ambienceIcon}>
                    <Icon name={locked ? 'lock' : AMBIENCE_ICONS[ambience]} size={22} />
                  </span>
                  <span className={styles.ambienceText}>
                    <span className={styles.ambienceName}>{t(`ambience.${ambience}.name`)}</span>
                    <span>{t(`ambience.${ambience}.line`)}</span>
                    <span className={styles.ambienceNote}>
                      {locked ? t('ambience.onlyAdults') : t(`ambience.${ambience}.example`)}
                    </span>
                  </span>
                  {!locked && (
                    <span className={styles.ambienceMark}>
                      <Icon
                        name={choices.ambience === ambience ? 'checkCircle' : 'radioUnchecked'}
                      />
                    </span>
                  )}
                </label>
              );
            })}
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
