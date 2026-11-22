import type { AvatarDto, RoomSettingsDto } from '@thelever-app/protocol';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import mascotWaiting from '../assets/brand/mascot-waiting.svg';
import { Avatar } from '../avatar/avatar.tsx';
import { namesakesOf } from '../avatar/namesakes.ts';
import { Icon } from '../components/icon.tsx';
import { useLobby } from '../room/room-provider.tsx';
import { useMuted } from '../sound/sound-context.tsx';
import { DilemmaText } from '../game/dilemma-text.tsx';
import { useLeavingPlayers } from './leaving-players.ts';
import { AvatarPickerSheet } from './avatar-picker-sheet.tsx';
import type { Category } from './categories.ts';
import { ExpelSheet } from './expel-sheet.tsx';
import { shareInvitation, spelled } from './invitation.ts';
import { PickRoundDilemmaSheet } from './pick-round-dilemma-sheet.tsx';
import { QrScreen } from './qr-screen.tsx';
import { AMBIENCE_ICONS } from './ambiences.ts';
import { CompromisingNotice } from './compromising-notice.tsx';
import { RoomSettingsSheet } from './room-settings-sheet.tsx';
import { dilemmaOf, type RoundRow, roundNumbersByDilemma, roundRows } from './rounds.ts';
import styles from './lobby-screen.module.css';
import { HOME_PATH } from '../home-path.ts';

type Open =
  | { readonly sheet: 'none' | 'settings' | 'avatar' | 'qr' }
  | { readonly sheet: 'expel'; readonly playerId: string }
  | { readonly sheet: 'choose'; readonly roundId: number };

/** The commands whose rejection the lobby explains above its action. */
const EXPLAINED = ['start-game', 'change-avatar', 'choose-round-dilemma', 'clear-round-dilemma'];

/**
 * The lobby: the code to invite with, the configuration, who is in the room and, for the host,
 * starting the game. What it shows comes from the server; each change goes back as a command.
 */
