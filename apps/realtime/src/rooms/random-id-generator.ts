import { randomUUID } from 'node:crypto';
import type { IdGenerator } from '@thelever-app/game';

/** Random ids, so nobody can guess the id of a room, a player or a connection of somebody else. */
export class RandomIdGenerator implements IdGenerator {
  generate(): string {
    return randomUUID();
  }
}
