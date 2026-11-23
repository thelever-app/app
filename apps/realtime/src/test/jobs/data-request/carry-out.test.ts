import { ConsoleLogger } from '@thelever-app/db';
import {
  CarryOutDataRequestUseCase,
  ExportPersonalDataUseCase,
  FirstAccessPersonalData,
  OpenAppUseCase,
  RequestDataDeletionUseCase,
} from '@thelever-app/identity';
import {
  InMemoryDataDeletionRepository,
  InMemoryFirstAccessRepository,
} from '@thelever-app/identity/in-memory';
import { describe, expect, it } from 'vitest';
import {
  carryOutDataRequest,
  dataRequestArgumentsOf,
} from '../../../jobs/data-request/carry-out.ts';
import type { PlainEmail } from '../../../email/smtp-mailer.ts';

async function setUp() {
  const firstAccesses = new InMemoryFirstAccessRepository();
  const deletions = new InMemoryDataDeletionRepository();
  const clock = { now: () => new Date('2026-11-23T10:00:00Z') };
  await new OpenAppUseCase(firstAccesses, clock, { integer: () => 1 }).execute({
    identity: 'uid-ana',
    country: 'ES',
  });
  const sent: PlainEmail[] = [];
  const printed: string[] = [];
  return {
    sent,
    printed,
    deletions,
    job: {
      carryOutDataRequest: new CarryOutDataRequestUseCase({
        firstAccesses,
        identitiesOfEmail: { identitiesOf: async () => [] },
        requestDeletion: new RequestDataDeletionUseCase(
          deletions,
          { generate: () => 'deletion-1' },
          clock,
        ),
        exportData: new ExportPersonalDataUseCase([new FirstAccessPersonalData(firstAccesses)]),
      }),
      runCommand: <T>(command: () => Promise<T>) => command(),
      mailer: { send: async (email: PlainEmail) => void sent.push(email) },
      contactEmail: 'contact@thelever.test',
      logger: new ConsoleLogger(),
      print: (text: string) => void printed.push(text),
    },
  };
}

describe('dataRequestArgumentsOf', () => {
  it('should read the code or the email, and what to do', () => {
    // Act & Assert
    expect(dataRequestArgumentsOf(['--code', '1111-1111-1111', '--export'])).toEqual({
      proof: { code: '1111-1111-1111' },
      request: 'export',
    });
    expect(dataRequestArgumentsOf(['--erase', '--email', 'luis@example.com'])).toEqual({
      proof: { email: 'luis@example.com' },
      request: 'erase',
    });
  });

  it.each([
    [[]],
    [['--code', 'X']],
    [['--code', 'X', '--email', 'Y', '--erase']],
    [['--code', 'X', '--erase', '--export']],
  ])('should not run with %j', (args) => {
    // Act & Assert
    expect(() => dataRequestArgumentsOf(args)).toThrow('usage');
  });
});

describe('carryOutDataRequest', () => {
  it('should send the copy of the data to the contact mailbox, never to who wrote', async () => {
    // Arrange
    const { job, sent } = await setUp();

    // Act
    await carryOutDataRequest(job, { proof: { code: '1111-1111-1111' }, request: 'export' });

    // Assert
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe('contact@thelever.test');
    const [attachment] = sent[0]?.attachments ?? [];
    expect(JSON.parse(attachment?.content ?? '{}')).toMatchObject({
      'uid-ana': { firstAccess: { region: 'eea', requestCode: '1111-1111-1111' } },
    });
  });

  it('should put the deletion in the log', async () => {
    // Arrange
    const { job, deletions } = await setUp();

    // Act
    await carryOutDataRequest(job, { proof: { code: '1111-1111-1111' }, request: 'erase' });

    // Assert
    expect((await deletions.pending()).map(({ identity }) => identity)).toEqual(['uid-ana']);
  });

  it('should print the answer and do nothing without a code of anyone', async () => {
    // Arrange
    const { job, sent, printed, deletions } = await setUp();

    // Act
    await carryOutDataRequest(job, { proof: { code: '2222-2222-2222' }, request: 'erase' });

    // Assert
    expect(printed[0]).toContain('Tus datos');
    expect(sent).toEqual([]);
    expect(await deletions.all()).toEqual([]);
  });
});
