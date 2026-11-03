import type { Seal } from '../../domain/vos/answer.vo.ts';

/** The seal of a player at this moment, from who they are; the game stores it without reading it. */
export interface SealProvider {
  sealFor(identity: string): Promise<Seal>;
}
