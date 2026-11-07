import styles from './submit-button.module.css';

export interface SubmitButtonProps {
  /** While the form is being sent: the button cannot be pressed again. */
  readonly pending: boolean;
  /** While the form is not complete: the text says what is missing. */
  readonly disabled?: boolean;
  readonly text: string;
}

/** The main action of a form, at the bottom of its screen. */
export function SubmitButton({ pending, disabled = false, text }: SubmitButtonProps) {
  return (
    <button type="submit" className={styles.button} disabled={pending || disabled}>
      {text}
    </button>
  );
}
