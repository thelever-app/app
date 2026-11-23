import { RequestCodeVO } from '../../domain/vos/request-code.vo.ts';
import type { FirstAccessRepository } from '../ports/first-access-repository.port.ts';

/**
 * The code a player brings to a request by email, as their device shows it (`K7Q4-MD2X-9PRT`);
 * none if they never opened the app.
 */
export class GetRequestCodeUseCase {
  readonly #repository: FirstAccessRepository;

  constructor(repository: FirstAccessRepository) {
    this.#repository = repository;
  }

  async execute(identity: string): Promise<string | undefined> {
    const firstAccess = await this.#repository.findByIdentity(identity);
    return firstAccess && RequestCodeVO.parse(firstAccess.requestCode)?.toString();
  }
}
