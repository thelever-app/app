import { type Entry, Issue } from '../../domain/entities/issue.ts';
import type { IdGenerator } from '../../domain/ports/id-generator.port.ts';
import type { IssueContent } from '../../domain/vos/issue-content.vo.ts';
import type { IssueRepository } from '../ports/issue-repository.port.ts';
import type { ModeratedDilemmas } from '../ports/moderated-dilemmas.port.ts';
import type { Outbox } from '../ports/outbox.port.ts';

export interface ReceivePorts {
  readonly issues: IssueRepository;
  readonly outbox: Outbox;
  readonly dilemmas: ModeratedDilemmas;
  readonly idGenerator: IdGenerator;
}

/**
 * The entry goes on the issue of its content the team has not decided on, or opens one. Enough
 * reports hide the dilemma at once; the issue and its events are kept in the same command.
 */
export async function receiveEntry(
  { issues, outbox, dilemmas, idGenerator }: ReceivePorts,
  content: IssueContent,
  entry: Entry,
  at: Date,
): Promise<void> {
  const undecided = content.kind === 'reference' ? undefined : await issues.undecidedOf(content);
  const issue = undecided ?? Issue.openWith(idGenerator.generate(), content, entry, at);
  if (undecided) undecided.receive(entry);
  const events = issue.pullEvents();
  if (content.kind === 'dilemma' && events.some(({ type }) => type === 'hidden')) {
    await dilemmas.hide(content.dilemmaId);
  }
  await issues.save(issue);
  await outbox.add(issue.id, events);
}
