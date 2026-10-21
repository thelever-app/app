import type { CSSProperties } from 'react';
import arrowBack from '@material-symbols/svg-500/rounded/arrow_back-fill.svg?url';
import checkCircle from '@material-symbols/svg-500/rounded/check_circle-fill.svg?url';
import close from '@material-symbols/svg-500/rounded/close-fill.svg?url';
import expandMore from '@material-symbols/svg-500/rounded/keyboard_arrow_down-fill.svg?url';
import undo from '@material-symbols/svg-500/rounded/undo-fill.svg?url';
import styles from './icon.module.css';

/** The Material Symbols the screens use, hosted with the app: never loaded from Google. */
const ICONS = { arrowBack, checkCircle, close, expandMore, undo } as const;

export type IconName = keyof typeof ICONS;

interface IconProps {
  readonly name: IconName;
  /** In pixels; 24 by default. */
  readonly size?: number;
}

/** Decorative: the element that holds it gives the accessible name. It takes the colour of its text. */
export function Icon({ name, size = 24 }: IconProps) {
  const style = { '--icon': `url("${ICONS[name]}")`, '--icon-size': `${size}px` } as CSSProperties;
  return <span aria-hidden="true" className={styles.icon} style={style} />;
}
