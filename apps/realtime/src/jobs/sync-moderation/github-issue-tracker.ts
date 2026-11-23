import type { IssueTracker, TrackedIssue } from '@thelever-app/moderation';

/** The part of fetch the tracker uses, so a test answers for GitHub. */
export type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/** GitHub answered something other than what was asked. */
export class GitHubRequestError extends Error {
  constructor(method: string, path: string, status: number) {
    super(`GitHub answered ${status} to ${method} ${path}`);
    this.name = 'GitHubRequestError';
  }
}

const API = 'https://api.github.com';
const PAGE_SIZE = 100;

/**
 * The private moderation repository on GitHub, through its REST API with a fine-grained token that
 * may only read and write its issues. In dev, every issue says so in its title and its label, so
 * the team never takes it for one of prod.
 */
export class GitHubIssueTracker implements IssueTracker {
  readonly #repository: string;
  readonly #token: string;
  readonly #environment: string | undefined;
  readonly #fetch: Fetch;

  /** `repository`: owner/name. `environment`: none in prod, its name anywhere else. */
  constructor(options: {
    readonly repository: string;
    readonly token: string;
    readonly environment?: string;
    readonly fetch?: Fetch;
  }) {
    this.#repository = options.repository;
    this.#token = options.token;
    this.#environment = options.environment;
    this.#fetch = options.fetch ?? fetch;
  }

  async open({ title, body }: { title: string; body: string }): Promise<number> {
    const environment = this.#environment;
    const { number } = (await this.#request('POST', '/issues', {
      title: environment ? `[${environment}] ${title}` : title,
      body,
      labels: environment ? [environment] : [],
    })) as { number: number };
    return number;
  }

  async comment(number: number, body: string): Promise<void> {
    await this.#request('POST', `/issues/${number}/comments`, { body });
  }

  async label(number: number, label: string): Promise<void> {
    await this.#request('POST', `/issues/${number}/labels`, { labels: [label] });
  }

  async read(number: number): Promise<TrackedIssue> {
    const issue = (await this.#request('GET', `/issues/${number}`)) as {
      state: string;
      labels: ({ name: string } | string)[];
    };
    const comments: string[] = [];
    for (let page = 1; ; page += 1) {
      const batch = (await this.#request(
        'GET',
        `/issues/${number}/comments?per_page=${PAGE_SIZE}&page=${page}`,
      )) as { body: string | null }[];
      comments.push(...batch.map(({ body }) => body ?? ''));
      if (batch.length < PAGE_SIZE) break;
    }
    return {
      closed: issue.state === 'closed',
      labels: issue.labels.map((label) => (typeof label === 'string' ? label : label.name)),
      comments,
    };
  }

  async reopen(number: number): Promise<void> {
    await this.#request('PATCH', `/issues/${number}`, { state: 'open' });
  }

  async #request(method: string, path: string, body?: unknown): Promise<unknown> {
    const response = await this.#fetch(`${API}/repos/${this.#repository}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.#token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'thelever-moderation',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw new GitHubRequestError(method, path, response.status);
    return response.json();
  }
}
