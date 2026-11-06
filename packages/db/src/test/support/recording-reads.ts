import {
  type Kysely,
  type KyselyPlugin,
  SelectQueryNode,
  type TableNode,
  type OperationNode,
} from 'kysely';
import type { Database } from '../../schema.ts';

/**
 * The database, and each statement that reads through it: the table it reads first, and whether it
 * locks. Every round trip to the server counts, so a subquery inside a statement does not.
 */
export function recordingReads(db: Kysely<Database>): {
  readonly db: Kysely<Database>;
  readonly reads: string[];
} {
  const reads: string[] = [];
  const plugin: KyselyPlugin = {
    transformQuery: ({ node }) => {
      const read = describe(node);
      if (read) reads.push(read);
      return node;
    },
    transformResult: async ({ result }) => result,
  };
  return { db: db.withPlugin(plugin), reads };
}

function describe(node: OperationNode): string | undefined {
  if (!SelectQueryNode.is(node)) return undefined;
  const table = (node.from?.froms[0] as TableNode | undefined)?.table.identifier.name;
  return node.endModifiers?.length ? `lock ${table}` : `select ${table}`;
}