export function LobbyScreen() {
  const { t } = useTranslation();
  const say = t as unknown as Translate;
  const navigate = useNavigate();
  const { lobby, send, rejection } = useLobby();
  const [open, setOpen] = useState<Open>({ sheet: 'none' });
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useMuted();
  const { rows, gone } = useLeavingPlayers(lobby.players);
  const close = () => setOpen({ sheet: 'none' });
  // In the lobby of a rematch, the first round whose categories have nothing new left to play.
  const exhaustedIndex = lobby.rounds.findIndex(
    (round) => round.origin === 'random' && round.withoutNewDilemmas,
  );
  const exhausted = exhaustedIndex === -1 ? undefined : exhaustedIndex + 1;

  const isHost = lobby.hostId === lobby.playerId;
  const host = lobby.players.find(({ playerId }) => playerId === lobby.hostId);
  const self = lobby.players.find(({ playerId }) => playerId === lobby.playerId);
  // The room says how many it needs, by its variant: the screen only counts what is missing.
  const missing = Math.max(0, lobby.minimumPlayers - lobby.players.length);
  // A dilemma about someone in the group needs more players than the game: the screen warns of it.
  const warnsOfTheGap =
    lobby.players.length < lobby.minimumPlayersForTheGap &&
    lobby.rounds.some((round) => round.origin !== 'random' && round.dilemma?.hasGap);
  const { settings } = lobby;
  // Whoever is not the host is told what compromising dilemmas are when they find them on: on
  // entering a room that has them, or when the host turns them on. What was on before is kept to
  // notice the change while the screen draws, with no effect.
  const [compromisingBefore, setCompromisingBefore] = useState(false);
  const [warned, setWarned] = useState(true);
  if (settings.compromisingDilemmas !== compromisingBefore) {
    setCompromisingBefore(settings.compromisingDilemmas);
    if (settings.compromisingDilemmas && !isHost) setWarned(false);
  }
  const leave = () => {
    // Out of the room: the others see them go, and they may join again.
    send({ type: 'leave-room' });
    void navigate(HOME_PATH);
  };

  const share = async () => {
    const shared = await shareInvitation(lobby.code, t('lobby.shareText', { code: lobby.code }));
    if (shared === 'copied') setCopied(true);
  };

  const expelled =
    open.sheet === 'expel' && lobby.players.find((p) => p.playerId === open.playerId);
  // Only while the round is still empty and of the players: once someone fills it, it closes.
  const choosing =
    open.sheet === 'choose'
      ? lobby.rounds.find(
          (round) =>
            round.roundId === open.roundId && round.origin === 'players' && round.dilemma === null,
        )
      : undefined;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <span className={styles.signage}>{t('lobby.codeLabel')}</span>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={t('sound.mute')}
              aria-pressed={muted}
              onClick={() => setMuted(!muted)}
            >
              <Icon name={muted ? 'volumeOff' : 'volumeUp'} />
            </button>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={t('lobby.leave')}
              onClick={leave}
            >
              <Icon name="close" />
            </button>
          </div>
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
          <div className={styles.ambienceRow}>
            <span className={styles.ambienceName} data-testid="room-ambience">
              <Icon name={AMBIENCE_ICONS[lobby.ambience]} size={22} />
              {t(`ambience.${lobby.ambience}.name`)}
            </span>
            {isHost ? (
              <button
                type="button"
                className={styles.configure}
                onClick={() => setOpen({ sheet: 'settings' })}
              >
                <Icon name="tune" size={20} />
                {t('lobby.configure')}
              </button>
            ) : (
              <span className={styles.signage}>{t('lobby.ambience')}</span>
            )}
          </div>
          <div className={styles.divider} />
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
          {settings.compromisingDilemmas && (
            <div className={styles.variant}>
              <Icon name="heartBroken" size={22} />
              <p className={styles.variantText}>
                <strong>{t('lobby.compromising.name')}</strong> {t('lobby.compromising.text')}
              </p>
            </div>
          )}
          {settings.adultsOnly && (
            <div className={styles.variant}>
              <Icon name="adultsOnly" size={22} />
              <p className={styles.variantText}>
                <strong>{t('lobby.adults.name')}</strong> {t('lobby.adults.text')}
              </p>
            </div>
          )}
          <div className={styles.divider} />
          <div className={styles.summaryRow}>
            <span className={styles.summaryText}>
              <span className={styles.summaryDilemmas} data-testid="room-dilemmas">
                {t('lobby.roundCount', { count: lobby.rounds.length })}
              </span>
              <span className={styles.muted} data-testid="room-settings">
                {summaryOf(settings, say)}
              </span>
            </span>
          </div>
        </section>

        {lobby.place === 'remote' && (
          <div className={styles.advice} role="note">
            <Icon name="videocam" size={22} />
            <span>{t('lobby.remote')}</span>
          </div>
        )}

        <section className={styles.rounds} aria-labelledby="lobby-rounds">
          <h2 id="lobby-rounds" className={styles.signage}>
            {t('lobby.rounds.title', { count: lobby.rounds.length })}
          </h2>
          <ol className={styles.roundList}>
            {roundRows(lobby.rounds).map((row) => (
              <RoundRowItem
                key={row.round.roundId}
                row={row}
                hostName={host?.nickname ?? ''}
                isHost={isHost}
                onChoose={() => setOpen({ sheet: 'choose', roundId: row.round.roundId })}
                onClear={() => send({ type: 'clear-round-dilemma', roundId: row.round.roundId })}
              />
            ))}
          </ol>
          {warnsOfTheGap && (
            <p role="status" className={styles.gapWarning}>
              <Icon name="personPin" size={22} />
              <span>
                <strong className={styles.gapWarningTitle}>{t('lobby.gapWarningTitle')}</strong>{' '}
                {t('lobby.gapWarning', { minimum: lobby.minimumPlayersForTheGap })}
              </span>
            </p>
          )}
          {exhausted !== undefined && (
            <p
              role="status"
              className={styles.gapWarning}
              data-testid="rounds-without-new-dilemmas"
            >
              <Icon name="warning" size={22} />
              <span className={styles.noticeText}>
                <span>{t('lobby.noNewDilemmasNotice', { round: exhausted })}</span>
                {isHost && (
                  <button
                    type="button"
                    className={styles.change}
                    onClick={() => setOpen({ sheet: 'settings' })}
                  >
                    {t('lobby.changeCategories')}
                  </button>
                )}
              </span>
            </p>
          )}
          <span className={styles.caption}>
            {lobby.rounds.some(({ origin }) => origin === 'players')
              ? t('lobby.rounds.secretHint')
              : t('lobby.rounds.hint')}
          </span>
        </section>

        <section className={styles.players} aria-labelledby="players-in-room">
          <h2 id="players-in-room" className={styles.signage}>
            {t('lobby.players', { count: lobby.players.length })}
          </h2>
          <ul className={styles.playerList}>
            {rows.map(({ player, leaving }) => {
              if (leaving) {
                return (
                  <li
                    key={player.playerId}
                    className={styles.leaving}
                    data-leaving
                    aria-hidden="true"
                    onAnimationEnd={(event) => {
                      // Only its own animation: one of something inside the row bubbles up too.
                      if (event.target === event.currentTarget) gone(player.playerId);
                    }}
                  >
                    <div className={styles.player}>
                      <Avatar avatar={player.avatar} />
                      <span className={styles.playerName}>{player.nickname}</span>
                    </div>
                  </li>
                );
              }
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
                  className={styles.joining}
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
        {rejection?.command && EXPLAINED.includes(rejection.command) && (
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

      {open.sheet === 'settings' && lobby.ambiences && (
        <RoomSettingsSheet
          roomId={lobby.roomId}
          settings={settings}
          ambience={lobby.ambience}
          hasPlayerUnderEighteen={lobby.hasPlayerUnderEighteen}
          rounds={lobby.rounds}
          onSave={(changes) => send({ type: 'change-settings', changes })}
          ambiences={lobby.ambiences}
          onClose={close}
        />
      )}
      {!warned && <CompromisingNotice onUnderstood={() => setWarned(true)} onLeave={leave} />}
      {choosing && (
        <PickRoundDilemmaSheet
          roomId={lobby.roomId}
          roundNumber={lobby.rounds.indexOf(choosing) + 1}
          taken={roundNumbersByDilemma(lobby.rounds.map((round) => dilemmaOf(round)?.dilemmaId))}
          onPick={({ dilemmaId }) =>
            send({ type: 'choose-round-dilemma', roundId: choosing.roundId, dilemmaId })
          }
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

/** The translation of a key, as the helpers of the lobby use it. */
type Translate = (key: string, options?: Readonly<Record<string, unknown>>) => string;

/** «60 s por dilema». */
function summaryOf(settings: RoomSettingsDto, t: Translate): string {
  return t('lobby.summary', { seconds: settings.timePerDilemmaSeconds });
}

/** «Todas las categorías», «Honestidad», «Honestidad o Lealtad» or «3 categorías». */
function categoriesOf(categories: readonly Category[] | null, t: Translate): string {
  if (categories === null) return t('lobby.rounds.allCategories');
  const [first, second] = categories.map((category) => t(`categories.${category}`));
  if (categories.length === 1) return first ?? '';
  if (categories.length === 2) return t('lobby.rounds.twoCategories', { first, second });
  return t('lobby.rounds.someCategories', { count: categories.length });
}

/** How many of them, and from which categories: all, this one or these. */
function randomMeta(categories: readonly Category[] | null, count: number, t: Translate): string {
  const from = categories === null ? 'All' : categories.length === 1 ? 'One' : 'Some';
  return count > 1
    ? t(`lobby.rounds.randomGroup${from}`, { count })
    : t(`lobby.rounds.random${from}`);
}

/** «…, 2 solo +18» or «…, 1 solo comprometido y 1 solo +18», after what the row is. */
function withContents(meta: string, row: RoundRow, t: Translate): string {
  const parts = [
    ...(row.compromising > 0
      ? [t('lobby.rounds.onlyCompromising', { count: row.compromising })]
      : []),
    ...(row.adultsOnly > 0 ? [t('lobby.rounds.onlyAdults', { count: row.adultsOnly })] : []),
  ];
  return parts.length === 0 ? meta : `${meta} · ${parts.join(', ')}`;
}

interface RoundRowItemProps {
  readonly row: RoundRow;
  /** The host, who chose the dilemma of each specific round. */
  readonly hostName: string;
  readonly isHost: boolean;
  readonly onChoose: () => void;
  readonly onClear: () => void;
}

/**
 * A round of the lobby, or several random ones of the same categories in a row. Everyone sees the
 * dilemma of a round once it has one, never who of the players chose it: only that player can take
 * it out.
 */
function RoundRowItem({ row, hostName, isHost, onChoose, onClear }: RoundRowItemProps) {
  const { t } = useTranslation();
  const say = t as unknown as Translate;
  const { from, to, round } = row;
  const someone = t('pickDilemmas.someone');
  const number = from === to ? `${from}` : `${from}–${to}`;
  const icon =
    round.origin === 'random'
      ? 'shuffle'
      : round.origin === 'specific'
        ? 'pushPin'
        : 'groupsOutline';
  const dilemma = dilemmaOf(round);

  const title = dilemma ? (
    <span className={styles.roundDilemma}>
      <DilemmaText text={dilemma.text} personInTheGap={someone} />
    </span>
  ) : (
    <span className={styles.roundTitle}>
      {round.origin === 'random'
        ? categoriesOf(round.categories, say)
        : t('lobby.rounds.playersEmpty')}
    </span>
  );
  const meta =
    round.origin === 'random'
      ? round.withoutNewDilemmas
        ? t('lobby.noNewDilemmas')
        : withContents(randomMeta(round.categories, to - from + 1, say), row, say)
      : round.origin === 'specific'
        ? isHost
          ? t('lobby.rounds.chosenByYou')
          : t('lobby.rounds.chosenBy', { name: hostName })
        : round.dilemma === null
          ? t('lobby.rounds.playersEmptyMeta')
          : round.chosenByYou
            ? t('lobby.rounds.chosenByYou')
            : t('lobby.rounds.chosenByPlayer');

  return (
    <li
      className={styles.round}
      data-without-new-dilemmas={
        (round.origin === 'random' && round.withoutNewDilemmas) || undefined
      }
    >
      <span className={styles.roundNumber}>{number}</span>
      <Icon name={icon} size={20} />
      <span className={styles.roundText}>
        {title}
        <span className={styles.caption}>{meta}</span>
      </span>
      {round.origin === 'players' && round.dilemma === null && (
        <button
          type="button"
          className={styles.chooseRound}
          aria-label={t('lobby.rounds.chooseLabel', { number: from })}
          onClick={onChoose}
        >
          {t('lobby.rounds.choose')}
        </button>
      )}
      {round.origin === 'players' && round.chosenByYou && round.dilemma !== null && (
        <button
          type="button"
          className={styles.iconButton}
          aria-label={t('lobby.rounds.clearLabel', { number: from })}
          onClick={onClear}
        >
          <Icon name="close" size={20} />
        </button>
      )}
    </li>
  );
}
