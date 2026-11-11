import { createHash, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { type AccessGate, InvalidAccessCodeError } from './access-gate.ts';

export interface SecretFileAccessGateOptions {
  /** The milliseconds of the clock, to know when to read the file again. */
  readonly now?: () => number;
  /** How long a code read from the file is trusted before reading it again. */
  readonly readAgainAfterMs?: number;
}

/** A minute: a new code reaches every instance that soon, and Secret Manager is asked little. */
const READ_AGAIN_AFTER_MS = 60_000;

/**
 * The access code of the environment, from the file Cloud Run mounts from Secret Manager. Every
 * read of that file asks Secret Manager, so a new version of the secret is the code within a
 * minute, without deploying.
 */
export class SecretFileAccessGate implements AccessGate {
  readonly #path: string;
  readonly #now: () => number;
  readonly #readAgainAfterMs: number;
  #digest: Buffer;
  #readAt: number;
  /** The read in progress, which every call that finds the code too old waits for. */
  #reading: Promise<void> | undefined;

  private constructor(path: string, digest: Buffer, options: SecretFileAccessGateOptions) {
    this.#path = path;
    this.#now = options.now ?? Date.now;
    this.#readAgainAfterMs = options.readAgainAfterMs ?? READ_AGAIN_AFTER_MS;
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
    return new SecretFileAccessGate(path, await readDigest(path), options);
  }

  async verify(code: string | undefined): Promise<void> {
    if (this.#now() - this.#readAt >= this.#readAgainAfterMs) await this.#readAgain();
    // Compared by their digests, in constant time: how long it takes says nothing about the code.
    if (!code || !timingSafeEqual(digestOf(code), this.#digest)) {
      throw new InvalidAccessCodeError();
    }
  }

  #readAgain(): Promise<void> {
    this.#reading ??= readDigest(this.#path)
      .then(
        (digest) => {
          this.#digest = digest;
        },
        // Secret Manager not answering keeps the code it had: the gate stays closed, never open.
        () => undefined,
      )
      .finally(() => {
        this.#readAt = this.#now();
        this.#reading = undefined;
      });
    return this.#reading;
  }
}

async function readDigest(path: string): Promise<Buffer> {
  const code = (await readFile(path, 'utf8')).trim();
  if (code === '') throw new Error(`the access code in ${path} is empty`);
  return digestOf(code);
}

function digestOf(code: string): Buffer {
  return createHash('sha256').update(code).digest();
}
