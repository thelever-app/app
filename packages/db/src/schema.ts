import type {
  Category,
  DilemmaStatus,
  DilemmaType,
  MinimumAge,
  Scale,
  Translation,
  Visibility,
} from '@thelever-app/dilemmas';
import type {
  Category as RoomCategory,
  AvatarFace,
  DilemmaLanguage,
  DilemmaOrigin,
  GroupNature,
  Place,
  PlayerColor,
  RoomVariant,
  TimePerDilemmaSeconds,
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
    /** Random: a link opens the dilemma with it. */
    public_id: string;
    language: string;
    creator_type: 'curation-team' | 'player' | 'unlinked-player';
    creator_identity: string | null;
    visibility: Visibility;
    created_at: Generated<Date>;
    /** The short title the public web gives it. */
    name: string | null;
    /** In a translation, its original. */
    translation_of: string | null;
  };
  dilemma_versions: {
    dilemma_id: string;
    number: number;
    text: string;
    category: Category;
    minimum_age: MinimumAge;
    type: DilemmaType;
    compromising: boolean;
    scale: Scale;
    /** Whether every player sees its options in their order instead of shuffled. */
    fixed_order: boolean;
    status: DilemmaStatus;
    /** In a translation, the version of the original this version translates. */
    translation_of_version: number | null;
    translation: Translation | null;
  };
  /** The answers of the moment to each option of a version, by its position, translations included. */
  world_counts: WorldAnswers;
  /** The answers last published, once a day: all the app reads of the world result. */
  world_results: WorldAnswers;
  /** Who voted each version alone, to count them once: never the option, nor the time. */
  world_vote_receipts: {
    identity: string;
    dilemma_id: string;
    version: number;
  };
  /** The arguments of a version, for the public web; they change without a new version. */
  dilemma_version_arguments: {
    dilemma_id: string;
    version: number;
    context: string | null;
  };
  dilemma_version_option_arguments: {
    dilemma_id: string;
    version: number;
    option_id: string;
    argument_for: string;
    argument_against: string;
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
    time_per_dilemma_seconds: TimePerDilemmaSeconds;
    new_dilemmas: boolean;
    current_game_id: string | null;
    /** The host who lost the role while disconnected, and gets it back on connecting again. */
    absent_host_player_id: string | null;
    created_at: Generated<Date>;
    /** When its last connection closed; until anyone connects, when it was created. */
    last_connected_at: Date;
    /** When every player had left. */
    closed_at: Date | null;
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
  /**
   * The rounds of a room in order. A random one has its categories (null, every one); a specific
   * one, its dilemma; one of the players, the dilemma a player chose and who, once chosen. Of each
   * dilemma, the minimum age it had and whether it was compromising when it got into the round.
   */
  room_rounds: {
    room_id: string;
    position: number;
    round_id: number;
    origin: DilemmaOrigin;
    categories: RoomCategory[] | null;
    dilemma_id: string | null;
    minimum_age: 16 | 18 | null;
    compromising: boolean | null;
    chosen_by_player_id: string | null;
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
    /** The player who chose it in the lobby, for a round of the players; null for the others. */
    chosen_by_player_id: string | null;
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

/** The answers to each option of a version of a dilemma, by its position. */
interface WorldAnswers {
  dilemma_id: string;
  version: number;
  position: number;
  answers: number;
}

/** The tables of Dilemmas: only its adapters read or write them. */
export type DilemmasTables = Pick<
  Database,
  | 'dilemmas'
  | 'dilemma_versions'
  | 'dilemma_version_options'
  | 'dilemma_version_tags'
  | 'dilemma_version_arguments'
  | 'dilemma_version_option_arguments'
  | 'world_counts'
  | 'world_results'
  | 'world_vote_receipts'
>;

/** The tables of Game: its adapters see only these, never those of another context (ADR 0001). */
export type GameTables = Pick<
  Database,
  | 'rooms'
  | 'room_players'
  | 'room_expelled_identities'
  | 'room_rounds'
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
