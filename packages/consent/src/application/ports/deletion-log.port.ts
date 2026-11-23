/** Where it is kept that the game data of an identity were deleted, to delete them again after a restore. */
export interface DeletionLog {
  gameConsentWithdrawn(identity: string): Promise<void>;
}
