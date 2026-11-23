import { describe, expect, it } from 'vitest';
import {
  GitHubIssueTracker,
  GitHubRequestError,
} from '../../../jobs/sync-moderation/github-issue-tracker.ts';

interface Call {
  readonly url: string;
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly body: unknown;
}

/** GitHub, answering each request with the next answer given. */
function fakeGitHub(...answers: { status?: number; body: unknown }[]) {
  const calls: Call[] = [];
  const fetch = async (url: string, init: RequestInit) => {
    calls.push({
      url,
      method: String(init.method),
      headers: init.headers as Record<string, string>,
      body: init.body === undefined ? undefined : JSON.parse(String(init.body)),
    });
    const answer = answers.shift() ?? { body: {} };
    return new Response(JSON.stringify(answer.body), { status: answer.status ?? 200 });
  };
  return { calls, fetch };
}

describe('GitHubIssueTracker', () => {
  it('should open an issue in the repository with the token, and give its number', async () => {
    // Arrange
    const github = fakeGitHub({ status: 201, body: { number: 42 } });
    const tracker = new GitHubIssueTracker({
      repository: 'test-owner/test-moderation',
      token: 'TestToken',
      fetch: github.fetch,
    });

    // Act
    const number = await tracker.open({ title: 'TestTitle', body: 'TestBody' });

    // Assert
    expect(number).toBe(42);
    expect(github.calls).toEqual([
      expect.objectContaining({
        url: 'https://api.github.com/repos/test-owner/test-moderation/issues',
        method: 'POST',
        body: { title: 'TestTitle', body: 'TestBody', labels: [] },
      }),
    ]);
    expect(github.calls[0]?.headers.Authorization).toBe('Bearer TestToken');
  });

  it('should mark the issues of another environment in their title and with a label', async () => {
    // Arrange
    const github = fakeGitHub({ status: 201, body: { number: 1 } });
    const tracker = new GitHubIssueTracker({
      repository: 'test-owner/test-moderation',
      token: 'TestToken',
      environment: 'dev',
      fetch: github.fetch,
    });

    // Act
    await tracker.open({ title: 'TestTitle', body: 'TestBody' });

    // Assert
    expect(github.calls[0]?.body).toEqual({
      title: '[dev] TestTitle',
      body: 'TestBody',
      labels: ['dev'],
    });
  });

  it('should read whether it is closed, its labels and every comment, page after page', async () => {
    // Arrange
    const page = Array.from({ length: 100 }, (_, index) => ({ body: `TestComment${index}` }));
    const github = fakeGitHub(
      { body: { state: 'closed', labels: [{ name: 'withdraw' }, 'dev'] } },
      { body: page },
      { body: [{ body: 'Hechos: TestFacts\nRegla: 4.2' }] },
    );
    const tracker = new GitHubIssueTracker({
      repository: 'test-owner/test-moderation',
      token: 'TestToken',
      fetch: github.fetch,
    });

    // Act
    const issue = await tracker.read(7);

    // Assert
    expect(issue.closed).toBe(true);
    expect(issue.labels).toEqual(['withdraw', 'dev']);
    expect(issue.comments).toHaveLength(101);
    expect(issue.comments.at(-1)).toBe('Hechos: TestFacts\nRegla: 4.2');
    expect(github.calls.map(({ url }) => url.split('/test-moderation')[1])).toEqual([
      '/issues/7',
      '/issues/7/comments?per_page=100&page=1',
      '/issues/7/comments?per_page=100&page=2',
    ]);
  });

  it('should comment, label and open again an issue', async () => {
    // Arrange
    const github = fakeGitHub();
    const tracker = new GitHubIssueTracker({
      repository: 'test-owner/test-moderation',
      token: 'TestToken',
      fetch: github.fetch,
    });

    // Act
    await tracker.comment(3, 'TestComment');
    await tracker.label(3, 'hidden-by-reports');
    await tracker.reopen(3);

    // Assert
    expect(
      github.calls.map(({ method, url, body }) => [method, url.split('/test-moderation')[1], body]),
    ).toEqual([
      ['POST', '/issues/3/comments', { body: 'TestComment' }],
      ['POST', '/issues/3/labels', { labels: ['hidden-by-reports'] }],
      ['PATCH', '/issues/3', { state: 'open' }],
    ]);
  });

  it('should fail when GitHub turns the request down', async () => {
    // Arrange
    const github = fakeGitHub({ status: 403, body: { message: 'Forbidden' } });
    const tracker = new GitHubIssueTracker({
      repository: 'test-owner/test-moderation',
      token: 'TestToken',
      fetch: github.fetch,
    });

    // Act & Assert
    await expect(tracker.comment(3, 'TestComment')).rejects.toThrow(GitHubRequestError);
  });
});
