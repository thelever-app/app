import type { Transporter } from 'nodemailer';

/** Who the emails come from, and where an answer goes: answering is how a decision is appealed. */
export interface Sender {
  readonly from: string;
  readonly replyTo: string;
}

/** A file that goes with an email, such as the data a request by email asked for. */
export interface Attachment {
  readonly filename: string;
  readonly content: string;
  readonly contentType: string;
}

/** An email in plain text, with the files that go with it, if any. */
export interface PlainEmail {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly attachments?: readonly Attachment[];
}

/**
 * An email the server did not take, with only its codes: nodemailer's message and the answer of the
 * server name the address, which would reach the logs, out of the reach of the erasure.
 */
export class EmailNotSentError extends Error {
  readonly code: string | undefined;
  readonly responseCode: number | undefined;

  constructor({
    code,
    responseCode,
  }: {
    readonly code?: unknown;
    readonly responseCode?: unknown;
  }) {
    super(
      `the email was not sent (${String(code ?? 'unknown')} ${String(responseCode ?? '')})`.trim(),
    );
    this.name = 'EmailNotSentError';
    this.code = typeof code === 'string' ? code : undefined;
    this.responseCode = typeof responseCode === 'number' ? responseCode : undefined;
  }
}

/**
 * Sends the emails of the app through SMTP: in dev and prod, the contact mailbox of the domain at
 * Hostinger, which already hosts its email, so an answer to an email reaches the team. Plain text
 * only, without links to follow or images to load: the emails of the notices of Moderation, and the
 * data a request by email asked for, which go to the contact mailbox itself.
 */
export class SmtpMailer {
  readonly #transporter: Pick<Transporter, 'sendMail'>;
  readonly #sender: Sender;

  constructor(transporter: Pick<Transporter, 'sendMail'>, sender: Sender) {
    this.#transporter = transporter;
    this.#sender = sender;
  }

  async send(email: PlainEmail): Promise<void> {
    try {
      await this.#send(email);
    } catch (error) {
      throw new EmailNotSentError((error ?? {}) as { code?: unknown; responseCode?: unknown });
    }
  }

  async #send({ to, subject, text, attachments = [] }: PlainEmail): Promise<void> {
    await this.#transporter.sendMail({
      from: this.#sender.from,
      replyTo: this.#sender.replyTo,
      to,
      subject,
      text,
      ...(attachments.length > 0 && {
        attachments: attachments.map(({ filename, content, contentType }) => ({
          filename,
          content,
          contentType,
        })),
      }),
    });
  }
}
