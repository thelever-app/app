import { createTransport } from 'nodemailer';
import { describe, expect, it } from 'vitest';
import { EmailNotSentError, SmtpMailer } from '../../email/smtp-mailer.ts';

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

  it('should fail without the address or what the server answered, which may name it', async () => {
    // Arrange: the server turns the address down, and says so with it.
    const rejected = Object.assign(new Error('Recipient rejected: 550 <test@example.com>'), {
      code: 'EENVELOPE',
      responseCode: 550,
      response: '550 5.1.1 <test@example.com> no such user',
    });
    const mailer = new SmtpMailer(
      { sendMail: async () => Promise.reject(rejected) },
      { from: 'TheLever <no-reply@thelever.test>', replyTo: 'contact@thelever.test' },
    );

    // Act
    const failure = await mailer
      .send({ to: 'test@example.com', subject: 'TestSubject', text: 'TestText' })
      .catch((error: unknown) => error);

    // Assert
    expect(failure).toBeInstanceOf(EmailNotSentError);
    expect(JSON.stringify(failure)).not.toContain('test@example.com');
    expect(String((failure as Error).message)).not.toContain('test@example.com');
    expect(String((failure as Error).stack)).not.toContain('test@example.com');
    expect(failure).toMatchObject({ code: 'EENVELOPE', responseCode: 550 });
  });

  it('should send the files that go with the email', async () => {
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
      { from: 'TheLever <contact@thelever.test>', replyTo: 'contact@thelever.test' },
    );

    // Act
    await mailer.send({
      to: 'contact@thelever.test',
      subject: 'TestSubject',
      text: 'TestText',
      attachments: [{ filename: 'data.json', content: '{"a":1}', contentType: 'application/json' }],
    });

    // Assert
    expect(JSON.parse(sent[0]!)).toMatchObject({
      attachments: [{ filename: 'data.json', contentType: 'application/json' }],
    });
  });
});
