import { RequestCodeVO } from '../../domain/vos/request-code.vo.ts';
import type { FirstAccessRepository } from '../ports/first-access-repository.port.ts';

/**
 * Whose a request by email is, by the code written in it, however it was written: none if it is
 * no code, or no identity has it, and then the request is not carried out.
 */
export class IdentityOfRequestCodeUseCase {
  readonly #repository: FirstAccessRepository;

  constructor(repository: FirstAccessRepository) {
    this.#repository = repository;
  }

  async execute(written: string): Promise<string | undefined> {
    const code = RequestCodeVO.parse(written);
    return code && (await this.#repository.findByRequestCode(code.value))?.identity;
  }
}
