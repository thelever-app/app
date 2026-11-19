import { afterEach, describe, expect, it } from 'vitest';
import type { CountryLookup } from '../../first-access/country-lookup.ts';
import { bearer, ROOM_CHOICES, startRoomServer } from '../support/room-server.ts';

/** Test data: an address in Spain, one in the United Kingdom and one in the United States. */
const COUNTRIES = new Map([
  ['198.51.100.10', 'ES'],
  ['198.51.100.20', 'GB'],
  ['198.51.100.30', 'US'],
]);

class FakeCountryLookup implements CountryLookup {
  readonly asked: (string | undefined)[] = [];
  countryOf(address: string | undefined): string | undefined {
    this.asked.push(address);
    return address === undefined ? undefined : COUNTRIES.get(address);
  }
}

const servers: Awaited<ReturnType<typeof startRoomServer>>[] = [];

afterEach(async () => {
  for (const server of servers.splice(0)) await server.stop();
});

async function server(countries = new FakeCountryLookup()) {
  const started = await startRoomServer({ countryLookup: countries });
  servers.push(started);
  return started;
}

/** A call of a newcomer, who has not opened the app yet, from that address through the proxy. */
async function call(
  http: string,
  path: string,
  { body, from }: { readonly body?: object; readonly from?: string } = {},
) {
  return fetch(`${http}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: bearer('newcomer'),
      'Content-Type': 'application/json',
      // What the browser sent first, and then the address Google's proxy saw.
      ...(from && { 'X-Forwarded-For': `203.0.113.99, ${from}` }),
    },
    ...(body && { body: JSON.stringify(body) }),
  });
}

describe('the first access', () => {
  it('should begin in the region of the address the proxy saw, asking for the age', async () => {
    // Arrange
    const countries = new FakeCountryLookup();
    const { http } = await server(countries);

    // Act
    const response = await call(http, '/first-access', { from: '198.51.100.10' });

    // Assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      region: 'eea',
      step: 'age',
      pending: ['terms-of-use', 'game-consent'],
      changed: [],
      current: { 'terms-of-use': 1, 'game-consent': 1 },
      underEighteen: true,
    });
    // The players of the tests opened the app before, with no address of a known country.
    expect(countries.asked.at(-1)).toBe('198.51.100.10');
  });

  it('should ask for the documents after the age, and then let the player create a room', async () => {
    // Arrange
    const { http } = await server();
    await call(http, '/first-access', { from: '198.51.100.10' });

    // Act
    const afterAge = await call(http, '/first-access/age', { body: { birthYear: 1990 } });
    await call(http, '/first-access/documents', {
      body: { document: 'terms-of-use', version: 1 },
    });
    const afterConsent = await call(http, '/first-access/documents', {
      body: { document: 'game-consent', version: 1 },
    });
    const created = await call(http, '/rooms', { body: { nickname: 'Ana', ...ROOM_CHOICES } });

    // Assert
    expect(await afterAge.json()).toMatchObject({ step: 'documents', underEighteen: false });
    expect(await afterConsent.json()).toMatchObject({ step: 'done', pending: [] });
    expect(created.status).toBe(201);
  });

  it('should not let anyone create a room before finishing it', async () => {
    // Arrange
    const { http } = await server();
    await call(http, '/first-access', { from: '198.51.100.10' });
    await call(http, '/first-access/age', { body: { birthYear: 1990 } });

    // Act
    const response = await call(http, '/rooms', { body: { nickname: 'Ana', ...ROOM_CHOICES } });

    // Assert
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ code: 'first-access-required' });
  });

  it('should ask for the month in a boundary year', async () => {
    // Arrange
    const { http } = await server();
    await call(http, '/first-access', { from: '198.51.100.10' });
    const turnsSixteen = new Date().getUTCFullYear() - 16;

    // Act
    const response = await call(http, '/first-access/age', { body: { birthYear: turnsSixteen } });

    // Assert
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ code: 'month-of-birth-needed' });
  });

  it('should never take the age a second time', async () => {
    // Arrange
    const { http } = await server();
    await call(http, '/first-access', { from: '198.51.100.30' });
    await call(http, '/first-access/age', {
      body: { birthYear: new Date().getUTCFullYear() - 10 },
    });

    // Act
    const again = await call(http, '/first-access/age', { body: { birthYear: 1990 } });
    const status = await call(http, '/first-access');

    // Assert
    expect(again.status).toBe(409);
    expect(await again.json()).toEqual({ code: 'age-already-declared' });
    expect(await status.json()).toMatchObject({ step: 'under-minimum-age' });
  });

  it('should stop in a blocked country, where no document lets anyone through', async () => {
    // Arrange
    const { http } = await server();
    await call(http, '/first-access', { from: '198.51.100.20' });

    // Act
    const age = await call(http, '/first-access/age', { body: { birthYear: 1990 } });
    const terms = await call(http, '/first-access/documents', {
      body: { document: 'terms-of-use', version: 1 },
    });

    // Assert
    expect(age.status).toBe(403);
    expect(await age.json()).toEqual({ code: 'blocked-country' });
    expect(terms.status).toBe(403);
    expect(await terms.json()).toEqual({ code: 'first-access-required' });
  });

  it('should not accept a version of a document that is not the current one', async () => {
    // Arrange
    const { http } = await server();
    await call(http, '/first-access', { from: '198.51.100.10' });
    await call(http, '/first-access/age', { body: { birthYear: 1990 } });

    // Act
    const response = await call(http, '/first-access/documents', {
      body: { document: 'terms-of-use', version: 2 },
    });

    // Assert
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ code: 'not-current-version' });
  });
});
