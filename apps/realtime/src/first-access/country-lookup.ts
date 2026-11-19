import { readFile } from 'node:fs/promises';
import type { Request } from 'express';
import { type CountryResponse, Reader } from 'mmdb-lib';

/**
 * The country an IP address is in, from a database on the room server itself: the address never
 * leaves it, and only the region of the country is kept (RES-37).
 */
export interface CountryLookup {
  /** The ISO 3166-1 alpha-2 code, or none for an address the database does not place. */
  countryOf(address: string | undefined): string | undefined;
}

/** Where no database is mounted, such as locally: no address has a known country. */
export class NoCountryLookup implements CountryLookup {
  countryOf(): undefined {
    return undefined;
  }
}

/** The countries of DB-IP Lite (IP to Country, CC BY 4.0), in its MaxMind format. */
export class DbIpCountryLookup implements CountryLookup {
  readonly #reader: Reader<CountryResponse>;

  private constructor(database: Buffer) {
    this.#reader = new Reader(database);
  }

  /** A file it cannot read stops the server before it serves anyone. */
  static async open(file: string): Promise<DbIpCountryLookup> {
    return new DbIpCountryLookup(await readFile(file));
  }

  countryOf(address: string | undefined): string | undefined {
    if (address === undefined) return undefined;
    try {
      return this.#reader.get(address)?.country?.iso_code;
    } catch {
      // Not an IP address.
      return undefined;
    }
  }
}

/**
 * The address the call comes from. Behind Google's proxy, the last one it added to X-Forwarded-For,
 * since anything before it is what the browser sent; with no proxy, the socket's.
 */
export function clientAddressOf(req: Request): string | undefined {
  const forwarded = req.get('X-Forwarded-For')?.split(',').at(-1)?.trim();
  const address = forwarded || req.socket.remoteAddress;
  return address?.replace(/^::ffff:/, '');
}
