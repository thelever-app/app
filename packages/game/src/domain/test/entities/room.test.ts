import { describe, expect, it } from 'vitest';
import { MAXIMUM_PLAYERS, Room, type RoomSnapshot } from '../../entities/room.ts';
import { AddingDilemmasNotAllowedError } from '../../errors/adding-dilemmas-not-allowed.error.ts';
import { AvatarTakenError } from '../../errors/avatar-taken.error.ts';
import { DilemmaNotSuitableError } from '../../errors/dilemma-not-suitable.error.ts';
import { DuplicateDilemmaError } from '../../errors/duplicate-dilemma.error.ts';
import { GameInProgressError } from '../../errors/game-in-progress.error.ts';
import { HostCannotBeExpelledError } from '../../errors/host-cannot-be-expelled.error.ts';
import { HostMissingError } from '../../errors/host-missing.error.ts';
import { IdMissingError } from '../../errors/id-missing.error.ts';
import { InvalidRoomCodeError } from '../../errors/invalid-room-code.error.ts';
import { InvalidRoomSettingError } from '../../errors/invalid-room-setting.error.ts';
import { NicknameMissingError } from '../../errors/nickname-missing.error.ts';
import { NotEnoughPlayersError } from '../../errors/not-enough-players.error.ts';
import { NotHostError } from '../../errors/not-host.error.ts';
import { PlayerExpelledError } from '../../errors/player-expelled.error.ts';
import { PlayerNotInRoomError } from '../../errors/player-not-in-room.error.ts';
import { RoomFullError } from '../../errors/room-full.error.ts';
import { TooManyAddedDilemmasError } from '../../errors/too-many-added-dilemmas.error.ts';
import { ConnectionChangedEvent } from '../../events/connection-changed.event.ts';
import { LobbyChangedEvent } from '../../events/lobby-changed.event.ts';
import { AvatarVO } from '../../vos/avatar.vo.ts';
import { FixedIdGenerator } from '../support/fixed-id-generator.ts';
import { FixedRandomness } from '../support/fixed-randomness.ts';

function roomHostedByAna(): Room {
  return Room.create(
    {
      hostNickname: 'Ana',
      hostIdentity: 'TestAnaIdentity',
      groupNature: 'friends',
      place: 'together',
      dilemmaLanguage: 'es',
      code: 'K7M2Q',
    },
    new FixedIdGenerator('TestId', 'TestHostId'),
    new FixedRandomness(),
  );
}

