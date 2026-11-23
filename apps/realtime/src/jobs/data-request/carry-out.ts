import type { Logger } from '@thelever-app/db';
import type { CarryOutDataRequestUseCase, DataRequestProof } from '@thelever-app/identity';
import type { PlainEmail } from '../../email/smtp-mailer.ts';
import type { RunCommand } from '../../rooms/run-command.ts';

/** What the job of the requests by email is asked to do, from its arguments. */
export interface DataRequestArguments {
  readonly proof: DataRequestProof;
  readonly request: 'erase' | 'export';
}

/** Reads `--code K7Q4-MD2X-9PRT` or `--email someone@example.com`, and `--erase` or `--export`. */
export function dataRequestArgumentsOf(args: readonly string[]): DataRequestArguments {
  const valueOf = (name: string) => {
    const index = args.indexOf(name);
    return index === -1 ? undefined : args[index + 1];
  };
  const code = valueOf('--code');
  const email = valueOf('--email');
  const erase = args.includes('--erase');
  const exporting = args.includes('--export');
  if ((code === undefined) === (email === undefined) || erase === exporting) {
    throw new Error('usage: data-request (--code <code> | --email <email>) (--erase | --export)');
  }
  return {
    proof: code !== undefined ? { code } : { email: email as string },
    request: erase ? 'erase' : 'export',
  };
}

/** What the job of the requests by email needs. */
export interface DataRequestJob {
  readonly carryOutDataRequest: CarryOutDataRequestUseCase;
  readonly runCommand: RunCommand;
  readonly mailer: { send(email: PlainEmail): Promise<void> };
  /** The contact mailbox, where the copy of the data goes for the team to send it on. */
  readonly contactEmail: string;
  readonly logger: Logger;
  /** Where the job writes what the team reads: the answer to send when nothing is carried out. */
  readonly print: (text: string) => void;
}

/**
 * The team carries out a request a player sent by email, from Cloud Run: with the code or from the
 * email of their notice, it puts the deletion in the log or sends the copy of the data to the
 * contact mailbox, never to the address the request came from; without either, it does nothing and
 * prints the answer that says how to send it again. The logs never name the person.
 */
export async function carryOutDataRequest(
  {
    carryOutDataRequest: carryOut,
    runCommand,
    mailer,
    contactEmail,
    logger,
    print,
  }: DataRequestJob,
  { proof, request }: DataRequestArguments,
): Promise<void> {
  const outcome = await runCommand(() => carryOut.execute({ proof, request }));
  if (!outcome.carriedOut) {
    logger.info('a request by email was not carried out', { request });
    print(outcome.reply);
    return;
  }
  logger.info('a request by email was carried out', {
    request,
    identities: outcome.identities.length,
  });
  if (request === 'export') {
    await mailer.send({
      to: contactEmail,
      subject: 'TheLever: copia de los datos pedida por email',
      text: [
        'La copia de los datos que pidió por email quien acreditó la petición, en el fichero adjunto.',
        'Reenvíasela desde este buzón, en respuesta a su petición.',
      ].join('\n\n'),
      attachments: [
        {
          filename: 'thelever-mis-datos.json',
          content: `${JSON.stringify(outcome.exported, null, 2)}\n`,
          contentType: 'application/json',
        },
      ],
    });
    print('La copia de los datos ha ido al buzón de contacto, para reenviarla.');
  } else {
    print('El borrado está en el registro: el job de borrado lo hace en su próxima ejecución.');
  }
}
