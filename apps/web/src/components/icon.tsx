import type { CSSProperties } from 'react';
import arrowBack from '@material-symbols/svg-500/rounded/arrow_back-fill.svg?url';
import checkCircle from '@material-symbols/svg-500/rounded/check_circle-fill.svg?url';
import close from '@material-symbols/svg-500/rounded/close-fill.svg?url';
import error from '@material-symbols/svg-500/rounded/error.svg?url';
import expandMore from '@material-symbols/svg-500/rounded/keyboard_arrow_down-fill.svg?url';
import refresh from '@material-symbols/svg-500/rounded/refresh-fill.svg?url';
import timer from '@material-symbols/svg-500/rounded/timer-fill.svg?url';
import undo from '@material-symbols/svg-500/rounded/undo-fill.svg?url';
import addCircle from '@material-symbols/svg-500/rounded/add_circle-fill.svg?url';
import add from '@material-symbols/svg-500/rounded/add.svg?url';
import checkBox from '@material-symbols/svg-500/rounded/check_box-fill.svg?url';
import checkBoxBlank from '@material-symbols/svg-500/rounded/check_box_outline_blank.svg?url';
import chevronRight from '@material-symbols/svg-500/rounded/chevron_right.svg?url';
import diversity from '@material-symbols/svg-500/rounded/diversity_3-fill.svg?url';
import flag from '@material-symbols/svg-500/rounded/flag.svg?url';
import familyRestroom from '@material-symbols/svg-500/rounded/family_restroom-fill.svg?url';
import groups from '@material-symbols/svg-500/rounded/groups-fill.svg?url';
import iosShare from '@material-symbols/svg-500/rounded/ios_share.svg?url';
import logout from '@material-symbols/svg-500/rounded/logout.svg?url';
import moreVert from '@material-symbols/svg-500/rounded/more_vert.svg?url';
import pin from '@material-symbols/svg-500/rounded/pin.svg?url';
import playCircle from '@material-symbols/svg-500/rounded/play_circle.svg?url';
import qrCode from '@material-symbols/svg-500/rounded/qr_code_2.svg?url';
import search from '@material-symbols/svg-500/rounded/search.svg?url';
import sync from '@material-symbols/svg-500/rounded/sync.svg?url';
import videocam from '@material-symbols/svg-500/rounded/videocam.svg?url';
import visibility from '@material-symbols/svg-500/rounded/visibility-fill.svg?url';
import visibilityOff from '@material-symbols/svg-500/rounded/visibility_off-fill.svg?url';
import work from '@material-symbols/svg-500/rounded/work-fill.svg?url';
import styles from './icon.module.css';

/** The Material Symbols the screens use, hosted with the app: never loaded from Google. */
const ICONS = {
  add,
  addCircle,
  arrowBack,
  checkBox,
  checkBoxBlank,
  checkCircle,
  chevronRight,
  close,
  diversity,
  error,
  expandMore,
  familyRestroom,
  flag,
  groups,
  iosShare,
  logout,
  moreVert,
  pin,
  playCircle,
  qrCode,
  refresh,
  search,
  sync,
  timer,
  undo,
  videocam,
  visibility,
  visibilityOff,
  work,
} as const;

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
