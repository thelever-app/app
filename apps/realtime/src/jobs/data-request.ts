import { type Database, databaseConfigFrom, inTransaction, openDatabase } from '@thelever-app/db';
import { CONTACT_EMAIL } from '@thelever-app/moderation';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { createTransport } from 'nodemailer';
import { personalDataUseCases } from '../composition/privacy.ts';
import { SmtpMailer } from '../email/smtp-mailer.ts';
import { FirebaseAuthUsers } from '../identity/firebase-auth-users.ts';
import { CloudLoggingLogger } from '../telemetry/cloud-logging-logger.ts';
import { carryOutDataRequest, dataRequestArgumentsOf } from './data-request/carry-out.ts';
import { privacyDependenciesIn } from './privacy-dependencies.ts';

// The Cloud Run job data-request, which the team runs by hand for each request a player sends by
// email to the contact mailbox (RES-48), once it has read it:
//
//   gcloud run jobs execute data-request --region europe-southwest1 --wait \
//     --args=apps/realtime/src/jobs/data-request.ts,--code,K7Q4-MD2X-9PRT,--export
//
// With `--erase` the deletion goes into the deletion log; with `--export` the copy of the data goes
// to the contact mailbox, to be sent on in answer to the request. With `--email` instead of `--code`,
// the request is of whoever left that email in a notice of the web form, and wrote from it. Without
// either, nothing is done, and the logs of the execution have the answer that says how to send it
// again. It runs with the account of moderation, as sync-moderation, which does the deletions.

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const projectId = required('FIREBASE_PROJECT_ID');
const logger = new CloudLoggingLogger({ projectId });
const request = dataRequestArgumentsOf(process.argv.slice(2));

// One connection: it does one thing after the other. It counts in the budget of connections of
// deploy-environment.yml.
const database = await openDatabase<Database>(databaseConfigFrom(process.env), {
  maxConnections: 1,
  logger,
});
const db = database.db;

try {
  const { carryOutDataRequest: carryOut } = personalDataUseCases(
    privacyDependenciesIn(db, 'data-request'),
    new FirebaseAuthUsers(getAuth(initializeApp({ projectId }))),
  );
  await carryOutDataRequest(
    {
      carryOutDataRequest: carryOut,
      runCommand: (command) => inTransaction(db, command),
      mailer: new SmtpMailer(
        createTransport({
          host: required('SMTP_HOST'),
          port: 465,
          secure: true,
          auth: { user: required('SMTP_USER'), pass: required('SMTP_PASSWORD') },
        }),
        { from: `TheLever <${required('SMTP_USER')}>`, replyTo: CONTACT_EMAIL },
      ),
      contactEmail: CONTACT_EMAIL,
      logger,
      // Cloud Logging keeps what the job writes, which the team reads in its execution.
      print: (text) => console.log(text),
    },
    request,
  );
} catch (error) {
  logger.error('carrying out a request by email failed', error);
  process.exitCode = 1;
} finally {
  await database.close();
}
