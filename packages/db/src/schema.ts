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
  TotalTimeInMinutes,
} from '@thelever-app/game';
import type { Generated, Kysely } from 'kysely';

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
    category: string;
    dilemma_count: DilemmaCount;
    total_time_in_minutes: TotalTimeInMinutes;
    new_dilemmas: boolean;
    players_can_add_dilemmas: boolean;
    current_game_id: string | null;
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
    in_decision_phase: boolean;
    version: number;
    variant: RoomVariant;
    group_nature: GroupNature;
    place: Place;
    dilemma_language: DilemmaLanguage;
    total_time_in_minutes: TotalTimeInMinutes;
  };
  game_dilemmas: {
    game_id: string;
    position: number;
    dilemma_id: string;
    dilemma_version: number;
    origin: DilemmaOrigin;
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
  | 'answers'
>;

/** The database as the adapters and the room server get it. */
export type DatabaseClient = Kysely<Database>;
