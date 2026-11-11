import { createHash, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { type AccessGate, InvalidAccessCodeError } from './access-gate.ts';

export interface SecretFileAccessGateOptions {
  /** The milliseconds of the clock, to know when to read the file again. */
  readonly now?: () => number;
  /** How long a code read from the file is trusted before reading it again. */
  readonly readAgainAfterMs?: number;
  /** How long a read may take before the gate goes on with the code it has. */
  readonly readTimeoutMs?: number;
  /** Reads the file; the one of Node unless a test needs another. */
  readonly read?: (path: string) => Promise<string>;
}

/** A minute: a new code reaches every instance that soon, and Secret Manager is asked little. */
const READ_AGAIN_AFTER_MS = 60_000;
/** A read of the secret waits this long at most: the calls that wait for it are of players. */
const READ_TIMEOUT_MS = 2_000;

const readText = (path: string) => readFile(path, 'utf8');

/**
 * The access code of the environment, from the file Cloud Run mounts from Secret Manager. Every
 * read of that file asks Secret Manager, so a new version of the secret is the code within a
 * minute, without deploying.
 */
export class SecretFileAccessGate implements AccessGate {
  readonly #now: () => number;
  readonly #readAgainAfterMs: number;
  readonly #readDigest: () => Promise<Buffer>;
  #digest: Buffer;
  #readAt: number;
  /** The read in progress, which every call that finds the code too old waits for. */
  #reading: Promise<void> | undefined;

  private constructor(
    digest: Buffer,
    readDigest: () => Promise<Buffer>,
    options: SecretFileAccessGateOptions,
  ) {
    this.#now = options.now ?? Date.now;
    this.#readAgainAfterMs = options.readAgainAfterMs ?? READ_AGAIN_AFTER_MS;
    this.#readDigest = readDigest;
    this.#digest = digest;
    this.#readAt = this.#now();
  }

  /**
   * Reads the code once before serving anyone: without the file, or with an empty one, it throws,
   * and the server does not start with its gate open.
   */
  static async open(
    path: string,
    options: SecretFileAccessGateOptions = {},
  ): Promise<SecretFileAccessGate> {
    const read = options.read ?? readText;
    const timeoutMs = options.readTimeoutMs ?? READ_TIMEOUT_MS;
    const readDigest = () => digestIn(path, read, timeoutMs);
    return new SecretFileAccessGate(await readDigest(), readDigest, options);
  }

  async verify(code: string | undefined): Promise<void> {
    if (this.#now() - this.#readAt >= this.#readAgainAfterMs) await this.#readAgain();
    // Compared by their digests, in constant time: how long it takes says nothing about the code.
    if (!code || !timingSafeEqual(digestOf(code), this.#digest)) {
      throw new InvalidAccessCodeError();
    }
  }

  #readAgain(): Promise<void> {
    this.#reading ??= this.#readDigest()
      .then(
        (digest) => {
          this.#digest = digest;
        },
        // Secret Manager slow or not answering keeps the code it had: the gate stays closed.
        () => undefined,
      )
      .finally(() => {
        this.#readAt = this.#now();
        this.#reading = undefined;
      });
    return this.#reading;
  }
}

/** The digest of the code in the file, or an error if it is empty or the read takes too long. */
async function digestIn(
  path: string,
  read: (path: string) => Promise<string>,
  timeoutMs: number,
): Promise<Buffer> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`reading ${path} took too long`)), timeoutMs);
  });
  try {
    const code = (await Promise.race([read(path), timeout])).trim();
    if (code === '') throw new Error(`the access code in ${path} is empty`);
    return digestOf(code);
  } finally {
    clearTimeout(timer);
  }
}

/** The same code typed on any keyboard: «ó» may come as one character or as «o» and its accent. */
function digestOf(code: string): Buffer {
  return createHash('sha256').update(code.normalize('NFC')).digest();
}
