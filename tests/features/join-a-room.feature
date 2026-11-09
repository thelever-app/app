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
  Scenario: The code goes through as soon as it is complete
    Given a player on the join screen
    When the player types the 5 characters of the code of an existing room
    Then the player sees that room without pressing any button

  @ui @todo
  Scenario: A player adds a dilemma created on the spot
    Given the host has allowed players to add dilemmas
    And "Luis" has an account
    When "Luis" creates a new dilemma from the lobby
    And it passes the automatic filter
    Then the dilemma is added to the game
    And it is saved as a private dilemma of "Luis"

  @ui @todo
  Scenario: A dilemma that fails the filter is not added
    Given the host has allowed players to add dilemmas
    And "Luis" has an account
    When "Luis" creates a new dilemma from the lobby that fails the automatic filter
    Then the dilemma is not added
    And "Luis" sees the reason, the facts it is based on, the rule applied, that the decision was automatic and how to appeal

  @ui @todo
  Scenario: The player is offered the gap when naming a real person
    Given the host has allowed players to add dilemmas
    And "Luis" has an account
    When "Luis" writes a new dilemma in the lobby that mentions a person by name
    Then "Luis" is offered to use the gap "someone in the group" instead

  @ui
  Scenario: Only catalog dilemmas suitable for the room are offered
    Given the host has allowed players to add dilemmas
    And a room not marked as adults only
    When "Luis" searches the catalog to add a dilemma
    Then only dilemmas suitable for players from 16 are offered

  @ui @todo
  Scenario: Only dilemmas suitable for the room can be added
    Given the host has allowed players to add dilemmas
    And a room not marked as adults only
    When "Luis" tries to add one of his private dilemmas for adults
    Then the dilemma is not added

  @ui
  Scenario: A player adds as many dilemmas as the host allows
    Given the host allows each player to add 2 dilemmas
    And "Luis" has already added 2 dilemmas
    When "Luis" tries to add another one
    Then the third dilemma is not added

  @ui
  Scenario: A player removes a dilemma they added
    Given "Luis" has added a dilemma
    When "Luis" removes it
    Then nobody in the lobby sees it

  @ui
  Scenario: The host adds a dilemma too
    Given the host has allowed players to add dilemmas
    When the host adds a dilemma
    Then everyone in the lobby sees it among the added dilemmas

  @ui
  Scenario: Nobody knows who added a dilemma before the reveal
    Given "Luis" has added a dilemma
    Then no player in the lobby sees who added it

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

  @ui
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

  @ui @todo
  Scenario: An expelled player can join the rematch
    Given a player who was expelled from a game
    When the host starts the rematch
    And the player joins the room
    Then the player enters the lobby of the rematch

  @ui @todo
  Scenario: Joining a game that has already started
    Given a game on the decision phase of its third round
    When a player joins the room
    Then the player can answer the third dilemma
    And the player is recorded as "did not vote" for the first two dilemmas

  @ui @todo
  Scenario: Joining a game during the reveal of a round
    Given a game on the reveal of its second round
    When a player joins the room
    Then the player sees the reveal of the second dilemma

  @todo
  Scenario: A player who joins a nominal game late only votes
    Given a nominal game that has already started
    When a player joins the room
    Then the player makes no predictions and nobody predicts their vote
    And the player is never the person in the gap
    And the player has no points in the game results
