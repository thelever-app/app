import { RequestCodeVO } from '../../domain/vos/request-code.vo.ts';
import type { FirstAccessRepository } from '../ports/first-access-repository.port.ts';
import type { IdentitiesOfEmail } from '../ports/identities-of-email.port.ts';
import { NOT_CARRIED_OUT_REPLY } from '../texts/data-request-texts.ts';
import type { ExportPersonalDataUseCase } from './export-personal-data.use-case.ts';
import type { RequestDataDeletionUseCase } from './request-data-deletion.use-case.ts';

/**
 * What proves a request by email is of the data subject: the code their device shows, or the
 * email they wrote from, when it is the one they left in a notice of the web form.
 */
export type DataRequestProof = { readonly code: string } | { readonly email: string };

export interface CarryOutDataRequestInput {
  readonly proof: DataRequestProof;
  /** Delete the data, or give a copy of them. */
  readonly request: 'erase' | 'export';
}

export type DataRequestOutcome =
  /** Nobody's: nothing is done, and the answer says how to send it again. */
  | { readonly carriedOut: false; readonly reply: string }
  | {
      readonly carriedOut: true;
      readonly identities: readonly string[];
      /** For a copy, what each identity has, one section per store. */
      readonly exported: Readonly<Record<string, Record<string, unknown>>>;
    };

/**
 * The team carries out a request a player sent by email (RES-48): only with the code of their
 * device or from the email of their notice, never otherwise. Deleting puts it in the deletion log;
 * a copy has every section of every identity of the data subject.
 */
export class CarryOutDataRequestUseCase {
  readonly #firstAccesses: FirstAccessRepository;
  readonly #identitiesOfEmail: IdentitiesOfEmail;
  readonly #requestDeletion: RequestDataDeletionUseCase;
  readonly #exportData: ExportPersonalDataUseCase;

  constructor({
    firstAccesses,
    identitiesOfEmail,
    requestDeletion,
    exportData,
  }: {
    readonly firstAccesses: FirstAccessRepository;
    readonly identitiesOfEmail: IdentitiesOfEmail;
    readonly requestDeletion: RequestDataDeletionUseCase;
    readonly exportData: ExportPersonalDataUseCase;
  }) {
    this.#firstAccesses = firstAccesses;
    this.#identitiesOfEmail = identitiesOfEmail;
    this.#requestDeletion = requestDeletion;
    this.#exportData = exportData;
  }

  async execute({ proof, request }: CarryOutDataRequestInput): Promise<DataRequestOutcome> {
    const identities = await this.#identitiesOf(proof);
    if (identities.length === 0) return { carriedOut: false, reply: NOT_CARRIED_OUT_REPLY };
    const exported: Record<string, Record<string, unknown>> = {};
    for (const identity of identities) {
      if (request === 'erase') await this.#requestDeletion.execute(identity);
      else exported[identity] = await this.#exportData.execute(identity);
    }
    return { carriedOut: true, identities, exported };
  }

  async #identitiesOf(proof: DataRequestProof): Promise<readonly string[]> {
    if ('email' in proof) {
      const email = proof.email.trim();
      return email === '' ? [] : this.#identitiesOfEmail.identitiesOf(email);
    }
    const code = RequestCodeVO.parse(proof.code);
    const firstAccess = code && (await this.#firstAccesses.findByRequestCode(code.value));
    return firstAccess ? [firstAccess.identity] : [];
  }
}
