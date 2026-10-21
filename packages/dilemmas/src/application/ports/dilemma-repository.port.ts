import type { Dilemma } from '../../domain/entities/dilemma.ts';

export interface DilemmaRepository {
  save(dilemma: Dilemma): Promise<void>;
  findById(id: string): Promise<Dilemma | undefined>;
}
