/**
 * Something that happened in an aggregate and that other parts of the system may react to.
 * `type` tells events apart once they leave the aggregate.
 */
export interface DomainEvent {
  readonly type: string;
}
