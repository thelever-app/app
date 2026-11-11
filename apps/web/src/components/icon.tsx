import type { CSSProperties } from 'react';
import arrowBack from '@material-symbols/svg-500/rounded/arrow_back-fill.svg?url';
import checkCircle from '@material-symbols/svg-500/rounded/check_circle-fill.svg?url';
import close from '@material-symbols/svg-500/rounded/close-fill.svg?url';
import error from '@material-symbols/svg-500/rounded/error.svg?url';
import expandMore from '@material-symbols/svg-500/rounded/keyboard_arrow_down-fill.svg?url';
import refresh from '@material-symbols/svg-500/rounded/refresh-fill.svg?url';
import timer from '@material-symbols/svg-500/rounded/timer-fill.svg?url';
import block from '@material-symbols/svg-500/rounded/block.svg?url';
import lock from '@material-symbols/svg-500/rounded/lock-fill.svg?url';
import arrowForward from '@material-symbols/svg-500/rounded/arrow_forward-fill.svg?url';
import check from '@material-symbols/svg-500/rounded/check-fill.svg?url';
import edit from '@material-symbols/svg-500/rounded/edit-fill.svg?url';
import howToVote from '@material-symbols/svg-500/rounded/how_to_vote-fill.svg?url';
import personPin from '@material-symbols/svg-500/rounded/person_pin-fill.svg?url';
import target from '@material-symbols/svg-500/rounded/target.svg?url';
import visibilityOutline from '@material-symbols/svg-500/rounded/visibility.svg?url';
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
import qrCode from '@material-symbols/svg-500/rounded/qr_code_2.svg?url';
import search from '@material-symbols/svg-500/rounded/search.svg?url';
import sync from '@material-symbols/svg-500/rounded/sync.svg?url';
import videocam from '@material-symbols/svg-500/rounded/videocam.svg?url';
import visibility from '@material-symbols/svg-500/rounded/visibility-fill.svg?url';
import visibilityOff from '@material-symbols/svg-500/rounded/visibility_off-fill.svg?url';
import volumeOff from '@material-symbols/svg-500/rounded/volume_off-fill.svg?url';
import volumeUp from '@material-symbols/svg-500/rounded/volume_up-fill.svg?url';
import work from '@material-symbols/svg-500/rounded/work-fill.svg?url';
import styles from './icon.module.css';

/** The Material Symbols the screens use, hosted with the app: never loaded from Google. */
const ICONS = {
  add,
  addCircle,
  arrowBack,
  arrowForward,
  block,
  check,
  checkBox,
  checkBoxBlank,
  checkCircle,
  chevronRight,
  close,
  diversity,
  edit,
  error,
  expandMore,
  familyRestroom,
  flag,
  groups,
  howToVote,
  iosShare,
  lock,
  logout,
  moreVert,
  personPin,
  pin,
  qrCode,
  refresh,
  search,
  sync,
  target,
  timer,
  videocam,
  visibility,
  visibilityOff,
  visibilityOutline,
  volumeOff,
  volumeUp,
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
