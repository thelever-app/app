Feature: Join a room
  As a player
  I want to join a room someone else has created
  So that I can play with my group

  @ui
  Scenario Outline: The player joins with any invitation method
    Given a device that has completed the first access
    And an existing room in the lobby
    When the player uses the room's <method>
    And confirms a nickname
    Then the player enters the lobby
    And sees who is in the room

    Examples:
      | method          |
      | invitation link |
      | code            |
      | QR              |

  @ui
  Scenario: The player sees who is in the room before joining
    Given a room with "Ana" and "Marta"
    When a player opens its invitation link
    Then the player sees the avatars of "Ana" and "Marta" before entering

  @ui
  Scenario: The player sees the type of room before joining
    Given a nominal room created by "Ana"
    When a player opens its invitation link
    Then the player sees that the room belongs to "Ana" and is nominal before entering

  @ui
  Scenario: The player sees who is in an adults-only room before joining
    Given a room marked as adults only with 4 players
    When a player opens its invitation link
    Then the player sees that the room is for adults only and has 4 players before entering

  @ui
  Scenario: The code goes through only with the button
    Given a player on the join screen
    When the player types the 5 characters of the code of an existing room
    Then the player still sees the join screen
    And sees that room after pressing the button to enter

  @ui @todo
  Scenario: A player chooses a dilemma created on the spot
    Given round 3 is chosen by the players and is empty
    And "Luis" has an account
    When "Luis" creates a new dilemma for round 3 from the lobby
    And it passes the automatic filter
    Then it becomes the dilemma of round 3
    And it is saved as a private dilemma of "Luis"

  @ui @todo
  Scenario: A dilemma that fails the filter is not chosen
    Given round 3 is chosen by the players and is empty
    And "Luis" has an account
    When "Luis" creates a new dilemma for round 3 from the lobby that fails the automatic filter
    Then round 3 does not get it
    And "Luis" sees the reason, the facts it is based on, the rule applied, that the decision was automatic and how to appeal

  @ui @todo
  Scenario: The player is offered the gap when naming a real person
    Given round 3 is chosen by the players and is empty
    And "Luis" has an account
    When "Luis" writes a new dilemma for round 3 that mentions a person by name
    Then "Luis" is offered to use the gap "someone in the group" instead

  @ui
  Scenario: Only catalog dilemmas suitable for the room are offered
    Given round 3 is chosen by the players and is empty
    And a room not marked as adults only
    When "Luis" searches the catalog for the dilemma of round 3
    Then only dilemmas suitable for players from 16 are offered

  @ui @todo
  Scenario: Only dilemmas suitable for the room can be chosen
    Given round 3 is chosen by the players and is empty
    And a room not marked as adults only
    When "Luis" tries to choose one of his private dilemmas for adults for round 3
    Then round 3 does not get it

  @ui
  Scenario: A player chooses the dilemma of an empty players round
    Given round 3 is chosen by the players and is empty
    When "Luis" chooses "La cartera" for round 3
    Then everyone in the lobby sees "La cartera" in round 3
    And nobody else can choose the dilemma of round 3

  @ui
  Scenario: Only the player who chose it frees the round
    Given "Luis" has chosen the dilemma of round 3
    When "Luis" removes it
    Then round 3 is empty again
    And the host had no option to remove it

  @ui
  Scenario: The host chooses the dilemma of a players round too
    Given round 3 is chosen by the players and is empty
    When the host chooses a dilemma for round 3
    Then everyone in the lobby sees it in round 3

  @ui
  Scenario: Nobody knows who chose the dilemma of a players round before the reveal
    Given "Luis" has chosen the dilemma of round 3
    Then no player in the lobby sees who chose it

  Scenario: An empty players round is random when the game starts
    Given round 3 is chosen by the players and nobody has chosen its dilemma
    When the game starts
    Then round 3 plays a random dilemma from every category

  @ui @screen
  Scenario: The nickname is prefilled with the last one used
    Given a player who last played as "Ana"
    When the player opens an invitation link
    Then the nickname field shows "Ana"

  @ui
  Scenario: Each player gets a random avatar not used in the room
    Given a room where some avatars are already taken
    When a player opens its invitation link
    Then the player sees a random avatar that nobody in the room has
    And enters the room with it if they do not change it

  @ui
  Scenario: The player chooses another avatar before joining
    Given a player who has opened an invitation link
    When the player chooses another avatar
    And joins the room
    Then everyone in the lobby sees the player with that avatar

  @ui
  Scenario: The player changes the avatar in the lobby
    Given a player in the lobby
    When the player chooses another avatar
    Then everyone in the lobby sees the new avatar

  @ui
  Scenario: Two players can share an avatar
    Given a lobby with a player called "Ana"
    When "Luis" joins with the avatar of "Ana"
    Then both players are in the room with the same avatar

  @ui @screen
  Scenario: The player is told the nickname is already in the room
    Given a lobby with a player called "Ana"
    When another player opens its invitation link and types the nickname "ana"
    Then the player is told that someone called "Ana" is already in the room
    And can still join

  @ui
  Scenario Outline: Nobody has both the nickname and the avatar of another player
    Given a lobby with a player called "Ana"
    When a player called "<nickname>" tries to take the avatar of "Ana" <moment>
    Then the player does not get that avatar
    And is asked to choose another one

    Examples:
      | nickname | moment       |
      | Ana      | when joining |
      | ana      | when joining |
      | Aná      | in the lobby |

  @ui
  Scenario: Two players can share a nickname
    Given a lobby with a player called "Ana"
    When another player joins as "Ana"
    Then both players are in the room
    And each one is distinguished by their avatar

  @ui @todo
  Scenario: A player under 18 cannot join an adults-only room
    Given a room marked as adults only
    When a player who declared an age of 17 tries to join
    Then the player is told the room is for adults only
    And does not enter the room

  @ui
  Scenario: A full room cannot be joined
    Given a room with 50 players
    When another player tries to join
    Then the player is told the room is full
    And does not enter the room

  @ui
  Scenario: A code that does not match any room
    When a player enters a code that does not match any room
    Then the player is told the room does not exist

  @ui
  Scenario: An expelled player cannot rejoin the same game
    Given a player who was expelled from a room
    When the player tries to join that game again
    Then the player does not enter the room

  @ui
  Scenario: An expelled player can join the rematch
    Given a player who was expelled from a game
    When the host starts the rematch
    And the player joins the room
    Then the player enters the lobby of the rematch

  @ui
  Scenario: Joining a game that has already started
    Given a game on the decision phase of its third round
    When a player joins the room
    Then the player can answer the third dilemma
    And the player is recorded as "did not vote" for the first two dilemmas

  @ui
  Scenario: Joining a game during the reveal of a round
    Given a game on the reveal of its second round
    When a player joins the room
    Then the player sees the reveal of the second dilemma

  Scenario: A player who joins a nominal game late only votes
    Given a nominal game that has already started
    When a player joins the room
    Then the player makes no predictions and nobody predicts their vote
    And the player is never the person in the gap
    And the player has no points in the game results

  @ui
  Scenario: Inviting once the game has started
    Given a game on the decision phase of its second round
    Then any player can share the invitation link of the room
    And any player can show the QR and the code of the room
