import type { FirstAccessResponseDto } from '@thelever-app/protocol';
import { useActionState, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomApi } from '../room/room-api-context.tsx';
import { RoomApiError } from '../room/room-api.ts';
import screen from '../screens/screen.module.css';
import styles from './first-access.module.css';

/** The oldest year of birth on the list, as the room server accepts. */
const EARLIEST_YEAR = 1900;

interface AgeScreenProps {
  /** Where the first access is once the age is declared. */
  readonly onDeclared: (status: FirstAccessResponseDto) => void;
}

/** What the form says after it is sent: nothing, the month the room server asks for, or a fault. */
type Outcome = 'none' | 'month-needed' | 'failed';

/**
 * The year of birth, with no year chosen and no word of the minimum age; the month only
 * when the room server asks for it, of who may be under 18. Once sent, it never changes.
 */
export function AgeScreen({ onDeclared }: AgeScreenProps) {
  const { t, i18n } = useTranslation();
  const api = useRoomApi();
  const yearId = useId();
  const monthId = useId();
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const thisYear = new Date().getFullYear();
  const years = Array.from(
    { length: thisYear - EARLIEST_YEAR + 1 },
    (_, index) => thisYear - index,
  );
  const monthName = new Intl.DateTimeFormat(i18n.language, { month: 'long' });

  const [outcome, declare, pending] = useActionState<Outcome>(async (previous) => {
    const needsMonth = previous === 'month-needed';
    try {
      onDeclared(await api.declareAge(Number(year), needsMonth ? Number(month) : undefined));
      return 'none';
    } catch (error) {
      if (error instanceof RoomApiError && error.code === 'month-of-birth-needed') {
        return 'month-needed';
      }
      // Declared from another tab of the device: it goes on from where the first access is now.
      if (error instanceof RoomApiError && error.code === 'age-already-declared') {
        try {
          onDeclared(await api.openApp());
          return 'none';
        } catch {
          return 'failed';
        }
      }
      return 'failed';
    }
  }, 'none');
  const asksMonth = outcome === 'month-needed';
  const ready = year !== '' && (!asksMonth || month !== '');

  return (
    <div className={`${screen.screen} ${screen.fixed}`}>
      <form className={styles.step} action={declare}>
        <span className={styles.stepOf}>{t('firstAccess.stepOf', { step: 1, total: 2 })}</span>
        <h1 className={styles.title}>{t('firstAccess.age.title')}</h1>
        <p className={styles.lead}>{t('firstAccess.age.lead')}</p>
        <label className={styles.field} htmlFor={yearId}>
          {t('firstAccess.age.year')}
          <select
            id={yearId}
            className={styles.select}
            value={year}
            onChange={(event) => {
              setYear(event.target.value);
              setMonth('');
            }}
          >
            <option value="">{t('firstAccess.age.chooseYear')}</option>
            {years.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        {asksMonth && (
          <label className={styles.field} htmlFor={monthId}>
            {t('firstAccess.age.month')}
            <select
              id={monthId}
              className={styles.select}
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            >
              <option value="">{t('firstAccess.age.chooseMonth')}</option>
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index} value={index + 1}>
                  {monthName.format(new Date(2000, index, 15))}
                </option>
              ))}
            </select>
          </label>
        )}
        {outcome === 'failed' && (
          <p className={styles.error} role="alert">
            {t('roomErrors.unknown')}
          </p>
        )}
        <div className={styles.grow} />
        <button type="submit" className={styles.primary} disabled={!ready || pending}>
          {t('firstAccess.continue')}
        </button>
      </form>
    </div>
  );
}
