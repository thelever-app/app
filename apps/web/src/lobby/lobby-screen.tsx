import type { AvatarDto, RoomSettingsDto } from '@thelever-app/protocol';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import mascotWaiting from '../assets/brand/mascot-waiting.svg';
import { Avatar } from '../avatar/avatar.tsx';
import { namesakesOf } from '../avatar/namesakes.ts';
import { Icon } from '../components/icon.tsx';
import { useLobby } from '../room/room-provider.tsx';
import { AddDilemmaSheet } from './add-dilemma-sheet.tsx';
import { AvatarPickerSheet } from './avatar-picker-sheet.tsx';
import { ExpelSheet } from './expel-sheet.tsx';
import { isCategory } from './categories.ts';
import { invitationLink, spelled } from './invitation.ts';
import { PickDilemmasSheet } from './pick-dilemmas-sheet.tsx';
import { QrScreen } from './qr-screen.tsx';
import { RoomSettingsSheet } from './room-settings-sheet.tsx';
import styles from './lobby-screen.module.css';

type Open =
  | { readonly sheet: 'none' | 'settings' | 'pick' | 'add' | 'avatar' | 'qr' }
  | { readonly sheet: 'expel'; readonly playerId: string };

/**
 * The lobby: the code to invite with, the configuration, who is in the room and, for the host,
 * starting the game. What it shows comes from the server; each change goes back as a command.
 */
