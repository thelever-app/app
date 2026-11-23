import type { VisitOrigin } from '../vos/visit-origin.vo.ts';

/**
 * What an analytics event tells, and nothing more (RES-20): never votes, predictions, reactions
 * nor which dilemmas are played. The ids of rooms and games are random, and only tie the events
 * of one room or one game together.
 */
export type AnalyticsFact =
  /** The first time the identity opened the app, and from where. */
  | { readonly kind: 'first-visit'; readonly origin: VisitOrigin }
  /** It created a room. */
  | { readonly kind: 'room-created'; readonly roomId: string }
  /** It joined the room of someone else. */
  | { readonly kind: 'room-joined'; readonly roomId: string }
  /** A game it plays started, with that many players. */
  | {
      readonly kind: 'game-started';
      readonly roomId: string;
      readonly gameId: string;
      readonly players: number;
    }
  /** A game it played reached its end, with that many players. */
  | {
      readonly kind: 'game-ended';
      readonly roomId: string;
      readonly gameId: string;
      readonly players: number;
    };

export type AnalyticsEventKind = AnalyticsFact['kind'];

/** A fact of use tied to an identity, kept 13 months. */
export interface AnalyticsEvent {
  readonly id: string;
  readonly identity: string;
  readonly occurredAt: Date;
  readonly fact: AnalyticsFact;
}
