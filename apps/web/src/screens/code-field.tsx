import { type ChangeEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import styles from './code-field.module.css';

const CODE_LENGTH = 5;

/** The code as the room server looks for it: capitals, letters and digits, five at most. */
function normalized(typed: string): string {
  return typed
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LENGTH);
}

/**
 * The code of a room, which goes through as soon as it is complete: to the same screen the link
 * and the QR lead to. The browser does not cut what is pasted: «k7m 2q» is still K7M2Q.
 */
export function CodeField() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = normalized(event.target.value);
    setCode(next);
    if (next.length === CODE_LENGTH) void navigate(`/join/${next}`);
  };

  return (
    <input
      type="text"
      className={styles.code}
      aria-label={t('joinCode.label')}
      placeholder="·····"
      value={code}
      onChange={onChange}
      inputMode="text"
      autoCapitalize="characters"
      autoComplete="off"
      spellCheck={false}
    />
  );
}