export function LobbyScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { lobby, send, rejection } = useLobby();
  const [open, setOpen] = useState<Open>({ sheet: 'none' });
  const [copied, setCopied] = useState(false);
  const close = () => setOpen({ sheet: 'none' });

  const isHost = lobby.hostId === lobby.playerId;
  const host = lobby.players.find(({ playerId }) => playerId === lobby.hostId);
  const self = lobby.players.find(({ playerId }) => playerId === lobby.playerId);
  // The room says how many it needs, by its variant: the screen only counts what is missing.
  const missing = Math.max(0, lobby.minimumPlayers - lobby.players.length);
  const { settings } = lobby;

  const share = async () => {
    const url = invitationLink(lobby.code);
    const text = t('lobby.shareText', { code: lobby.code });
    if (navigator.share) {
      // The player may close the share sheet: that is not an error.
      await navigator.share({ title: 'TheLever', text, url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
  };

  const expelled =
    open.sheet === 'expel' && lobby.players.find((p) => p.playerId === open.playerId);

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <span className={styles.signage}>{t('lobby.codeLabel')}</span>
          <button
            type="button"
            className={styles.iconButton}
            aria-label={t('lobby.leave')}
            onClick={() => void navigate('/')}
          >
            <Icon name="close" />
          </button>
        </div>
        <p className={styles.code} aria-label={spelled(lobby.code)} data-testid="room-code">
          {lobby.code}
        </p>
        <div className={styles.shareRow}>
          <button type="button" className={styles.share} onClick={() => void share()}>
            <Icon name="iosShare" size={20} />
            {copied ? t('lobby.copied') : t('lobby.share')}
          </button>
          <button type="button" className={styles.qr} onClick={() => setOpen({ sheet: 'qr' })}>
            <Icon name="qrCode" size={20} />
            {t('lobby.showQr')}
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.summary} aria-label={t('settings.title')}>
          <div className={styles.variant}>
            <Icon
              name={settings.variant === 'nominal' ? 'visibility' : 'visibilityOff'}
              size={22}
            />
            <p className={styles.variantText}>
              <strong>{t(`variant.${settings.variant}.name`)}</strong>{' '}
              {t(`variant.${settings.variant}.text`)}
            </p>
          </div>
          <div className={styles.divider} />
          <div className={styles.summaryRow}>
            <span className={styles.summaryText}>
              <span className={styles.summaryDilemmas} data-testid="room-dilemmas">
                {lobby.pickedDilemmas.length > 0
                  ? t('lobby.pickedCount', { count: lobby.pickedDilemmas.length })
                  : categoriesOf(settings, t)}
              </span>
              <span className={styles.muted} data-testid="room-settings">
                {summaryOf(settings, lobby.groupNature, lobby.pickedDilemmas.length > 0, t)}
                {settings.adultsOnly && ` · ${t('lobby.adultsOnly')}`}
              </span>
            </span>
            {isHost && (
              <button
                type="button"
                className={styles.change}
                onClick={() => setOpen({ sheet: 'settings' })}
              >
                {t('lobby.change')}
              </button>
            )}
          </div>
        </section>

        {lobby.place === 'remote' && (
          <div className={styles.advice} role="note">
            <Icon name="videocam" size={22} />
            <span>{t('lobby.remote')}</span>
          </div>
        )}

        {lobby.pickedDilemmas.length > 0 && (
          <section className={styles.dilemmas} aria-labelledby="picked-dilemmas">
            <h2 id="picked-dilemmas" className={styles.signage}>
              {t('lobby.picked.title', { count: lobby.pickedDilemmas.length })}
            </h2>
            {lobby.pickedDilemmas.map(({ dilemmaId, text }) => (
              <div key={dilemmaId} className={styles.dilemma}>
                <span className={styles.dilemmaText}>{text}</span>
              </div>
            ))}
          </section>
        )}

        {isHost && lobby.addedDilemmas.length > 0 && (
          <section className={styles.dilemmas} aria-labelledby="added-dilemmas">
            <h2 id="added-dilemmas" className={styles.signage}>
              {t('lobby.added.title', {
                count: lobby.addedDilemmas.length,
                total: settings.dilemmaCount,
              })}
            </h2>
            {lobby.addedDilemmas.map(({ dilemmaId, text }) => (
              <div key={dilemmaId} className={styles.dilemma}>
                <span className={styles.dilemmaText}>{text}</span>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label={t('lobby.added.remove')}
                  onClick={() => send({ type: 'remove-added-dilemma', dilemmaId })}
                >
                  <Icon name="close" size={20} />
                </button>
              </div>
            ))}
            <span className={styles.caption}>{t('lobby.added.hint')}</span>
          </section>
        )}

        {settings.dilemmasPerPlayer > 0 && (
          <AddCard
            own={lobby.addedDilemmas.filter(({ dilemmaId }) =>
              lobby.ownAddedDilemmaIds.includes(dilemmaId),
            )}
            allowed={settings.dilemmasPerPlayer}
            onAdd={() => setOpen({ sheet: 'add' })}
            onRemove={(dilemmaId) => send({ type: 'remove-added-dilemma', dilemmaId })}
          />
        )}

        <section className={styles.players} aria-labelledby="players-in-room">
          <h2 id="players-in-room" className={styles.signage}>
            {t('lobby.players', { count: lobby.players.length })}
          </h2>
          <ul className={styles.playerList}>
            {lobby.players.map((player) => {
              const isSelf = player.playerId === lobby.playerId;
              const name = isSelf ? t('lobby.you', { name: player.nickname }) : player.nickname;
              const action = isSelf
                ? () => setOpen({ sheet: 'avatar' })
                : isHost
                  ? () => setOpen({ sheet: 'expel', playerId: player.playerId })
                  : undefined;
              const label = isSelf
                ? t('lobby.toChangeAvatar', { name: player.nickname })
                : isHost
                  ? t('lobby.toExpel', { name: player.nickname })
                  : undefined;
              const content = (
                <>
                  <Avatar avatar={player.avatar} dimmed={!player.connected} />
                  <span className={styles.playerName}>{name}</span>
                  {player.playerId === lobby.hostId && (
                    <span className={styles.tag}>{t('lobby.host')}</span>
                  )}
                </>
              );
              return (
                <li
                  key={player.playerId}
                  data-player-id={player.playerId}
                  data-nickname={player.nickname}
                >
                  {action ? (
                    <button
                      type="button"
                      className={styles.player}
                      aria-label={label}
                      onClick={action}
                    >
                      {content}
                    </button>
                  ) : (
                    <div className={styles.player}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {missing > 0 && (
          <p className={styles.waiting}>
            <img src={mascotWaiting} alt="" width={64} height={64} />
            {t('lobby.waiting')}
          </p>
        )}
      </main>

      <footer className={styles.footer}>
        {(rejection?.command === 'start-game' || rejection?.command === 'change-avatar') && (
          <p role="alert" className={styles.rejection}>
            {t(`roomErrors.${rejection.code}`, { defaultValue: t('roomErrors.unknown') })}
          </p>
        )}
        {isHost ? (
          <button
            type="button"
            className={styles.start}
            disabled={missing > 0}
            onClick={() => send({ type: 'start-game' })}
          >
            {missing > 0 ? t('lobby.missing', { count: missing }) : t('lobby.start')}
          </button>
        ) : (
          <p className={styles.guestWait}>{t('lobby.guestWait', { host: host?.nickname ?? '' })}</p>
        )}
      </footer>

      {/* Picking dilemmas opens over the settings, which keep what the host changed meanwhile. */}
      {(open.sheet === 'settings' || open.sheet === 'pick') && (
        <RoomSettingsSheet
          settings={settings}
          pickedCount={lobby.pickedDilemmas.length}
          onSave={(changes) => send({ type: 'change-settings', changes })}
          onPlayByCategories={() => send({ type: 'pick-dilemmas', dilemmaIds: [] })}
          onPickDilemmas={() => setOpen({ sheet: 'pick' })}
          onClose={close}
        />
      )}
      {open.sheet === 'pick' && (
        <PickDilemmasSheet
          roomId={lobby.roomId}
          picked={lobby.pickedDilemmas.map(({ dilemmaId }) => dilemmaId)}
          onPick={(dilemmaIds) => send({ type: 'pick-dilemmas', dilemmaIds: [...dilemmaIds] })}
          onClose={() => setOpen({ sheet: 'settings' })}
        />
      )}
      {open.sheet === 'add' && (
        <AddDilemmaSheet
          roomId={lobby.roomId}
          onAdd={(dilemmaId) => send({ type: 'add-dilemma', dilemmaId })}
          onClose={close}
        />
      )}
      {open.sheet === 'avatar' && self && (
        <AvatarPickerSheet
          current={self.avatar}
          taken={namesakesOf(
            self.nickname,
            lobby.players.filter(({ playerId }) => playerId !== lobby.playerId),
          ).map(({ avatar }) => avatar)}
          onChoose={({ face, color }: AvatarDto) => send({ type: 'change-avatar', face, color })}
          onClose={close}
        />
      )}
      {expelled && (
        <ExpelSheet
          player={expelled}
          onExpel={() => send({ type: 'expel-player', playerId: expelled.playerId })}
          onClose={close}
        />
      )}
      {open.sheet === 'qr' && <QrScreen code={lobby.code} onClose={close} />}
    </div>
  );
}

type Translate = ReturnType<typeof useTranslation>['t'];

/** «Todas las categorías», «Ninguna categoría», «Honestidad» or «3 categorías». */
function categoriesOf({ categories }: RoomSettingsDto, t: Translate): string {
  if (categories === null) return t('lobby.categories.all');
  const [only] = categories;
  if (only === undefined) return t('lobby.categories.none');
  if (categories.length === 1 && isCategory(only)) return t(`categories.${only}`);
  return t('lobby.categories.some', { count: categories.length });
}

/** «8 dilemas · 60 s por dilema · Español · Amigos»; with dilemmas picked, they say how many there are. */
function summaryOf(
  settings: RoomSettingsDto,
  groupNature: string,
  picked: boolean,
  t: Translate,
): string {
  const values = {
    count: settings.dilemmaCount,
    seconds: settings.timePerDilemmaSeconds,
    language: t(`languages.${settings.dilemmaLanguage}`),
    nature: t(`createRoom.groupNature.${groupNature as 'friends'}`),
  };
  return picked ? t('lobby.summaryPicked', values) : t('lobby.summary', values);
}

interface AddCardProps {
  /** The dilemmas the player using the screen added. */
  readonly own: readonly { readonly dilemmaId: string; readonly text: string }[];
  /** How many each player may add. */
  readonly allowed: number;
  readonly onAdd: () => void;
  readonly onRemove: (dilemmaId: string) => void;
}

/** Each player, the host too, adds dilemmas up to what the room allows, and removes their own. */
function AddCard({ own, allowed, onAdd, onRemove }: AddCardProps) {
  const { t } = useTranslation();
  return (
    <section className={styles.addCard} aria-labelledby="add-dilemma">
      <h2 id="add-dilemma" className={styles.addTitle}>
        {t('lobby.add.title')}
      </h2>
      <span>{t('lobby.add.count', { count: own.length, total: allowed })}</span>
      {own.map(({ dilemmaId, text }) => (
        <div key={dilemmaId} className={styles.ownDilemma}>
          <span className={styles.ownDilemmaText}>{text}</span>
          <button
            type="button"
            className={styles.ownRemove}
            aria-label={t('lobby.add.remove')}
            onClick={() => onRemove(dilemmaId)}
          >
            <Icon name="close" size={20} />
          </button>
        </div>
      ))}
      {own.length < allowed && (
        <button type="button" className={styles.addButton} onClick={onAdd}>
          <Icon name="add" size={20} />
          {t('lobby.add.action')}
        </button>
      )}
    </section>
  );
}
