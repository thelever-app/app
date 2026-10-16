import { NicknameMissingError } from '../errors/nickname-missing.error.ts';

export class NicknameVO {
  readonly value: string;

  constructor(value: string) {
    if (!value) {
      throw new NicknameMissingError();
    }
    this.value = value;
  }
}
