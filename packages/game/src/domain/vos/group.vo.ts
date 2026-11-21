import { InvalidRoomSettingError } from '../errors/invalid-room-setting.error.ts';

export const PLACES = ['together', 'remote'] as const;

/** Whether the group plays in the same place or remotely. */
export type Place = (typeof PLACES)[number];

export function toPlace(value: string): Place {
  if (!(PLACES as readonly string[]).includes(value)) {
    throw new InvalidRoomSettingError('place', value);
  }
  return value as Place;
}