/** Each test player has its own identity, derived from its id: TestLuisId is TestLuisIdentity. */
function join(room: Room, id: string, nickname: string, ...randomNumbers: number[]): void {
  room.join(
    { nickname, identity: id.replace(/Id$/, 'Identity') },
    new FixedIdGenerator(id),
    new FixedRandomness(...randomNumbers),
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

const FOR_EVERYONE = { dilemmaId: 'TestDilemma', minimumAge: 16 } as const;
const FOR_ADULTS = { dilemmaId: 'TestAdultDilemma', minimumAge: 18 } as const;

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

    it('should give the host the avatar the randomness picks', () => {
      // Act
      const room = Room.create(
        {
          hostNickname: 'Ana',
          hostIdentity: 'TestAnaIdentity',
          groupNature: 'friends',
          place: 'together',
          dilemmaLanguage: 'es',
          code: 'K7M2Q',
        },
        new FixedIdGenerator('TestId', 'TestHostId'),
        new FixedRandomness(9),
      );

      // Assert
      expect(room.host.avatar).toEqual(AvatarVO.all()[9]);
    });

    it('should keep the nature of the group and where it plays', () => {
      // Act
      const room = roomHostedByAna();

      // Assert
      expect(room.groupNature).toBe('friends');
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
      [{ groupNature: 'neighbours' }, InvalidRoomSettingError],
      [{ place: 'moon' }, InvalidRoomSettingError],
      [{ code: 'K7M20' }, InvalidRoomCodeError],
      [{ hostNickname: '' }, NicknameMissingError],
    ])('should throw an error for %o', (change, error) => {
      // Act & Assert
      expect(() =>
        Room.create(
          {
            hostNickname: 'Ana',
            hostIdentity: 'TestAnaIdentity',
            groupNature: 'friends',
            place: 'together',
            dilemmaLanguage: 'es',
            code: 'K7M2Q',
            ...change,
          },
          new FixedIdGenerator('TestId', 'TestHostId'),
          new FixedRandomness(),
        ),
      ).toThrow(error);
    });

    it('should throw an error if the id is missing', () => {
      // Act & Assert
      expect(() =>
        Room.create(
          {
            hostNickname: 'Ana',
            hostIdentity: 'TestAnaIdentity',
            groupNature: 'friends',
            place: 'together',
            dilemmaLanguage: 'es',
            code: 'K7M2Q',
          },
          new FixedIdGenerator('', 'TestHostId'),
          new FixedRandomness(),
        ),
      ).toThrow(IdMissingError);
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

    it('should give the player a random avatar among those nobody in the room has', () => {
      // Arrange: the host wears the first avatar, so the first free one is the second.
      const room = roomHostedByAna();

      // Act
      join(room, 'TestLuisId', 'Luis', 0);

      // Assert
      const luis = room.playerWith('TestLuisIdentity');
      expect(luis?.avatar).toEqual(AvatarVO.all()[1]);
      expect(luis?.avatar.equals(room.host.avatar)).toBe(false);
    });

    it('should give back the player of an identity already in the room, without changing anything', () => {
      // Arrange
      const room = lobbyOfThree();

      // Act
      const player = room.join(
        { nickname: 'Luis again', identity: 'TestLuisIdentity' },
        new FixedIdGenerator('TestOtherId'),
        new FixedRandomness(),
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

    it('should throw an error if the player was expelled from the game the lobby is getting ready', () => {
      // Arrange
      const room = lobbyOfThree();
      room.expel('TestHostId', 'TestMartaId');

      // Act & Assert
      expect(() => join(room, 'TestMartaId', 'Marta')).toThrow(PlayerExpelledError);
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

    it('should throw an error if another player of the room has that avatar', () => {
      // Arrange
      const room = lobbyOfThree();

      // Act & Assert
      expect(() => room.changeAvatar('TestLuisId', room.host.avatar)).toThrow(AvatarTakenError);
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
      room.changeSettings('TestHostId', { variant: 'anonymous', dilemmaCount: 12 });

      // Assert
      expect(room.settings.variant).toBe('anonymous');
      expect(room.settings.dilemmaCount).toBe(12);
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

    it('should drop the dilemmas for adults when the room stops being for adults only', () => {
      // Arrange
      const room = lobbyOfThree();
      room.changeSettings('TestHostId', { adultsOnly: true, dilemmasPerPlayer: 1 });
      room.addDilemma('TestLuisId', FOR_ADULTS);
      room.pickDilemmas('TestHostId', [FOR_EVERYONE, { ...FOR_ADULTS, dilemmaId: 'TestOther' }]);

      // Act
      room.changeSettings('TestHostId', { adultsOnly: false });

      // Assert
      expect(room.addedDilemmas).toEqual([]);
      expect(room.pickedDilemmas).toEqual([FOR_EVERYONE]);
    });

    it('should keep only the first dilemmas each player added when the host allows fewer', () => {
      // Arrange
      const room = lobbyOfThree();
      room.changeSettings('TestHostId', { dilemmasPerPlayer: 3 });
      room.addDilemma('TestLuisId', FOR_EVERYONE);
      room.addDilemma('TestLuisId', { dilemmaId: 'TestSecond', minimumAge: 16 });
      room.addDilemma('TestMartaId', { dilemmaId: 'TestThird', minimumAge: 16 });

      // Act
      room.changeSettings('TestHostId', { dilemmasPerPlayer: 1 });
      const afterOne = room.addedDilemmas.map(({ dilemmaId }) => dilemmaId);
      room.changeSettings('TestHostId', { dilemmasPerPlayer: 0 });

      // Assert
      expect(afterOne).toEqual(['TestDilemma', 'TestThird']);
      expect(room.addedDilemmas).toEqual([]);
    });
  });

  describe('pickDilemmas', () => {
    it('should keep the dilemmas the host picks, in order', () => {
      // Arrange
      const room = lobbyOfThree();

      // Act
      room.pickDilemmas('TestHostId', [FOR_EVERYONE, { dilemmaId: 'TestSecond', minimumAge: 16 }]);

      // Assert
      expect(room.pickedDilemmas.map(({ dilemmaId }) => dilemmaId)).toEqual([
        'TestDilemma',
        'TestSecond',
      ]);
      expect(room.pullEvents()).toEqual([new LobbyChangedEvent('TestId', 'dilemmas-changed', 3)]);
    });

    it('should throw an error for a dilemma for adults in a room that is not for adults only', () => {
      // Arrange
      const room = lobbyOfThree();

      // Act & Assert
      expect(() => room.pickDilemmas('TestHostId', [FOR_ADULTS])).toThrow(DilemmaNotSuitableError);
    });

    it('should throw an error for a dilemma picked twice', () => {
      // Arrange
      const room = lobbyOfThree();

      // Act & Assert
      expect(() => room.pickDilemmas('TestHostId', [FOR_EVERYONE, FOR_EVERYONE])).toThrow(
        DuplicateDilemmaError,
      );
    });

    it('should throw an error if the player is not the host', () => {
      // Arrange
      const room = lobbyOfThree();

      // Act & Assert
      expect(() => room.pickDilemmas('TestLuisId', [FOR_EVERYONE])).toThrow(NotHostError);
    });
  });

  describe('addDilemma', () => {
    function lobbyWhereAddingIsAllowed(dilemmasPerPlayer: 1 | 2 = 1): Room {
      const room = lobbyOfThree();
      room.changeSettings('TestHostId', { dilemmasPerPlayer });
      room.pullEvents();
      return room;
    }

    it('should add the dilemma with who added it and record that the lobby changed', () => {
      // Arrange
      const room = lobbyWhereAddingIsAllowed();

      // Act
      room.addDilemma('TestLuisId', FOR_EVERYONE);

      // Assert
      expect(room.addedDilemmas).toEqual([{ ...FOR_EVERYONE, playerId: 'TestLuisId' }]);
      expect(room.pullEvents()).toEqual([new LobbyChangedEvent('TestId', 'dilemmas-changed', 4)]);
    });

    it('should throw an error if the host does not allow adding dilemmas', () => {
      // Arrange
      const room = lobbyOfThree();

      // Act & Assert
      expect(() => room.addDilemma('TestLuisId', FOR_EVERYONE)).toThrow(
        AddingDilemmasNotAllowedError,
      );
    });

    it('should let each player add as many dilemmas as the host allows, and no more', () => {
      // Arrange
      const room = lobbyWhereAddingIsAllowed(2);
      room.addDilemma('TestLuisId', FOR_EVERYONE);
      room.addDilemma('TestLuisId', { dilemmaId: 'TestSecond', minimumAge: 16 });

      // Act & Assert
      expect(() =>
        room.addDilemma('TestLuisId', { dilemmaId: 'TestThird', minimumAge: 16 }),
      ).toThrow(TooManyAddedDilemmasError);
      expect(room.addedDilemmas.map(({ dilemmaId }) => dilemmaId)).toEqual([
        'TestDilemma',
        'TestSecond',
      ]);
    });

    it('should let the host add dilemmas too', () => {
      // Arrange
      const room = lobbyWhereAddingIsAllowed();

      // Act
      room.addDilemma('TestHostId', FOR_EVERYONE);

      // Assert
      expect(room.addedDilemmas).toEqual([{ ...FOR_EVERYONE, playerId: 'TestHostId' }]);
    });

    it('should throw an error if another player has already added that dilemma', () => {
      // Arrange
      const room = lobbyWhereAddingIsAllowed();
      room.addDilemma('TestLuisId', FOR_EVERYONE);

      // Act & Assert
      expect(() => room.addDilemma('TestMartaId', FOR_EVERYONE)).toThrow(DuplicateDilemmaError);
    });

    it('should throw an error for a dilemma that does not suit the room', () => {
      // Arrange
      const room = lobbyWhereAddingIsAllowed();

      // Act & Assert
      expect(() => room.addDilemma('TestLuisId', FOR_ADULTS)).toThrow(DilemmaNotSuitableError);
    });

    it('should throw an error once the game has started', () => {
      // Arrange
      const room = lobbyWhereAddingIsAllowed();
      room.startGame('TestHostId', 'TestGameId');

      // Act & Assert
      expect(() => room.addDilemma('TestLuisId', FOR_EVERYONE)).toThrow(GameInProgressError);
    });
  });

  describe('removeAddedDilemma', () => {
    /** Luis added a dilemma, and nothing that happened so far is pending. */
    function lobbyWhereLuisAdded(): Room {
      const room = lobbyOfThree();
      room.changeSettings('TestHostId', { dilemmasPerPlayer: 1 });
      room.addDilemma('TestLuisId', FOR_EVERYONE);
      room.pullEvents();
      return room;
    }

    it('should let the host remove a dilemma a player added', () => {
      // Arrange
      const room = lobbyWhereLuisAdded();

      // Act
      room.removeAddedDilemma('TestHostId', 'TestDilemma');

      // Assert
      expect(room.addedDilemmas).toEqual([]);
      expect(room.pullEvents()).toEqual([new LobbyChangedEvent('TestId', 'dilemmas-changed', 5)]);
    });

    it('should let a player remove a dilemma they added, and add another one', () => {
      // Arrange
      const room = lobbyWhereLuisAdded();

      // Act
      room.removeAddedDilemma('TestLuisId', 'TestDilemma');
      room.addDilemma('TestLuisId', { dilemmaId: 'TestSecond', minimumAge: 16 });

      // Assert
      expect(room.addedDilemmas).toEqual([
        { dilemmaId: 'TestSecond', minimumAge: 16, playerId: 'TestLuisId' },
      ]);
    });

    it('should throw an error if a player who is not the host removes what another one added', () => {
      // Arrange
      const room = lobbyWhereLuisAdded();

      // Act & Assert
      expect(() => room.removeAddedDilemma('TestMartaId', 'TestDilemma')).toThrow(NotHostError);
      expect(room.addedDilemmas).toHaveLength(1);
    });

    it('should throw an error once the game has started', () => {
      // Arrange
      const room = lobbyWhereLuisAdded();
      room.startGame('TestHostId', 'TestGameId');

      // Act & Assert
      expect(() => room.removeAddedDilemma('TestLuisId', 'TestDilemma')).toThrow(
        GameInProgressError,
      );
    });
  });

  describe('expel', () => {
    it('should take the player, their connections and their dilemma out of the room', () => {
      // Arrange
      const room = lobbyOfThree();
      room.changeSettings('TestHostId', { dilemmasPerPlayer: 1 });
      room.addDilemma('TestMartaId', FOR_EVERYONE);
      room.connect('TestMartaId', 'TestConnectionId');
      room.pullEvents();

      // Act
      room.expel('TestHostId', 'TestMartaId');

      // Assert
      expect(room.playerWith('TestMartaIdentity')).toBeUndefined();
      expect(room.addedDilemmas).toEqual([]);
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
      room.connect('TestHostId', 'TestConnectionId');

      // Assert
      expect(room.isConnected('TestHostId')).toBe(true);
      expect(room.version).toBe(1);
    });

    it('should record a connection changed event with the new version', () => {
      // Arrange
      const room = roomHostedByAna();

      // Act
      room.connect('TestHostId', 'TestConnectionId');

      // Assert
      expect(room.pullEvents()).toEqual([
        new ConnectionChangedEvent('TestId', 'TestHostId', true, 1),
      ]);
    });

    it('should keep a player who is already connected connected through another connection, without any event', () => {
      // Arrange
      const room = roomHostedByAna();
      room.connect('TestHostId', 'TestFirstConnectionId');
      room.pullEvents();

      // Act
      room.connect('TestHostId', 'TestSecondConnectionId');

      // Assert
      expect(room.isConnected('TestHostId')).toBe(true);
      expect(room.version).toBe(1);
      expect(room.pullEvents()).toEqual([]);
    });

    it('should throw an error if the player is not in the room', () => {
      // Arrange
      const room = roomHostedByAna();

      // Act & Assert
      expect(() => room.connect('TestUnknownId', 'TestConnectionId')).toThrow(PlayerNotInRoomError);
    });

    it('should throw an error if the connection id is missing', () => {
      // Arrange
      const room = roomHostedByAna();

      // Act & Assert
      expect(() => room.connect('TestHostId', '')).toThrow(IdMissingError);
    });
  });

  describe('disconnect', () => {
    it('should disconnect the player and raise the version', () => {
      // Arrange
      const room = roomHostedByAna();
      room.connect('TestHostId', 'TestConnectionId');

      // Act
      room.disconnect('TestHostId', 'TestConnectionId');

      // Assert
      expect(room.isConnected('TestHostId')).toBe(false);
      expect(room.version).toBe(2);
    });

    it('should record a connection changed event with the new version', () => {
      // Arrange
      const room = roomHostedByAna();
      room.connect('TestHostId', 'TestConnectionId');
      room.pullEvents();

      // Act
      room.disconnect('TestHostId', 'TestConnectionId');

      // Assert
      expect(room.pullEvents()).toEqual([
        new ConnectionChangedEvent('TestId', 'TestHostId', false, 2),
      ]);
    });

    it('should ignore the late close of a connection the player already reopened', () => {
      // Arrange
      const room = roomHostedByAna();
      room.connect('TestHostId', 'TestOldConnectionId');
      room.connect('TestHostId', 'TestNewConnectionId');
      room.pullEvents();

      // Act
      room.disconnect('TestHostId', 'TestOldConnectionId');

      // Assert
      expect(room.isConnected('TestHostId')).toBe(true);
      expect(room.version).toBe(1);
      expect(room.pullEvents()).toEqual([]);
    });

    it('should disconnect the player when their last open connection closes', () => {
      // Arrange
      const room = roomHostedByAna();
      room.connect('TestHostId', 'TestFirstConnectionId');
      room.connect('TestHostId', 'TestSecondConnectionId');
      room.disconnect('TestHostId', 'TestSecondConnectionId');
      room.pullEvents();

      // Act
      room.disconnect('TestHostId', 'TestFirstConnectionId');

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
      room.connect('TestHostId', 'TestConnectionId');
      room.pullEvents();

      // Act
      room.disconnect('TestHostId', 'TestUnknownConnectionId');

      // Assert
      expect(room.isConnected('TestHostId')).toBe(true);
      expect(room.version).toBe(1);
      expect(room.pullEvents()).toEqual([]);
    });

    it('should ignore a player who is not connected', () => {
      // Arrange
      const room = roomHostedByAna();

      // Act
      room.disconnect('TestHostId', 'TestConnectionId');

      // Assert
      expect(room.version).toBe(0);
      expect(room.pullEvents()).toEqual([]);
    });

    it('should connect again after a disconnection', () => {
      // Arrange
      const room = roomHostedByAna();
      room.connect('TestHostId', 'TestConnectionId');
      room.disconnect('TestHostId', 'TestConnectionId');

      // Act
      room.connect('TestHostId', 'TestOtherConnectionId');

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
      room.connect('TestLuisId', 'TestConnectionId');

      // Act
      const snapshot = room.toSnapshot();

      // Assert
      expect(snapshot).toEqual({
        id: 'TestId',
        code: 'K7M2Q',
        hostId: 'TestHostId',
        groupNature: 'friends',
        place: 'together',
        settings: room.settings.toSnapshot(),
        players: room.players.map((player) => player.toSnapshot()),
        version: 3,
        connections: [{ playerId: 'TestLuisId', connectionId: 'TestConnectionId' }],
        expelledIdentities: [],
        addedDilemmas: [],
        pickedDilemmas: [],
        currentGameId: null,
      });
    });

    it('should rebuild the whole room from its snapshot, without recording any event', () => {
      // Arrange
      const room = lobbyOfThree();
      room.changeSettings('TestHostId', { dilemmasPerPlayer: 1, adultsOnly: true });
      room.addDilemma('TestLuisId', FOR_ADULTS);
      room.pickDilemmas('TestHostId', [FOR_EVERYONE]);
      room.connect('TestHostId', 'TestFirstConnectionId');
      room.connect('TestHostId', 'TestSecondConnectionId');
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
