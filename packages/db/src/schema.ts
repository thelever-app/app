import type { Category, DilemmaStatus, MinimumAge, Visibility } from '@thelever-app/dilemmas';
import type {
  AvatarFace,
  DilemmaCount,
  DilemmaLanguage,
  DilemmaOrigin,
  GroupNature,
  Place,
  PlayerColor,
  RoomVariant,
  TimePerDilemmaSeconds,
  DilemmasPerPlayer,
  DidNotVoteReason,
  RevealedBy,
  RoundPhase,
  VotePrediction,
} from '@thelever-app/game';
import type { ColumnType, Generated, Kysely } from 'kysely';

/** The tables, as the migrations leave them; the checks of the database guarantee the unions. */
export interface Database {
  dilemmas: {
    id: string;
    language: string;
    creator_type: 'curation-team' | 'player' | 'unlinked-player';
    creator_identity: string | null;
    visibility: Visibility;
    created_at: Generated<Date>;
  };
  dilemma_versions: {
    dilemma_id: string;
    number: number;
    text: string;
    category: Category;
    minimum_age: MinimumAge;
    status: DilemmaStatus;
  };
  dilemma_version_options: {
    dilemma_id: string;
    version: number;
    position: number;
    option_id: string;
    text: string;
  };
  dilemma_version_tags: {
    dilemma_id: string;
    version: number;
    position: number;
    tag: string;
  };
  rooms: {
    id: string;
    code: string;
    host_player_id: string;
    version: number;
    group_nature: GroupNature;
    place: Place;
    variant: RoomVariant;
    adults_only: boolean;
    dilemma_language: DilemmaLanguage;
    /** Null, every category; an empty list, none. */
    categories: string[] | null;
    dilemma_count: DilemmaCount;
    time_per_dilemma_seconds: TimePerDilemmaSeconds;
    new_dilemmas: boolean;
    dilemmas_per_player: DilemmasPerPlayer;
    current_game_id: string | null;
    /** The host who lost the role while disconnected, and gets it back on connecting again. */
    absent_host_player_id: string | null;
    created_at: Generated<Date>;
  };
  room_players: {
    id: string;
    room_id: string;
    position: number;
    nickname: string;
    identity: string;
    avatar_face: AvatarFace;
    avatar_color: PlayerColor;
    has_left: Generated<boolean>;
  };
  room_expelled_identities: {
    room_id: string;
    identity: string;
  };
  /** What the room keeps of each dilemma added: its id and the minimum age it had when added. */
  room_added_dilemmas: {
    room_id: string;
    player_id: string;
    position: number;
    dilemma_id: string;
    minimum_age: 16 | 18;
  };
  room_picked_dilemmas: {
    room_id: string;
    position: number;
    dilemma_id: string;
    minimum_age: 16 | 18;
  };
  instances: {
    id: string;
    seen_at: Date;
  };
  room_connections: {
    id: string;
    player_id: string;
    instance_id: string;
  };
  games: {
    id: string;
    room_id: string;
    /** The round in progress: all null before the game starts. */
    round_position: number | null;
    round_phase: RoundPhase | null;
    round_started_at: Date | null;
    round_ends_at: Date | null;
    round_revealed_by: RevealedBy | null;
    round_moved_on_by: string | null;
    version: number;
    variant: RoomVariant;
    group_nature: GroupNature;
    place: Place;
    dilemma_language: DilemmaLanguage;
    time_per_dilemma_seconds: TimePerDilemmaSeconds;
  };
  game_dilemmas: {
    game_id: string;
    position: number;
    dilemma_id: string;
    dilemma_version: number;
    origin: DilemmaOrigin;
    has_gap: boolean;
    person_in_the_gap: string | null;
    /** The player who added it in the lobby; null for the others. */
    added_by_player_id: string | null;
  };
  /** The options of each dilemma a game plays, copied when it starts: Game reads only its own tables. */
  game_dilemma_options: {
    game_id: string;
    dilemma_id: string;
    option_id: string;
    position: number;
  };
  game_players: {
    game_id: string;
    player_id: string;
    position: number;
    has_left: boolean;
    joined_late: boolean;
  };
  /**
   * Each dilemma as each player plays it: the order of its options, given when the game starts,
   * and whether they did not vote it and what their vote predictions scored.
   */
  game_player_dilemmas: {
    game_id: string;
    player_id: string;
    dilemma_id: string;
    option_order: string[];
    did_not_vote: DidNotVoteReason | null;
    /** Whether the player reported the dilemma, as offensive or for another reason. */
    reported: 'offensive' | 'other' | null;
    /** Whether the predictions were scored, which happens at the reveal of each dilemma of a nominal room. */
    scored: boolean;
    /** Null when scored without any vote prediction made. */
    points: number | null;
  };
  answers: {
    game_id: string;
    player_id: string;
    dilemma_id: string;
    dilemma_version: number;
    vote: string;
    game_consent_version: string;
    research_consent_version: string | null;
    commercial_licence_consent_version: string | null;
    under_eighteen: boolean;
    voter_in_the_gap: boolean;
    /** Written as JSON text: the driver would turn an array into a PostgreSQL array. */
    vote_predictions: ColumnType<VotePrediction[], string, string>;
    option_order: string[];
    response_time_ms: number | null;
  };
}

/** The tables of Dilemmas: only its adapters read or write them. */
export type DilemmasTables = Pick<
  Database,
  'dilemmas' | 'dilemma_versions' | 'dilemma_version_options' | 'dilemma_version_tags'
>;

/** The tables of Game: its adapters see only these, never those of another context (ADR 0001). */
export type GameTables = Pick<
  Database,
  | 'rooms'
  | 'room_players'
  | 'room_expelled_identities'
  | 'room_added_dilemmas'
  | 'room_picked_dilemmas'
  | 'instances'
  | 'room_connections'
  | 'games'
  | 'game_dilemmas'
  | 'game_dilemma_options'
  | 'game_players'
  | 'game_player_dilemmas'
  | 'answers'
>;

/** The database as the adapters and the room server get it. */
export type DatabaseClient = Kysely<Database>;
