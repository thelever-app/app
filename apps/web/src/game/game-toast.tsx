import type { ReactNode } from 'react';
import styles from './game-toast.module.css';

interface GameToastProps {
  readonly children: ReactNode;
  /** The hazard stripe of the time that ran out, along its top edge. */
  readonly hazard?: boolean;
}

/** A card that floats over the bottom of the screen, above the actions, and is read out when it shows. */
export function GameToast({ children, hazard = false }: GameToastProps) {
  return (
    <div role="status" className={styles.toast}>
      {hazard && <div aria-hidden="true" className={styles.hazard} />}
      <div className={styles.content}>{children}</div>
    </div>
  );
}
