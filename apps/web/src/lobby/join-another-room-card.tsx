import { type FormEvent, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { CODE_LENGTH, normalizedCode } from '../screens/code-field.tsx';
import type { JoinState } from '../screens/join-screen.tsx';
import styles from './join-another-room-card.module.css';

interface JoinAnotherRoomCardProps {
  /** The room of the host, which closes once they join the other one. */
  readonly leavingRoomId: string;
}

/**
 * For a host alone in the lobby, when someone else of the group created a room too: the code of
 * that room, which goes through «Entrar» once complete, to the join screen of always.
 */
export function JoinAnotherRoomCard({ leavingRoomId }: JoinAnotherRoomCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const titleId = useId();
  const [code, setCode] = useState('');
  const complete = code.length === CODE_LENGTH;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!complete) return;
    const state: JoinState = { fromCode: true, leavingRoomId };
    void navigate(`/join/${code}`, { state });
  };

  return (
    <section className={styles.card} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.title}>
        {t('lobby.joinOther.title')}
      </h2>
      <p className={styles.hint}>{t('lobby.joinOther.hint')}</p>
      <form className={styles.row} onSubmit={onSubmit}>
        <input
          type="text"
          className={styles.code}
          aria-label={t('lobby.joinOther.code')}
          placeholder={t('lobby.joinOther.placeholder')}
          value={code}
          onChange={(event) => setCode(normalizedCode(event.target.value))}
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className={styles.enter} disabled={!complete}>
          {t('joinCode.enter')}
        </button>
      </form>
    </section>
  );
}
