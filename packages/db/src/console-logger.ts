import type { LogFields, Logger } from './logger.ts';

/** Writes each entry as a line of text on the console: for the scripts and the tests of this package. */
export class ConsoleLogger implements Logger {
  info(message: string, fields?: LogFields): void {
    console.log(lineOf(message, fields));
  }

  warn(message: string, fields?: LogFields): void {
    console.warn(lineOf(message, fields));
  }

  error(message: string, error?: unknown, fields?: LogFields): void {
    console.error(lineOf(message, fields), ...(error === undefined ? [] : [error]));
  }
}

function lineOf(message: string, fields?: LogFields): string {
  return fields ? `${message} ${JSON.stringify(fields)}` : message;
}
