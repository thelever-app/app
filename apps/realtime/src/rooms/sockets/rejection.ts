import type { ErrorCodeDto } from '@thelever-app/protocol';

/** A message the server refuses before reaching any use case, with the code the client receives. */
export class Rejection extends Error {
  readonly code: ErrorCodeDto;

  constructor(code: ErrorCodeDto) {
    super(code);
    this.name = 'Rejection';
    this.code = code;
  }
}
