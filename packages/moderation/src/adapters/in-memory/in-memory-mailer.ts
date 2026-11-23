import type { Email, Mailer } from '../../application/ports/mailer.port.ts';

/** Keeps the emails it would send, for tests to read. */
export class InMemoryMailer implements Mailer {
  readonly #sent: Email[] = [];

  async send(email: Email): Promise<void> {
    this.#sent.push({ ...email });
  }

  sent(): Email[] {
    return this.#sent.map((email) => ({ ...email }));
  }
}
