import { describe, expect, it } from 'vitest';
import { MAXIMUM_PLAYERS, Room, type RoomSnapshot } from '../../entities/room.ts';
import { DilemmaNotSuitableError } from '../../errors/dilemma-not-suitable.error.ts';
import { DuplicateDilemmaError } from '../../errors/duplicate-dilemma.error.ts';
import { GameInProgressError } from '../../errors/game-in-progress.error.ts';
import { HostCannotBeExpelledError } from '../../errors/host-cannot-be-expelled.error.ts';
import { HostMissingError } from '../../errors/host-missing.error.ts';
import { IdMissingError } from '../../errors/id-missing.error.ts';
import { InvalidRoomCodeError } from '../../errors/invalid-room-code.error.ts';
import { InvalidRoomSettingError } from '../../errors/invalid-room-setting.error.ts';
import { NicknameAndAvatarTakenError } from '../../errors/nickname-and-avatar-taken.error.ts';
import { NicknameMissingError } from '../../errors/nickname-missing.error.ts';
import { NotEnoughPlayersError } from '../../errors/not-enough-players.error.ts';
import { NotChooserError } from '../../errors/not-chooser.error.ts';
import { NotHostError } from '../../errors/not-host.error.ts';
import { PlayerExpelledError } from '../../errors/player-expelled.error.ts';
import { PlayerNotInRoomError } from '../../errors/player-not-in-room.error.ts';
import { AdultsOnlyRoomError } from '../../errors/adults-only-room.error.ts';
import { RoomFullError } from '../../errors/room-full.error.ts';
import { RoundNotForPlayersError } from '../../errors/round-not-for-players.error.ts';
import { RoundNotFoundError } from '../../errors/round-not-found.error.ts';
import { RoundTakenError } from '../../errors/round-taken.error.ts';
import { ConnectionChangedEvent } from '../../events/connection-changed.event.ts';
import { LobbyChangedEvent } from '../../events/lobby-changed.event.ts';
import { AvatarVO } from '../../vos/avatar.vo.ts';
import { FixedIdGenerator } from '../support/fixed-id-generator.ts';
import { FixedRandomness } from '../support/fixed-randomness.ts';

/** When everything in these tests happens, unless a test says otherwise. */
const NOW = new Date('2026-11-12T10:00:00Z');

const ANA_AVATAR = new AvatarVO('face-01', 'khaki');
const LUIS_AVATAR = new AvatarVO('face-02', 'rust');

function roomHostedByAna(): Room {
  return Room.create(
    {
      hostUnderEighteen: false,
      ambience: 'classic',
      hostNickname: 'Ana',
      hostIdentity: 'TestAnaIdentity',
      hostAvatar: ANA_AVATAR,
      place: 'together',
      dilemmaLanguage: 'es',
      code: 'K7M2Q',
      createdAt: NOW,
    },
    new FixedIdGenerator('TestId', 'TestHostId'),
  );
}

/**
 * Each test player has its own identity, derived from its id: TestLuisId is TestLuisIdentity. Unless
 * the test gives one, the player takes the first avatar nobody in the room has.
 */
function join(
  room: Room,
  id: string,
  nickname: string,
  avatar = room.suggestAvatar(new FixedRandomness()),
): void {
  room.join(
    { underEighteen: false, nickname, identity: id.replace(/Id$/, 'Identity'), avatar },
    new FixedIdGenerator(id),
    NOW,
  );
}

/** Ana hosts Luis and Marta, and nothing that happened so far is pending. */
function lobbyOfThree(): Room {
  const room = roomHostedByAna();
  join(room, 'TestLuisId', 'Luis');
  join(room, 'TestMartaId', 'Marta');
  room.pullEvents();
  return room;
}

const FOR_EVERYONE = {
  dilemmaId: 'TestDilemma',
  type: 'standard',
  scale: 'everyday',
  minimumAge: 16,
  hasGap: false,
  compromising: false,
} as const;
const FOR_ADULTS = {
  dilemmaId: 'TestAdultDilemma',
  type: 'standard',
  scale: 'everyday',
  minimumAge: 18,
  hasGap: false,
  compromising: false,
} as const;
const COMPROMISING = {
  dilemmaId: 'TestCompromisingDilemma',
  type: 'standard',
  scale: 'everyday',
  hasGap: false,
  minimumAge: 16,
  compromising: true,
} as const;
const ANOTHER = {
  dilemmaId: 'TestAnotherDilemma',
  type: 'standard',
  scale: 'everyday',
  minimumAge: 16,
  hasGap: false,
  compromising: false,
} as const;

/**
 * Ana's lobby of three with a random round 1, round 2 for the players and FOR_EVERYONE in round 3,
 * and nothing that happened so far is pending.
 */
function lobbyWithAPlayersRound(): Room {
  const room = lobbyOfThree();
  room.changeSettings(
    'TestHostId',
    {
      rounds: [
        { id: 1, origin: 'random', categories: null, content: { age: 'any', compromising: 'any' } },
        { id: 2, origin: 'players' },
        { id: 3, origin: 'specific', dilemmaId: FOR_EVERYONE.dilemmaId },
      ],
    },
    [FOR_EVERYONE],
  );
  room.pullEvents();
  return room;
}

