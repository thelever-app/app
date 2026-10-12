type TaskState = 'En progreso' | 'En revisión' | 'Listo';

interface Target {
  state: TaskState;
  // undefined: leave the PR property as it is; null: clear it.
  prUrl?: string | null;
}

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2025-09-03';

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

function taskNumberFrom(branch: string): number | null {
  const match = /^[a-z]+\/tsk-(\d+)-/.exec(branch);
  return match ? Number(match[1]) : null;
}

function targetFor(eventName: string): Target | null {
  if (eventName === 'create') return { state: 'En progreso' };
  if (eventName !== 'pull_request') return null;

  const action = env('PR_ACTION');
  if (action === 'opened' || action === 'reopened' || action === 'ready_for_review') {
    return { state: 'En revisión', prUrl: env('PR_URL') };
  }
  if (action === 'closed') {
    return process.env.PR_MERGED === 'true'
      ? { state: 'Listo', prUrl: env('PR_URL') }
      : { state: 'En progreso', prUrl: null };
  }
  return null;
}

async function notion(method: 'POST' | 'PATCH', path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${NOTION_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env('NOTION_TOKEN')}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  // Never log the response body: workflow logs are public.
  if (!res.ok) throw new Error(`Notion ${method} ${path} failed with status ${res.status}`);
  return res.json();
}

async function findTaskPageId(taskNumber: number): Promise<string | null> {
  const dataSourceId = env('NOTION_TASKS_DATA_SOURCE_ID');
  const data = (await notion('POST', `/data_sources/${dataSourceId}/query`, {
    filter: { property: 'ID', unique_id: { equals: taskNumber } },
    page_size: 1,
  })) as { results: Array<{ id: string }> };
  return data.results[0]?.id ?? null;
}

async function main(): Promise<void> {
  const taskNumber = taskNumberFrom(env('BRANCH'));
  if (taskNumber === null) {
    console.log('Branch has no task ID; nothing to sync.');
    return;
  }

  const target = targetFor(env('EVENT_NAME'));
  if (target === null) {
    console.log('Event does not change task state; nothing to sync.');
    return;
  }

  const pageId = await findTaskPageId(taskNumber);
  if (pageId === null) {
    console.log(`::warning::TSK-${taskNumber} not found in Notion.`);
    return;
  }

  const properties: Record<string, unknown> = {
    Estado: { status: { name: target.state } },
  };
  if (target.prUrl !== undefined) properties.PR = { url: target.prUrl };

  await notion('PATCH', `/pages/${pageId}`, { properties });
  console.log(`TSK-${taskNumber} → ${target.state}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.log(`::error::${message}`);
  process.exitCode = 1;
});
