import { InMemoryIssueRepository } from '../../adapters/in-memory/in-memory-issue-repository.ts';
import { InMemoryIssueTracker } from '../../adapters/in-memory/in-memory-issue-tracker.ts';
import { InMemoryMailer } from '../../adapters/in-memory/in-memory-mailer.ts';
import { InMemoryModerationNoticeRepository } from '../../adapters/in-memory/in-memory-moderation-notice-repository.ts';
import { InMemoryOutbox } from '../../adapters/in-memory/in-memory-outbox.ts';
import { LanguageTagFactsTranslator } from '../../adapters/in-memory/language-tag-facts-translator.ts';
import type { ModeratedDilemmas } from '../ports/moderated-dilemmas.port.ts';
import type { ModeratedNicknames } from '../ports/moderated-nicknames.port.ts';

/** Test data: the dilemmas Moderation can find, by id, with their text. */
export const TEXTS: Readonly<Record<string, string>> = {
  TestDilemma: 'TestText of the dilemma',
  'TestDilemma-en': 'TestText of the translation of the dilemma',
  TestOther: 'TestText of another dilemma',
};

/** The dilemmas of the catalog, as Moderation sees them, and what it did to them. */
export class FakeDilemmas implements ModeratedDilemmas {
  readonly done: string[] = [];

  async dilemmaOf(reference: string): Promise<string | null> {
    const number = /-(\d+)$/.exec(reference)?.[1];
    return number === '1' ? 'TestDilemma' : null;
  }

  async familyOf(dilemmaId: string): Promise<readonly string[]> {
    return dilemmaId.startsWith('TestDilemma') ? ['TestDilemma', 'TestDilemma-en'] : [dilemmaId];
  }

  async textOf(dilemmaId: string): Promise<string | null> {
    return TEXTS[dilemmaId] ?? null;
  }

  async hide(dilemmaId: string): Promise<void> {
    this.done.push(`hide ${dilemmaId}`);
  }

  async restore(dilemmaId: string): Promise<void> {
    this.done.push(`restore ${dilemmaId}`);
  }

  async withdraw(dilemmaId: string): Promise<void> {
    this.done.push(`withdraw ${dilemmaId}`);
  }
}

export class FakeNicknames implements ModeratedNicknames {
  readonly withdrawn: string[] = [];

  /** The room TESTS has a player called TestNickname, whose identity is TestOwner. */
  async nicknameOf(
    reference: string,
  ): Promise<{ readonly nickname: string; readonly owner: string } | null> {
    return reference.includes('TESTS') && reference.includes('TestNickname')
      ? { nickname: 'TestNickname', owner: 'TestOwner' }
      : null;
  }

  async withdraw(owner: string, nickname: string): Promise<void> {
    this.withdrawn.push(`${owner} ${nickname}`);
  }
}

export const AT = new Date('2026-11-22T10:00:00Z');

/** Every port of Moderation, in memory, with ids in order and a clock stopped at AT. */
export function moderationTestPorts() {
  let next = 1;
  let now = AT;
  return {
    issues: new InMemoryIssueRepository(),
    outbox: new InMemoryOutbox(),
    notices: new InMemoryModerationNoticeRepository(),
    tracker: new InMemoryIssueTracker(),
    mailer: new InMemoryMailer(),
    translator: new LanguageTagFactsTranslator(),
    dilemmas: new FakeDilemmas(),
    nicknames: new FakeNicknames(),
    idGenerator: { generate: () => `TestId${next++}` },
    clock: {
      now: () => now,
      set: (at: Date) => {
        now = at;
      },
    },
  };
}
