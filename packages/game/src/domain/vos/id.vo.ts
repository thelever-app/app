import { IdMissingError } from '../errors/id-missing.error.ts';

export class IdVO {
  readonly value: string;

  constructor(value: string) {
    if (!value) {
      throw new IdMissingError();
    }
    this.value = value;
  }
}
