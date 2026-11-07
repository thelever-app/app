import { InvalidRoomSettingError } from '../errors/invalid-room-setting.error.ts';

export const GROUP_NATURES = ['family', 'friends', 'work', 'mixed'] as const;
export const PLACES = ['together', 'remote'] as const;

/** Who the group is, chosen once when the room is created. */
export type GroupNature = (typeof GROUP_NATURES)[number];
/** Whether the group plays in the same place or remotely. */
export type Place = (typeof PLACES)[number];

export function toGroupNature(value: string): GroupNature {
  if (!(GROUP_NATURES as readonly string[]).includes(value)) {
    throw new InvalidRoomSettingError('group nature', value);
  }
  return value as GroupNature;
}

export function toPlace(value: string): Place {
  if (!(PLACES as readonly string[]).includes(value)) {
    throw new InvalidRoomSettingError('place', value);
  }
  return value as Place;
}
