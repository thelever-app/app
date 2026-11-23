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
  DilemmaType as RoomDilemmaType,
  Scale as RoomScale,
  AvatarFace,
  DilemmaLanguage,
  DilemmaOrigin,
  Place,
  PlayerColor,
  RoomVariant,
  TimePerDilemmaSeconds,
  DidNotVoteReason,
  RevealedBy,
  RoundPhase,
  VotePrediction,
  GameStage,
  PredictedShare,
  AmbienceOrCustom,
  ContentAge,
  ContentCompromising,
} from '@thelever-app/game';
import type {
  DilemmaReportReason,
  IssueEvent,
  Language as ModerationLanguage,
  NicknameReportReason,
  Outcome,
} from '@thelever-app/moderation';
import type { AnalyticsEventKind, AnalyticsFact } from '@thelever-app/analytics';
import type { DeletionReason } from '@thelever-app/identity';
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
    /** Whether Moderation keeps it out of new games, and the status it would have without it. */
    moderation: 'hidden-by-reports' | 'withdrawn' | null;
    moderation_status_before: DilemmaStatus | null;
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
    /** Whether its text or any of its options has the gap "someone in the group". */
    has_gap: boolean;
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
    place: Place;
    variant: RoomVariant;
    adults_only: boolean;
    /** Only in an anonymous room. */
    compromising_dilemmas: boolean;
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
    /** The dilemmas of the games the room played before, which its rematches do not repeat. */
    played_dilemma_ids: string[];
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
    /** The dilemmas the device of the player says they played, which the room puts games together with. */
    played_dilemma_ids: string[];
    /** Whether they were under 18 when they entered the room, by the age they declared. */
    under_eighteen: boolean;
  };
  room_expelled_identities: {
    room_id: string;
    identity: string;
  };
  /**
   * The rounds of a room in order. A random one has its categories (null, every one); a specific
   * one, its dilemma; one of the players, the dilemma a player chose and who, once chosen. Of each
   * dilemma, the minimum age it had, whether it was compromising, its type, its scale and whether
   * it had the gap when it got into the round.
   */
  room_rounds: {
    room_id: string;
    position: number;
    round_id: number;
    origin: DilemmaOrigin;
    categories: RoomCategory[] | null;
    /** The age a random round draws; null in the others. */
    content_age: ContentAge | null;
    /** Whether a random round draws compromising dilemmas; null in the others. */
    content_compromising: ContentCompromising | null;
    dilemma_id: string | null;
    minimum_age: 16 | 18 | null;
    compromising: boolean | null;
    type: RoomDilemmaType | null;
    scale: RoomScale | null;
    has_gap: boolean | null;
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
    /** When the dilemma of the round was revealed; null in its decision phase. */
    round_revealed_at: Date | null;
    /** The rounds, the game results, or the end of the game. */
    stage: GameStage;
    /**
     * The host who moved everyone to the results or to the end, or who stopped the game; null in the
     * rounds, and when everyone was ready to move on.
     */
    stage_moved_on_by: string | null;
    /** Who is ready to move on from the reveal or the screen of the results the game is on. */
    ready_to_move_on: string[];
    /** The screen of the results everyone is on, from 0; null out of the results. */
    stage_step: number | null;
    version: number;
    /** The ambience whose configuration the room had when the game started, or custom. */
    ambience: AmbienceOrCustom;
    variant: RoomVariant;
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
    fixed_order: boolean;
    person_in_the_gap: string | null;
    /** The player who chose it in the lobby, for a round of the players; null for the others. */
    chosen_by_player_id: string | null;
    /** How long the group spent on its reveal, which nobody sees; null until it moved on. */
    time_spent_ms: number | null;
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
    /** The position of the round in which the player joined the game once started; null from the start. */
    joined_at_position: number | null;
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
    /** Null for the person in the gap, who does not vote the dilemma about them. */
    vote: string | null;
    game_consent_version: string;
    research_consent_version: string | null;
    commercial_licence_consent_version: string | null;
    under_eighteen: boolean;
    objects_to_analytics: boolean;
    /** Written as JSON text: the driver would turn an array into a PostgreSQL array. */
    vote_predictions: ColumnType<VotePrediction[], string, string>;
    /** In an anonymous room; written as JSON text, like the vote predictions. */
    distribution_prediction: ColumnType<PredictedShare[] | null, string | null, string | null>;
    /** In an anonymous room, whether the player pressed Ready. */
    ready: boolean;
    option_order: string[];
    response_time_ms: number | null;
    /** The language the player read the dilemma in; null for answers from before it was kept. */
    language: string | null;
  };
  /** The reactions in the reveal of each dilemma, in the order they were made, each with its seal. */
  reactions: {
    game_id: string;
    position: number;
    dilemma_id: string;
    player_id: string;
    /** Whose vote it is a reaction to; null for one to the dilemma. */
    about_player_id: string | null;
    emoji: string;
    game_consent_version: string;
    research_consent_version: string | null;
    commercial_licence_consent_version: string | null;
    under_eighteen: boolean;
    objects_to_analytics: boolean;
  };
  /** One like per identity and dilemma in all, apart from the rooms, which are deleted. */
  dilemma_likes: {
    identity: string;
    dilemma_id: string;
    /** In the reveal of a game, or from the catalog, which weighs less. */
    given_in: 'game' | 'catalog';
    liked_at: Date;
    game_consent_version: string;
    research_consent_version: string | null;
    commercial_licence_consent_version: string | null;
    under_eighteen: boolean;
    objects_to_analytics: boolean;
  };
  /**
   * The issues of the moderation repository, each with the reports and notices of one content until
   * the team decides, kept 3 years.
   */
  moderation_issues: {
    id: string;
    content_kind: 'dilemma' | 'nickname' | 'reference';
    dilemma_id: string | null;
    nickname: string | null;
    nickname_owner: string | null;
    reference: string | null;
    /** Its number in the moderation repository, once it is there. */
    number: number | null;
    opened_at: Date;
    hidden: boolean;
    outcome: Outcome | null;
    facts: string | null;
    translated_facts: ColumnType<
      Record<ModerationLanguage, string> | null,
      string | null,
      string | null
    >;
    rule: string | null;
    decided_at: Date | null;
  };
  /** The reports players make of dilemmas, kept 3 years from each one. */
  dilemma_reports: {
    id: string;
    issue_id: string;
    dilemma_id: string;
    /** The version the player saw. */
    version: number;
    reason: DilemmaReportReason;
    comment: string | null;
    /** The language the player read it in. */
    language: ModerationLanguage;
    /** Who reports: the report threshold counts different players. Null once their data are deleted. */
    identity: string | null;
    reported_at: Date;
  };
  /** The reports players make of the nicknames of others, kept 3 years. */
  nickname_reports: {
    id: string;
    issue_id: string;
    nickname: string;
    /** Who goes by it; null once their data are deleted. */
    owner: string | null;
    reason: NicknameReportReason;
    comment: string | null;
    identity: string | null;
    reported_at: Date;
  };
  /** The notices of illegal content of the web form, with the email for the decision, kept 3 years. */
  illegal_content_notices: {
    id: string;
    issue_id: string;
    reference: string;
    explanation: string;
    name: string | null;
    email: string | null;
    language: ModerationLanguage;
    identity: string | null;
    sent_at: Date;
  };
  /** What the issues still have to tell the moderation repository and the senders of notices. */
  moderation_outbox: {
    id: Generated<string>;
    issue_id: string;
    event: ColumnType<IssueEvent, string, string>;
  };
  /** The decisions that wait for a player to open the app, kept 3 years. */
  moderation_notices: {
    id: string;
    identity: string;
    /** What the notice tells, as JSON, with its dates as text. */
    subject: ColumnType<Record<string, unknown>, string, string>;
    outcome: Outcome;
    rule: string;
    decided_at: Date;
    seen_at: Date | null;
  };
  /** The first access of each identity: the region of its device, never its address, and its age. */
  first_accesses: {
    identity: string;
    region: 'eea' | 'rest-of-world' | 'blocked';
    birth_year: number | null;
    /** Only of who may be under 18. */
    birth_month: number | null;
    /** The deletion after 24 months without opening the app counts from it. */
    last_opened_at: Date;
    /** The code for requests by email, unique, in capitals and without groups. */
    request_code: string;
  };
  /** The deletion log: what the deletion job does, and does again after a restore; kept 3 years. */
  data_deletions: {
    id: string;
    identity: string;
    reason: DeletionReason;
    requested_at: Date;
    erased_at: Date | null;
  };
  /** Who objects to product analytics, and since when. */
  analytics_objections: {
    identity: string;
    objected_at: Date;
  };
  /** The facts of use of each identity, kept 13 months. */
  analytics_events: {
    id: string;
    identity: string;
    kind: AnalyticsEventKind;
    occurred_at: Date;
    /** Written as JSON text, like the predictions. */
    fact: ColumnType<AnalyticsFact, string, string>;
  };
  /** The last version of each legal document each identity accepted, and when. */
  legal_acceptances: {
    identity: string;
    document: 'terms-of-use' | 'game-consent';
    version: number;
    accepted_at: Date;
    /** Only of the game consent, once withdrawn. */
    withdrawn_at: Date | null;
  };
}

/** The answers to each option of a version of a dilemma, by its position. */
interface WorldAnswers {
  dilemma_id: string;
  version: number;
  position: number;
  answers: number;
}

/** The tables of Identity: only its adapters read or write them. */
export type IdentityTables = Pick<Database, 'first_accesses' | 'data_deletions'>;

/** The tables of Consent: only its adapters read or write them. */
export type ConsentTables = Pick<Database, 'legal_acceptances' | 'analytics_objections'>;

/** The tables of Analytics: only its adapters read or write them. */
export type AnalyticsTables = Pick<Database, 'analytics_events'>;

/** The tables of Moderation: only its adapters read or write them. */
export type ModerationTables = Pick<
  Database,
  | 'moderation_issues'
  | 'dilemma_reports'
  | 'nickname_reports'
  | 'illegal_content_notices'
  | 'moderation_outbox'
  | 'moderation_notices'
>;

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
  | 'reactions'
  | 'dilemma_likes'
>;

/** The database as the adapters and the room server get it. */
export type DatabaseClient = Kysely<Database>;
