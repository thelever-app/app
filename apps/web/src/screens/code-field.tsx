import { type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './code-field.module.css';

export const CODE_LENGTH = 5;

/** The code as the room server looks for it: capitals, letters and digits, five at most. */
function normalized(typed: string): string {
  return typed
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LENGTH);
}

interface CodeFieldProps {
  readonly code: string;
  readonly onChange: (code: string) => void;
}

/**
 * The code of a room, large and spaced. The browser does not cut what is pasted: «k7m 2q» is
 * still K7M2Q. Its ring turns ink once the code is complete.
 */
export function CodeField({ code, onChange }: CodeFieldProps) {
  const { t } = useTranslation();
  return (
    <input
      type="text"
      className={styles.code}
      data-complete={code.length === CODE_LENGTH || undefined}
      aria-label={t('joinCode.label')}
      placeholder="·····"
      value={code}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(normalized(event.target.value))}
      inputMode="text"
      autoCapitalize="characters"
      autoComplete="off"
      spellCheck={false}
    />
  );
}
