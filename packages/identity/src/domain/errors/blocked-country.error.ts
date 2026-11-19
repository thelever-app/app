/** TheLever is not available in the country the device is in. */
export class BlockedCountryError extends Error {
  constructor(identity: string) {
    super(`${identity} is in a country where TheLever is not available`);
    this.name = 'BlockedCountryError';
  }
}
