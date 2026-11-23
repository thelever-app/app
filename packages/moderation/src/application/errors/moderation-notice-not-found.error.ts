/** No moderation notice of that player has that id: another player's is not theirs to see. */
export class ModerationNoticeNotFoundError extends Error {
  constructor(noticeId: string) {
    super(`moderation notice ${noticeId} not found`);
    this.name = 'ModerationNoticeNotFoundError';
  }
}
