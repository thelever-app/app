import { createTransport } from 'nodemailer';
import { describe, expect, it } from 'vitest';
import { SmtpMailer } from '../../../jobs/sync-moderation/smtp-mailer.ts';

describe('SmtpMailer', () => {
  it('should send the email in plain text, from the sender and with answers to the contact', async () => {
    // Arrange
    const sent: string[] = [];
    const transport = createTransport({ jsonTransport: true });
    const mailer = new SmtpMailer(
      {
        sendMail: async (mail) => {
          const info = await transport.sendMail(mail);
          sent.push(String(info.message));
          return info;
        },
      },
      { from: 'TheLever <no-reply@thelever.test>', replyTo: 'contact@thelever.test' },
    );

    // Act
    await mailer.send({ to: 'test@example.com', subject: 'TestSubject', text: 'TestText' });

    // Assert
    expect(JSON.parse(sent[0]!)).toMatchObject({
      from: { address: 'no-reply@thelever.test', name: 'TheLever' },
      replyTo: [{ address: 'contact@thelever.test' }],
      to: [{ address: 'test@example.com' }],
      subject: 'TestSubject',
      text: 'TestText',
    });
  });
});
