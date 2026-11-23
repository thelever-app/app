import { PUBLISHED_VERSIONS, GetConsentUseCase } from '@thelever-app/consent';
import { InMemoryAcceptanceRepository } from '@thelever-app/consent/in-memory';
import { OpenAppUseCase } from '@thelever-app/identity';
import { InMemoryFirstAccessRepository } from '@thelever-app/identity/in-memory';
import type { Request, Response } from 'express';
import { describe, expect, it } from 'vitest';
import { OpenAppEndpoint } from '../../first-access/first-access.endpoints.ts';
import { CryptoRandomness } from '../../rooms/crypto-randomness.ts';
import { SystemClock } from '../../rooms/system-clock.ts';

describe('OpenAppEndpoint', () => {
  it('should open the app even if recording the first visit fails', async () => {
    const clock = new SystemClock();
    const endpoint = new OpenAppEndpoint(
      new OpenAppUseCase(new InMemoryFirstAccessRepository(), clock, new CryptoRandomness()),
      new GetConsentUseCase(new InMemoryAcceptanceRepository(), PUBLISHED_VERSIONS),
      { countryOf: () => 'ES' },
      (work) => work(),
      { execute: () => Promise.reject(new Error('the analytics database is down')) },
    );
    const answered: unknown[] = [];
    const req = {
      query: { utm_source: 'cartel' },
      get: () => undefined,
      socket: { remoteAddress: '198.51.100.10' },
    } as unknown as Request;
    const res = {
      locals: { identity: 'newcomer' },
      json: (body: unknown) => answered.push(body),
    } as unknown as Response;

    await endpoint.handle(req, res);

    expect(answered).toHaveLength(1);
  });
});
