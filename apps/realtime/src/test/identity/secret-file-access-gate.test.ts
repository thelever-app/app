import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InvalidAccessCodeError } from '../../identity/access-gate.ts';
import { SecretFileAccessGate } from '../../identity/secret-file-access-gate.ts';

let folder: string;
let file: string;

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'access-code-'));
  file = join(folder, 'value');
});

afterEach(async () => {
  await rm(folder, { recursive: true, force: true });
});

/** A clock the test moves by hand. */
function manualClock() {
  let now = 0;
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe('SecretFileAccessGate', () => {
  it('should let in the code the file holds', async () => {
    // Arrange
    await writeFile(file, 'k7m2x9q4w1zp');
    const gate = await SecretFileAccessGate.open(file);

    // Act
    const verified = gate.verify('k7m2x9q4w1zp');

    // Assert
    await expect(verified).resolves.toBeUndefined();
  });

  it('should read the code without the spaces and line ends around it', async () => {
    // Arrange
    await writeFile(file, '  k7m2x9q4w1zp\n');
    const gate = await SecretFileAccessGate.open(file);

    // Act
    const verified = gate.verify('k7m2x9q4w1zp');

    // Assert
    await expect(verified).resolves.toBeUndefined();
  });

  it.each([
    ['no code', undefined],
    ['an empty code', ''],
    ['another code', 'k7m2x9q4w1zq'],
    ['the code with other letters in capitals', 'K7M2X9Q4W1ZP'],
    ['the start of the code', 'k7m2x9'],
  ])('should turn down %s', async (_case, code) => {
    // Arrange
    await writeFile(file, 'k7m2x9q4w1zp');
    const gate = await SecretFileAccessGate.open(file);

    // Act
    const verified = gate.verify(code);

    // Assert
    await expect(verified).rejects.toThrow(InvalidAccessCodeError);
  });

  it('should not open without the file, so a missing secret never leaves the gate open', async () => {
    // Act
    const opened = SecretFileAccessGate.open(join(folder, 'missing'));

    // Assert
    await expect(opened).rejects.toThrow();
  });

  it('should not open with an empty file', async () => {
    // Arrange
    await writeFile(file, ' \n');

    // Act
    const opened = SecretFileAccessGate.open(file);

    // Assert
    await expect(opened).rejects.toThrow('empty');
  });

  it('should take a new code once the time to read the file again has passed', async () => {
    // Arrange
    await writeFile(file, 'old-code');
    const clock = manualClock();
    const gate = await SecretFileAccessGate.open(file, {
      now: clock.now,
      readAgainAfterMs: 60_000,
    });
    await writeFile(file, 'new-code');

    // Act
    const beforeTheTime = gate.verify('old-code');
    clock.advance(60_000);
    const old = gate.verify('old-code');
    const fresh = gate.verify('new-code');

    // Assert
    await expect(beforeTheTime).resolves.toBeUndefined();
    await expect(old).rejects.toThrow(InvalidAccessCodeError);
    await expect(fresh).resolves.toBeUndefined();
  });

  it('should keep the code it had while the file cannot be read again', async () => {
    // Arrange
    await writeFile(file, 'k7m2x9q4w1zp');
    const clock = manualClock();
    const gate = await SecretFileAccessGate.open(file, {
      now: clock.now,
      readAgainAfterMs: 60_000,
    });
    await rm(file);
    clock.advance(60_000);

    // Act
    const kept = gate.verify('k7m2x9q4w1zp');
    const other = gate.verify('another');

    // Assert
    await expect(kept).resolves.toBeUndefined();
    await expect(other).rejects.toThrow(InvalidAccessCodeError);
  });
});