/** Ana creates the room from the public page of a dilemma, which its first round plays. */
function roomStartingWith(firstRoundDilemma: {
  readonly dilemmaId: string;
  readonly type: 'standard';
  readonly scale: 'everyday';
  readonly minimumAge: 16 | 18;
  readonly hasGap: false;
  readonly compromising: boolean;
}): Room {
  return Room.create(
    {
      hostUnderEighteen: false,
      ambience: 'classic',
      hostNickname: 'Ana',
      hostIdentity: 'TestAnaIdentity',
      hostAvatar: ANA_AVATAR,
      place: 'together',
      dilemmaLanguage: 'es',
      code: 'K7M2Q',
      createdAt: NOW,
      firstRoundDilemma,
    },
    new FixedIdGenerator('TestId', 'TestHostId'),
  );
}

describe('Room', () => {
  describe('create', () => {
    it('should have an id, a code and a host with that nickname', () => {
      // Act
      const room = roomHostedByAna();

      // Assert
      expect(room.id).toBe('TestId');
      expect(room.code).toBe('K7M2Q');
      expect(room.host.id).toBe('TestHostId');
      expect(room.host.nickname).toBe('Ana');
    });

    it('should give the host the avatar they chose', () => {
      // Act
      const room = roomHostedByAna();

      // Assert
      expect(room.host.avatar).toEqual(ANA_AVATAR);
    });

    it('should keep where the group plays', () => {
      // Act
      const room = roomHostedByAna();

      // Assert
      expect(room.place).toBe('together');
    });

    it('should start in the lobby with the default settings in the language of the host', () => {
      // Act
      const room = roomHostedByAna();

      // Assert
      expect(room.isInLobby).toBe(true);
      expect(room.currentGameId).toBeNull();
      expect(room.settings.variant).toBe('nominal');
      expect(room.settings.dilemmaLanguage).toBe('es');
    });

    it.each([
      [{ place: 'moon' }, InvalidRoomSettingError],
      [{ code: 'K7M20' }, InvalidRoomCodeError],
      [{ hostNickname: '' }, NicknameMissingError],
    ])('should throw an error for %o', (change, error) => {
      // Act & Assert
      expect(() =>
        Room.create(
          {
            hostUnderEighteen: false,
            ambience: 'classic',
            hostNickname: 'Ana',
            hostIdentity: 'TestAnaIdentity',
            hostAvatar: ANA_AVATAR,
            place: 'together',
            dilemmaLanguage: 'es',
            code: 'K7M2Q',
            createdAt: NOW,
            ...change,
          },
          new FixedIdGenerator('TestId', 'TestHostId'),
        ),
      ).toThrow(error);
    });

    it('should throw an error if the id is missing', () => {
      // Act & Assert
      expect(() =>
        Room.create(
          {
            hostUnderEighteen: false,
            ambience: 'classic',
            hostNickname: 'Ana',
            hostIdentity: 'TestAnaIdentity',
            hostAvatar: ANA_AVATAR,
            place: 'together',
            dilemmaLanguage: 'es',
            code: 'K7M2Q',
            createdAt: NOW,
          },
          new FixedIdGenerator('', 'TestHostId'),
        ),
      ).toThrow(IdMissingError);
    });
    it('should put the dilemma it is created with in its first round, as specific', () => {
      // Act
      const room = roomStartingWith(FOR_EVERYONE);

      // Assert
      expect(room.settings.rounds).toHaveLength(8);
      expect(room.settings.rounds[0]).toEqual({ id: 1, origin: 'specific', dilemma: FOR_EVERYONE });
      expect(room.settings.rounds.slice(1).map(({ origin }) => origin)).toEqual(
        Array(7).fill('random'),
      );
    });

    it('should have 8 random rounds from every category when it is created without a dilemma', () => {
      // Act
      const room = roomHostedByAna();

      // Assert
      expect(room.settings.rounds).toEqual(
        Array.from({ length: 8 }, (_, index) => ({
          id: index + 1,
          origin: 'random',
          categories: null,
          content: { age: 'any', compromising: 'any' },
        })),
      );
      expect(room.chosenDilemmas).toEqual([]);
    });

    it('should throw an error if the dilemma does not suit the room', () => {
      // Act & Assert
      expect(() => roomStartingWith(FOR_ADULTS)).toThrow(DilemmaNotSuitableError);
    });

    it('should throw an error if the dilemma is compromising', () => {
      // Act & Assert
      expect(() => roomStartingWith(COMPROMISING)).toThrow(DilemmaNotSuitableError);
    });
  });

  describe('join', () => {
    it('should add the player after the host and record that the lobby changed', () => {
      // Arrange
      const room = roomHostedByAna();

      // Act
      join(room, 'TestLuisId', 'Luis');

      // Assert
      expect(room.players.map(({ id }) => id)).toEqual(['TestHostId', 'TestLuisId']);
      expect(room.version).toBe(1);
      expect(room.pullEvents()).toEqual([new LobbyChangedEvent('TestId', 'player-joined', 1)]);
    });

    it('should give the player the avatar they chose', () => {
      // Arrange
      const room = roomHostedByAna();
      const avatar = new AvatarVO('face-07', 'rust');

      // Act
      join(room, 'TestLuisId', 'Luis', avatar);

      // Assert
      expect(room.playerWith('TestLuisIdentity')?.avatar).toEqual(avatar);
    });

    it('should let a player take the avatar of someone with another nickname', () => {
      // Arrange
      const room = roomHostedByAna();

      // Act
      join(room, 'TestLuisId', 'Luis', ANA_AVATAR);

      // Assert
      expect(room.playerWith('TestLuisIdentity')?.avatar).toEqual(ANA_AVATAR);
    });

    it.each(['Ana', 'ana', 'Aná'])(
      'should throw an error if %s takes the avatar of Ana',
      (nickname) => {
        // Arrange
        const room = roomHostedByAna();

        // Act & Assert
        expect(() => join(room, 'TestOtherAnaId', nickname, ANA_AVATAR)).toThrow(
          NicknameAndAvatarTakenError,
        );
        expect(room.players).toHaveLength(1);
      },
    );

    it('should give back the player of an identity already in the room, without changing anything', () => {
      // Arrange
      const room = lobbyOfThree();

      // Act
      const player = room.join(
        {
          underEighteen: false,
          nickname: 'Luis again',
          identity: 'TestLuisIdentity',
          avatar: ANA_AVATAR,
        },
        new FixedIdGenerator('TestOtherId'),
        NOW,
      );

      // Assert
      expect(player.id).toBe('TestLuisId');
      expect(room.players).toHaveLength(3);
      expect(room.pullEvents()).toEqual([]);
    });

    it('should let two players share a nickname', () => {
      // Arrange
      const room = roomHostedByAna();

      // Act
      join(room, 'TestOtherAnaId', 'Ana');

      // Assert
      expect(room.players.map(({ nickname }) => nickname)).toEqual(['Ana', 'Ana']);
    });

    it('should throw an error if the room is full', () => {
      // Arrange
      const room = roomHostedByAna();
      for (let index = 1; index < MAXIMUM_PLAYERS; index += 1) {
        join(room, `TestPlayer${index}Id`, 'P');
      }

      // Act & Assert
      expect(() => join(room, 'TestLateId', 'Late')).toThrow(RoomFullError);
    });

    it('should not let anyone under 18 into a room for adults', () => {
      // Arrange
      const room = roomHostedByAna();
      room.changeSettings('TestHostId', { adultsOnly: true });
      const luis = { nickname: 'Luis', identity: 'TestLuisIdentity', avatar: LUIS_AVATAR };

      // Act & Assert
      expect(() =>
        room.join({ ...luis, underEighteen: true }, new FixedIdGenerator('TestLuisId'), NOW),
      ).toThrow(AdultsOnlyRoomError);
      expect(room.players).toHaveLength(1);
    });

    it('should let anyone under 18 into a room that is not for adults', () => {
      // Arrange
      const room = roomHostedByAna();
      const luis = { nickname: 'Luis', identity: 'TestLuisIdentity', avatar: LUIS_AVATAR };

      // Act
      room.join({ ...luis, underEighteen: true }, new FixedIdGenerator('TestLuisId'), NOW);

      // Assert
      expect(room.playerWith('TestLuisIdentity')?.underEighteen).toBe(true);
    });

    it('should throw an error if the player was expelled from the game the lobby is getting ready', () => {
      // Arrange
      const room = lobbyOfThree();
      room.expel('TestHostId', 'TestMartaId');

      // Act & Assert
      expect(() => join(room, 'TestMartaId', 'Marta')).toThrow(PlayerExpelledError);
    });
  });

  describe('suggestAvatar', () => {
    it('should suggest, at random, an avatar nobody in the room has', () => {
      // Arrange: Ana wears the first avatar, so the free ones start at the second.
      const room = Room.create(
        {
          hostUnderEighteen: false,
          ambience: 'classic',
          hostNickname: 'Ana',
          hostIdentity: 'TestAnaIdentity',
          hostAvatar: AvatarVO.all()[0] as AvatarVO,
          place: 'together',
          dilemmaLanguage: 'es',
          code: 'K7M2Q',
          createdAt: NOW,
        },
        new FixedIdGenerator('TestId', 'TestHostId'),
      );

      // Act
      const first = room.suggestAvatar(new FixedRandomness(0));
      const tenth = room.suggestAvatar(new FixedRandomness(9));

      // Assert
      expect(first).toEqual(AvatarVO.all()[1]);
      expect(tenth).toEqual(AvatarVO.all()[10]);
    });
  });

  describe('changeAvatar', () => {
    it('should change the avatar of the player and record that the lobby changed', () => {
      // Arrange
      const room = lobbyOfThree();
      const avatar = new AvatarVO('face-12', 'teal');

      // Act
      room.changeAvatar('TestLuisId', avatar);

      // Assert
      expect(room.playerWith('TestLuisIdentity')?.avatar).toEqual(avatar);
      expect(room.pullEvents()).toEqual([new LobbyChangedEvent('TestId', 'avatar-changed', 3)]);
    });

    it('should let the player take the avatar of someone with another nickname', () => {
      // Arrange
      const room = lobbyOfThree();

      // Act
      room.changeAvatar('TestLuisId', ANA_AVATAR);

      // Assert
      expect(room.playerWith('TestLuisIdentity')?.avatar).toEqual(ANA_AVATAR);
    });

    it('should throw an error if someone with the same nickname has that avatar', () => {
      // Arrange
      const room = lobbyOfThree();
      join(room, 'TestOtherAnaId', 'aná');

      // Act & Assert
      expect(() => room.changeAvatar('TestOtherAnaId', ANA_AVATAR)).toThrow(
        NicknameAndAvatarTakenError,
      );
    });

    it('should change nothing if the player already has that avatar', () => {
      // Arrange
      const room = lobbyOfThree();

      // Act
      room.changeAvatar('TestHostId', room.host.avatar);

      // Assert
      expect(room.pullEvents()).toEqual([]);
    });
  });

  describe('changeSettings', () => {
    it('should change the settings the host gives and record that the lobby changed', () => {
      // Arrange
      const room = lobbyOfThree();

      // Act
      room.changeSettings('TestHostId', { variant: 'anonymous', timePerDilemmaSeconds: 90 });

      // Assert
      expect(room.settings.variant).toBe('anonymous');
      expect(room.settings.timePerDilemmaSeconds).toBe(90);
      expect(room.settings.rounds).toHaveLength(8);
      expect(room.pullEvents()).toEqual([new LobbyChangedEvent('TestId', 'settings-changed', 3)]);
    });

    it('should throw an error if the player is not the host', () => {
      // Arrange
      const room = lobbyOfThree();

      // Act & Assert
      expect(() => room.changeSettings('TestLuisId', { variant: 'anonymous' })).toThrow(
        NotHostError,
      );
    });

    it('should throw an error once the game has started', () => {
      // Arrange
      const room = lobbyOfThree();
      room.startGame('TestHostId', 'TestGameId');

      // Act & Assert
      expect(() => room.changeSettings('TestHostId', { variant: 'anonymous' })).toThrow(
        GameInProgressError,
      );
    });

    it('should keep the rounds the host gives, in order, giving a new one the next id', () => {
      // Arrange
      const room = lobbyOfThree();

      // Act
      room.changeSettings('TestHostId', {
        rounds: [
          { id: 3, origin: 'players' },
          {
            origin: 'random',
            categories: ['honesty', 'loyalty'],
            content: { age: 'any', compromising: 'any' },
          },
          {
            id: 1,
            origin: 'random',
            categories: null,
            content: { age: 'any', compromising: 'any' },
          },
        ],
      });

      // Assert
      expect(room.settings.rounds).toEqual([
        { id: 3, origin: 'players' },
        {
          id: 9,
          origin: 'random',
          categories: ['honesty', 'loyalty'],
          content: { age: 'any', compromising: 'any' },
        },
        { id: 1, origin: 'random', categories: null, content: { age: 'any', compromising: 'any' } },
      ]);
    });

    it('should keep the dilemma of a specific round as the catalog has it', () => {
      // Arrange
      const room = lobbyOfThree();

      // Act
      room.changeSettings(
        'TestHostId',
        { rounds: [{ id: 1, origin: 'specific', dilemmaId: 'TestDilemma' }] },
        [FOR_EVERYONE],
      );

      // Assert
      expect(room.settings.rounds).toEqual([{ id: 1, origin: 'specific', dilemma: FOR_EVERYONE }]);
      expect(room.roundDilemmaIds).toEqual(['TestDilemma']);
    });

    it.each([
      { case: 'does not suit the room', dilemmas: [FOR_ADULTS] },
      { case: 'is compromising', dilemmas: [COMPROMISING] },
      { case: 'is not in the catalog', dilemmas: [] },
    ])('should throw an error for a specific dilemma that $case', ({ dilemmas }) => {
      // Arrange
      const room = lobbyOfThree();
      const dilemmaId = dilemmas[0]?.dilemmaId ?? 'TestNoDilemma';

      // Act & Assert
      expect(() =>
        room.changeSettings(
          'TestHostId',
          { rounds: [{ id: 1, origin: 'specific', dilemmaId }] },
          dilemmas,
        ),
      ).toThrow(DilemmaNotSuitableError);
      expect(room.settings.rounds).toHaveLength(8);
    });

    it('should throw an error for a specific dilemma a player already chose for a round', () => {
      // Arrange
      const room = lobbyWithAPlayersRound();
      room.chooseRoundDilemma('TestLuisId', 2, ANOTHER);

      // Act & Assert
      expect(() =>
        room.changeSettings(
          'TestHostId',
          {
            rounds: [
              { id: 1, origin: 'specific', dilemmaId: ANOTHER.dilemmaId },
              { id: 2, origin: 'players' },
            ],
          },
          [ANOTHER],
        ),
      ).toThrow(DuplicateDilemmaError);
    });

    it('should make random the specific round of a dilemma the room no longer suits', () => {
      // Arrange
      const room = lobbyOfThree();
      room.changeSettings(
        'TestHostId',
        {
          adultsOnly: true,
          rounds: [
            {
              id: 1,
              origin: 'random',
              categories: ['honesty'],
              content: { age: 'any', compromising: 'any' },
            },
            { id: 2, origin: 'specific', dilemmaId: FOR_ADULTS.dilemmaId },
          ],
        },
        [FOR_ADULTS],
      );

      // Act
      room.changeSettings('TestHostId', { adultsOnly: false });

      // Assert
      expect(room.settings.rounds).toEqual([
        {
          id: 1,
          origin: 'random',
          categories: ['honesty'],
          content: { age: 'any', compromising: 'any' },
        },
        { id: 2, origin: 'random', categories: null, content: { age: 'any', compromising: 'any' } },
      ]);
    });

    it('should make random the round of a dilemma a player chose that the room no longer suits', () => {
      // Arrange
      const room = lobbyWithAPlayersRound();
      room.changeSettings('TestHostId', { adultsOnly: true });
      room.chooseRoundDilemma('TestLuisId', 2, FOR_ADULTS);

      // Act
      room.changeSettings('TestHostId', { adultsOnly: false });

      // Assert
      expect(room.chosenDilemmas).toEqual([]);
      expect(room.settings.rounds[1]).toEqual({
        id: 2,
        origin: 'random',
        categories: null,
        content: { age: 'any', compromising: 'any' },
      });
    });

    it('should drop what a player chose when the round is no longer theirs, and keep the others', () => {
      // Arrange
      const room = lobbyWithAPlayersRound();
      room.changeSettings('TestHostId', {
        rounds: [
          { id: 2, origin: 'players' },
          { id: 4, origin: 'players' },
        ],
      });
      room.chooseRoundDilemma('TestLuisId', 2, FOR_EVERYONE);
      room.chooseRoundDilemma('TestMartaId', 4, ANOTHER);

      // Act
      room.changeSettings('TestHostId', {
        rounds: [
          {
            id: 2,
            origin: 'random',
            categories: null,
            content: { age: 'any', compromising: 'any' },
          },
          { id: 4, origin: 'players' },
        ],
      });

      // Assert
      expect(room.chosenDilemmas.map(({ roundId }) => roundId)).toEqual([4]);
    });
  });

  describe('chooseRoundDilemma', () => {
    it('should keep the dilemma with who chose it and record that the lobby changed', () => {
      // Arrange
      const room = lobbyWithAPlayersRound();

      // Act
      room.chooseRoundDilemma('TestLuisId', 2, ANOTHER);

      // Assert
      expect(room.chosenDilemmas).toEqual([{ ...ANOTHER, roundId: 2, playerId: 'TestLuisId' }]);
      expect(room.roundDilemmaIds).toEqual(['TestDilemma', 'TestAnotherDilemma']);
      expect(room.pullEvents()).toEqual([new LobbyChangedEvent('TestId', 'dilemmas-changed', 4)]);
    });

    it('should let the host choose too', () => {
      // Arrange
      const room = lobbyWithAPlayersRound();

      // Act
      room.chooseRoundDilemma('TestHostId', 2, ANOTHER);

      // Assert
      expect(room.chosenDilemmas).toEqual([{ ...ANOTHER, roundId: 2, playerId: 'TestHostId' }]);
    });

    it.each([
      {
        case: 'a round that is not in the room',
        roundId: 7,
        dilemma: ANOTHER,
        error: RoundNotFoundError,
      },
      {
        case: 'a round the players do not choose',
        roundId: 1,
        dilemma: ANOTHER,
        error: RoundNotForPlayersError,
      },
      {
        case: 'a dilemma already in another round',
        roundId: 2,
        dilemma: FOR_EVERYONE,
        error: DuplicateDilemmaError,
      },
      {
        case: 'a dilemma that does not suit the room',
        roundId: 2,
        dilemma: FOR_ADULTS,
        error: DilemmaNotSuitableError,
      },
      {
        case: 'a compromising dilemma',
        roundId: 2,
        dilemma: COMPROMISING,
        error: DilemmaNotSuitableError,
      },
    ])('should throw an error for $case', ({ roundId, dilemma, error }) => {
      // Arrange
      const room = lobbyWithAPlayersRound();

      // Act & Assert
      expect(() => room.chooseRoundDilemma('TestLuisId', roundId, dilemma)).toThrow(error);
      expect(room.chosenDilemmas).toEqual([]);
    });

    it('should throw an error if another player has already chosen the dilemma of the round', () => {
      // Arrange
      const room = lobbyWithAPlayersRound();
      room.chooseRoundDilemma('TestLuisId', 2, ANOTHER);

      // Act & Assert
      expect(() =>
        room.chooseRoundDilemma('TestMartaId', 2, { ...ANOTHER, dilemmaId: 'TestThird' }),
      ).toThrow(RoundTakenError);
    });

    it('should throw an error once the game has started', () => {
      // Arrange
      const room = lobbyWithAPlayersRound();
      room.startGame('TestHostId', 'TestGameId');

      // Act & Assert
      expect(() => room.chooseRoundDilemma('TestLuisId', 2, ANOTHER)).toThrow(GameInProgressError);
    });
  });

  describe('clearRoundDilemma', () => {
    /** Luis chose the dilemma of round 2, and nothing that happened so far is pending. */
    function lobbyWhereLuisChose(): Room {
      const room = lobbyWithAPlayersRound();
      room.chooseRoundDilemma('TestLuisId', 2, ANOTHER);
      room.pullEvents();
      return room;
    }

    it('should let the player who chose it take it out, and the round is empty again', () => {
      // Arrange
      const room = lobbyWhereLuisChose();

      // Act
      room.clearRoundDilemma('TestLuisId', 2);

      // Assert
      expect(room.chosenDilemmas).toEqual([]);
      expect(room.pullEvents()).toEqual([new LobbyChangedEvent('TestId', 'dilemmas-changed', 5)]);
    });

    it.each(['TestHostId', 'TestMartaId'])(
      'should throw an error if %s, who did not choose it, takes it out',
      (playerId) => {
        // Arrange
        const room = lobbyWhereLuisChose();

        // Act & Assert
        expect(() => room.clearRoundDilemma(playerId, 2)).toThrow(NotChooserError);
        expect(room.chosenDilemmas).toHaveLength(1);
      },
    );

    it('should change nothing in a round without a dilemma', () => {
      // Arrange
      const room = lobbyWithAPlayersRound();

      // Act
      room.clearRoundDilemma('TestLuisId', 2);

      // Assert
      expect(room.pullEvents()).toEqual([]);
    });

    it('should throw an error once the game has started', () => {
      // Arrange
      const room = lobbyWhereLuisChose();
      room.startGame('TestHostId', 'TestGameId');

      // Act & Assert
      expect(() => room.clearRoundDilemma('TestLuisId', 2)).toThrow(GameInProgressError);
    });
  });

  describe('expel', () => {
    it('should take the player and their connections out, and leave the dilemma they chose without them', () => {
      // Arrange
      const room = lobbyWithAPlayersRound();
      room.chooseRoundDilemma('TestMartaId', 2, ANOTHER);
      room.connect('TestMartaId', 'TestConnectionId', NOW);
      room.pullEvents();

      // Act
      room.expel('TestHostId', 'TestMartaId');

      // Assert: the round stays filled, so nobody learns who had chosen it.
      expect(room.playerWith('TestMartaIdentity')).toBeUndefined();
      expect(room.chosenDilemmas).toEqual([{ ...ANOTHER, roundId: 2, playerId: null }]);
      expect(() => room.clearRoundDilemma('TestHostId', 2)).toThrow(NotChooserError);
      expect(room.toSnapshot().connections).toEqual([]);
      expect(room.pullEvents()).toEqual([new LobbyChangedEvent('TestId', 'player-expelled', 6)]);
    });

    it('should throw an error if the player is not the host', () => {
      // Arrange
      const room = lobbyOfThree();

      // Act & Assert
      expect(() => room.expel('TestLuisId', 'TestMartaId')).toThrow(NotHostError);
    });

    it('should throw an error if the host tries to expel themselves', () => {
      // Arrange
      const room = lobbyOfThree();

      // Act & Assert
      expect(() => room.expel('TestHostId', 'TestHostId')).toThrow(HostCannotBeExpelledError);
    });

    it('should throw an error once the game has started', () => {
      // Arrange
      const room = lobbyOfThree();
      room.startGame('TestHostId', 'TestGameId');

      // Act & Assert
      expect(() => room.expel('TestHostId', 'TestMartaId')).toThrow(GameInProgressError);
    });

    it('should throw an error if the player is not in the room', () => {
      // Arrange
      const room = lobbyOfThree();

      // Act & Assert
      expect(() => room.expel('TestHostId', 'TestUnknownId')).toThrow(PlayerNotInRoomError);
    });
  });

  describe('minimumPlayers', () => {
    it('should be two in a nominal room and three in an anonymous one', () => {
      // Arrange
      const room = roomHostedByAna();
      const nominal = room.minimumPlayers;

      // Act
      room.changeSettings('TestHostId', { variant: 'anonymous' });

      // Assert
      expect(nominal).toBe(2);
      expect(room.minimumPlayers).toBe(3);
    });
  });

  describe('playsTheGap', () => {
    it.each([
      ['nominal', 2, false],
      ['nominal', 3, true],
      ['anonymous', 3, false],
      ['anonymous', 4, true],
    ] as const)(
      'should tell whether a %s room of %i players plays the dilemmas with the gap: %s',
      (variant, players, plays) => {
        // Arrange
        const room = roomHostedByAna();
        room.changeSettings('TestHostId', { variant });
        for (const [index, nickname] of ['Luis', 'Marta', 'Sara'].slice(0, players - 1).entries()) {
          join(room, `Test${nickname}${index}Id`, nickname);
        }

        // Act & Assert
        expect(room.minimumPlayersForTheGap).toBe(variant === 'nominal' ? 3 : 4);
        expect(room.playsTheGap).toBe(plays);
      },
    );
  });

  describe('playedBy', () => {
    it('should count how many players of the room played each dilemma, with what each device said last', () => {
      // Arrange
      const room = roomHostedByAna();
      room.join(
        {
          underEighteen: false,
          nickname: 'Luis',
          identity: 'TestLuisIdentity',
          avatar: new AvatarVO('face-02', 'khaki'),
          playedDilemmaIds: ['TestDilemma1', 'TestDilemma1', 'TestDilemma2'],
        },
        new FixedIdGenerator('TestLuisId'),
        NOW,
      );
      room.join(
        {
          underEighteen: false,
          nickname: 'Marta',
          identity: 'TestMartaIdentity',
          avatar: new AvatarVO('face-03', 'khaki'),
          playedDilemmaIds: ['TestDilemma1'],
        },
        new FixedIdGenerator('TestMartaId'),
        NOW,
      );

      // Act
      room.join(
        {
          underEighteen: false,
          nickname: 'Luis',
          identity: 'TestLuisIdentity',
          avatar: new AvatarVO('face-02', 'khaki'),
          playedDilemmaIds: ['TestDilemma1', 'TestDilemma3'],
        },
        new FixedIdGenerator('TestUnusedId'),
        NOW,
      );

      // Assert
      expect(room.playedBy).toEqual(
        new Map([
          ['TestDilemma1', 2],
          ['TestDilemma3', 1],
        ]),
      );
    });
  });

  describe('ensureCanStartGame', () => {
    it('should check the same as starting, without starting anything', () => {
      // Arrange
      const room = lobbyOfThree();

      // Act
      room.ensureCanStartGame('TestHostId');

      // Assert
      expect(() => room.ensureCanStartGame('TestLuisId')).toThrow(NotHostError);
      expect(room.isInLobby).toBe(true);
      expect(room.pullEvents()).toEqual([]);
    });
  });

  describe('startGame', () => {
    it('should keep the game in progress and record that the lobby changed', () => {
      // Arrange
      const room = lobbyOfThree();

      // Act
      room.startGame('TestHostId', 'TestGameId');

      // Assert
      expect(room.currentGameId).toBe('TestGameId');
      expect(room.isInLobby).toBe(false);
      expect(room.pullEvents()).toEqual([new LobbyChangedEvent('TestId', 'game-started', 3)]);
    });

    it('should leave the dilemmas of the rounds to the game it starts, not to the next one', () => {
      // Arrange
      const room = lobbyWithAPlayersRound();
      room.chooseRoundDilemma('TestLuisId', 2, ANOTHER);

      // Act
      room.startGame('TestHostId', 'TestGameId');

      // Assert
      expect(room.settings.rounds).toEqual([
        { id: 1, origin: 'random', categories: null, content: { age: 'any', compromising: 'any' } },
        { id: 2, origin: 'players' },
        { id: 3, origin: 'random', categories: null, content: { age: 'any', compromising: 'any' } },
      ]);
      expect(room.chosenDilemmas).toEqual([]);
    });

    it('should start a nominal room with two players', () => {
      // Arrange
      const room = roomHostedByAna();
      join(room, 'TestLuisId', 'Luis');

      // Act
      room.startGame('TestHostId', 'TestGameId');

      // Assert
      expect(room.currentGameId).toBe('TestGameId');
    });

    it('should throw an error in a nominal room with the host alone', () => {
      // Arrange
      const room = roomHostedByAna();

      // Act & Assert
      expect(() => room.startGame('TestHostId', 'TestGameId')).toThrow(NotEnoughPlayersError);
    });

    it('should throw an error in an anonymous room with fewer than three players', () => {
      // Arrange
      const room = roomHostedByAna();
      join(room, 'TestLuisId', 'Luis');
      room.changeSettings('TestHostId', { variant: 'anonymous' });

      // Act & Assert
      expect(() => room.startGame('TestHostId', 'TestGameId')).toThrow(NotEnoughPlayersError);
    });

    it('should throw an error if a game is already in progress', () => {
      // Arrange
      const room = lobbyOfThree();
      room.startGame('TestHostId', 'TestGameId');

      // Act & Assert
      expect(() => room.startGame('TestHostId', 'TestOtherGameId')).toThrow(GameInProgressError);
    });

    it('should throw an error if the player is not the host', () => {
      // Arrange
      const room = lobbyOfThree();

      // Act & Assert
      expect(() => room.startGame('TestLuisId', 'TestGameId')).toThrow(NotHostError);
    });
  });

  describe('connect', () => {
    it('should start with nobody connected and version 0', () => {
      // Arrange & Act
      const room = roomHostedByAna();

      // Assert
      expect(room.isConnected('TestHostId')).toBe(false);
      expect(room.version).toBe(0);
    });

    it('should connect the player and raise the version', () => {
      // Arrange
      const room = roomHostedByAna();

      // Act
      room.connect('TestHostId', 'TestConnectionId', NOW);

      // Assert
      expect(room.isConnected('TestHostId')).toBe(true);
      expect(room.version).toBe(1);
    });

    it('should record a connection changed event with the new version', () => {
      // Arrange
      const room = roomHostedByAna();

      // Act
      room.connect('TestHostId', 'TestConnectionId', NOW);

      // Assert
      expect(room.pullEvents()).toEqual([
        new ConnectionChangedEvent('TestId', 'TestHostId', true, 1),
      ]);
    });

    it('should keep a player who is already connected connected through another connection, without any event', () => {
      // Arrange
      const room = roomHostedByAna();
      room.connect('TestHostId', 'TestFirstConnectionId', NOW);
      room.pullEvents();

      // Act
      room.connect('TestHostId', 'TestSecondConnectionId', NOW);

      // Assert
      expect(room.isConnected('TestHostId')).toBe(true);
      expect(room.version).toBe(1);
      expect(room.pullEvents()).toEqual([]);
    });

    it('should throw an error if the player is not in the room', () => {
      // Arrange
      const room = roomHostedByAna();

      // Act & Assert
      expect(() => room.connect('TestUnknownId', 'TestConnectionId', NOW)).toThrow(
        PlayerNotInRoomError,
      );
    });

    it('should throw an error if the connection id is missing', () => {
      // Arrange
      const room = roomHostedByAna();

      // Act & Assert
      expect(() => room.connect('TestHostId', '', NOW)).toThrow(IdMissingError);
    });
  });

  describe('disconnect', () => {
    it('should disconnect the player and raise the version', () => {
      // Arrange
      const room = roomHostedByAna();
      room.connect('TestHostId', 'TestConnectionId', NOW);

      // Act
      room.disconnect('TestHostId', 'TestConnectionId', NOW);

      // Assert
      expect(room.isConnected('TestHostId')).toBe(false);
      expect(room.version).toBe(2);
    });

    it('should record a connection changed event with the new version', () => {
      // Arrange
      const room = roomHostedByAna();
      room.connect('TestHostId', 'TestConnectionId', NOW);
      room.pullEvents();

      // Act
      room.disconnect('TestHostId', 'TestConnectionId', NOW);

      // Assert
      expect(room.pullEvents()).toEqual([
        new ConnectionChangedEvent('TestId', 'TestHostId', false, 2),
      ]);
    });

    it('should ignore the late close of a connection the player already reopened', () => {
      // Arrange
      const room = roomHostedByAna();
      room.connect('TestHostId', 'TestOldConnectionId', NOW);
      room.connect('TestHostId', 'TestNewConnectionId', NOW);
      room.pullEvents();

      // Act
      room.disconnect('TestHostId', 'TestOldConnectionId', NOW);

      // Assert
      expect(room.isConnected('TestHostId')).toBe(true);
      expect(room.version).toBe(1);
      expect(room.pullEvents()).toEqual([]);
    });

    it('should disconnect the player when their last open connection closes', () => {
      // Arrange
      const room = roomHostedByAna();
      room.connect('TestHostId', 'TestFirstConnectionId', NOW);
      room.connect('TestHostId', 'TestSecondConnectionId', NOW);
      room.disconnect('TestHostId', 'TestSecondConnectionId', NOW);
      room.pullEvents();

      // Act
      room.disconnect('TestHostId', 'TestFirstConnectionId', NOW);

      // Assert
      expect(room.isConnected('TestHostId')).toBe(false);
      expect(room.version).toBe(2);
      expect(room.pullEvents()).toEqual([
        new ConnectionChangedEvent('TestId', 'TestHostId', false, 2),
      ]);
    });

    it('should ignore a connection of the player that is not open', () => {
      // Arrange
      const room = roomHostedByAna();
      room.connect('TestHostId', 'TestConnectionId', NOW);
      room.pullEvents();

      // Act
      room.disconnect('TestHostId', 'TestUnknownConnectionId', NOW);

      // Assert
      expect(room.isConnected('TestHostId')).toBe(true);
      expect(room.version).toBe(1);
      expect(room.pullEvents()).toEqual([]);
    });

    it('should ignore a player who is not connected', () => {
      // Arrange
      const room = roomHostedByAna();

      // Act
      room.disconnect('TestHostId', 'TestConnectionId', NOW);

      // Assert
      expect(room.version).toBe(0);
      expect(room.pullEvents()).toEqual([]);
    });

    it('should connect again after a disconnection', () => {
      // Arrange
      const room = roomHostedByAna();
      room.connect('TestHostId', 'TestConnectionId', NOW);
      room.disconnect('TestHostId', 'TestConnectionId', NOW);

      // Act
      room.connect('TestHostId', 'TestOtherConnectionId', NOW);

      // Assert
      expect(room.isConnected('TestHostId')).toBe(true);
      expect(room.version).toBe(3);
    });
  });

  describe('hasPlayer', () => {
    it('should tell whether a player is in the room', () => {
      // Arrange
      const room = lobbyOfThree();

      // Act & Assert
      expect(room.hasPlayer('TestLuisId')).toBe(true);
      expect(room.hasPlayer('TestUnknownId')).toBe(false);
    });
  });

  describe('players', () => {
    it('should not let the players be changed from outside the room', () => {
      // Arrange
      const room = lobbyOfThree();

      // Act
      (room.players as unknown[]).pop();

      // Assert
      expect(room.players).toHaveLength(3);
    });
  });

  describe('toSnapshot and restore', () => {
    it('should give everything about the room as plain data', () => {
      // Arrange
      const room = lobbyOfThree();
      room.connect('TestLuisId', 'TestConnectionId', NOW);

      // Act
      const snapshot = room.toSnapshot();

      // Assert
      expect(snapshot).toEqual({
        id: 'TestId',
        code: 'K7M2Q',
        hostId: 'TestHostId',
        place: 'together',
        settings: room.settings.toSnapshot(),
        players: room.players.map((player) => player.toSnapshot()),
        version: 3,
        connections: [{ playerId: 'TestLuisId', connectionId: 'TestConnectionId' }],
        expelledIdentities: [],
        chosenDilemmas: [],
        currentGameId: null,
        absentHostId: null,
        leftPlayerIds: [],
        playedDilemmaIds: [],
        lastConnectedAt: NOW,
        closedAt: null,
      });
    });

    it('should rebuild the whole room from its snapshot, without recording any event', () => {
      // Arrange
      const room = lobbyWithAPlayersRound();
      room.changeSettings('TestHostId', { adultsOnly: true });
      room.chooseRoundDilemma('TestLuisId', 2, FOR_ADULTS);
      room.connect('TestHostId', 'TestFirstConnectionId', NOW);
      room.connect('TestHostId', 'TestSecondConnectionId', NOW);
      join(room, 'TestPabloId', 'Pablo');
      room.expel('TestHostId', 'TestPabloId');
      room.startGame('TestHostId', 'TestGameId');

      // Act
      const restored = Room.restore(room.toSnapshot());

      // Assert
      expect(restored.toSnapshot()).toEqual(room.toSnapshot());
      expect(restored.pullEvents()).toEqual([]);
    });

    it('should keep the order in which players joined when the host joined later', () => {
      // Arrange
      const snapshot: RoomSnapshot = {
        ...lobbyOfThree().toSnapshot(),
        hostId: 'TestLuisId',
      };

      // Act
      const restored = Room.restore(snapshot);

      // Assert
      expect(restored.host.id).toBe('TestLuisId');
      expect(restored.players.map(({ id }) => id)).toEqual([
        'TestHostId',
        'TestLuisId',
        'TestMartaId',
      ]);
    });

    it('should throw an error if the host is not among the players', () => {
      // Arrange
      const snapshot: RoomSnapshot = { ...lobbyOfThree().toSnapshot(), hostId: 'TestUnknownId' };

      // Act & Assert
      expect(() => Room.restore(snapshot)).toThrow(HostMissingError);
    });
  });
});
