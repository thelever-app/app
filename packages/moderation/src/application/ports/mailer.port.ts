/** An email to whoever sent a notice. */
export interface Email {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
}

/** Sends the emails of the notices: the acknowledgement of receipt and the decision. */
export interface Mailer {
  send(email: Email): Promise<void>;
}
