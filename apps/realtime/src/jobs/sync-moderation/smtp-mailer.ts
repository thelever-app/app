import type { Email, Mailer } from '@thelever-app/moderation';
import type { Transporter } from 'nodemailer';

/** Who the emails come from, and where an answer goes: answering is how a decision is appealed. */
export interface Sender {
  readonly from: string;
  readonly replyTo: string;
}

/**
 * Sends the emails of the notices through SMTP: in dev and prod, the mailbox no-reply of the
 * domain at Hostinger, which already hosts its email. Plain text only, without links to follow
 * or images to load.
 */
export class SmtpMailer implements Mailer {
  readonly #transporter: Pick<Transporter, 'sendMail'>;
  readonly #sender: Sender;

  constructor(transporter: Pick<Transporter, 'sendMail'>, sender: Sender) {
    this.#transporter = transporter;
    this.#sender = sender;
  }

  async send({ to, subject, text }: Email): Promise<void> {
    await this.#transporter.sendMail({
      from: this.#sender.from,
      replyTo: this.#sender.replyTo,
      to,
      subject,
      text,
    });
  }
}
