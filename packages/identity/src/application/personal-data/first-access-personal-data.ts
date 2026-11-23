import type { FirstAccessRepository } from '../ports/first-access-repository.port.ts';
import type { PersonalDataStore } from '../ports/personal-data-store.port.ts';
import { RequestCodeVO } from '../../domain/vos/request-code.vo.ts';

/** What Identity keeps of a player: the region of their device, their age, their last open and their code. */
export class FirstAccessPersonalData implements PersonalDataStore {
  readonly section = 'firstAccess';
  readonly #repository: FirstAccessRepository;

  constructor(repository: FirstAccessRepository) {
    this.#repository = repository;
  }

  async export(identity: string): Promise<unknown> {
    const firstAccess = await this.#repository.findByIdentity(identity);
    if (!firstAccess) return undefined;
    const { region, birthYear, birthMonth, lastOpenedAt, requestCode } = firstAccess.toSnapshot();
    return {
      region,
      birthYear,
      birthMonth,
      lastOpenedAt: lastOpenedAt.toISOString(),
      requestCode: RequestCodeVO.parse(requestCode)?.toString() ?? requestCode,
    };
  }

  async erase(identity: string): Promise<void> {
    await this.#repository.delete(identity);
  }
}
