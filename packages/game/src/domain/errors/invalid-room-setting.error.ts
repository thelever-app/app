export class InvalidRoomSettingError extends Error {
  constructor(setting: string, value: unknown) {
    super(`${String(value)} is not a valid ${setting}`);
    this.name = 'InvalidRoomSettingError';
  }
}
