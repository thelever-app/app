import { z } from 'zod';
import { ErrorCodeDto } from '../server-messages.ts';

/** The body of any rejected request: a stable code the client translates. */
export const HttpErrorDto = z.strictObject({ code: ErrorCodeDto });

export type HttpErrorDto = z.infer<typeof HttpErrorDto>;
