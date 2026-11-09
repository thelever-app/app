Feature: Create a room
  As a player
  I want to create a room and invite my group
  So that we can play together

  @ui
  Scenario: The player creates a room and becomes the host
    Given a player on the home screen
    When the player creates a room
    Then the player becomes the host of that room
    And the host plays with the random avatar shown before creating the room
    And the host is asked for a nickname and the nature of the group on the same screen

  @ui
  Scenario: The host changes the avatar before creating the room
    Given a player creating a room
    When the player chooses another avatar
    And creates the room
    Then the host enters the lobby with that avatar

  @ui
  Scenario: The host declares the nature of the group with a single choice
    Given a host who has just created a room
    When the host chooses "friends" as the nature of the group
    Then the room gets an invitation link, a code and a QR

  @ui
  Scenario: The host says whether the group plays together or remotely
    Given a host who has just created a room
    When the host chooses "remotely"
    Then the game is recorded as played remotely
    And everyone in the lobby is advised to play on a video call

  @ui
  Scenario: The host lets players add dilemmas and removes one
    Given "Ana" has allowed players to add dilemmas
    And a player has added a dilemma
    When "Ana" looks at the added dilemmas in the lobby
    Then she does not see who added it
    And she can remove it

  @ui
  Scenario: Rooms are nominal by default
    When a player creates a room without changing the reveal setting
    Then the room is nominal

  @ui
  Scenario: The host creates an anonymous room
    Given a host who has just created a room
    When the host chooses the anonymous reveal
    Then the room is anonymous

  @ui
  Scenario: The room starts with a default configuration
    Given a host whose device is in English
    When the host creates a room
    Then the dilemmas of the room are in English
    And the room has default categories, number of dilemmas and time per dilemma

  @ui
  Scenario: The host changes the configuration before starting
    Given a host in the lobby
    When the host changes the dilemma language, the categories, the number of dilemmas or the time per dilemma
    Then the game uses the new configuration

  @ui
  Scenario: The host shares the room from the lobby
    Given a host in the lobby
    Then the host sees the 5-character code of the room
    And the host can share the invitation link
    And the host can show the QR full screen

  @ui
  Scenario: The other players see the configuration without changing it
    Given a lobby with the host "Ana" and the player "Luis"
    When "Ana" changes the configuration
    Then "Luis" sees the summary of the new configuration and the type of room
    And "Luis" has no option to change the configuration

  @ui
  Scenario: The lobby shows who is in the room in real time
    Given a host in the lobby
    When another player joins the room
    Then everyone in the lobby sees the new player immediately

  @ui
  Scenario Outline: Minimum number of players to start
    Given <room> with <players> in the lobby
    When the host tries to start the game
    Then the game <outcome>

    Examples:
      | room              | players   | outcome        |
      | a nominal room    | 1 player  | does not start |
      | a nominal room    | 2 players | starts         |
      | an anonymous room | 2 players | does not start |
      | an anonymous room | 3 players | starts         |

  @ui
  Scenario: The host expels a player from the lobby
    Given a lobby with players "Ana", "Luis" and "Marta"
    When the host expels "Marta"
    Then "Marta" leaves the room
    And "Marta" cannot join that game again

  @ui
  Scenario: Players cannot be expelled once the game has started
    Given a game that has already started
    Then the host has no option to expel players

  @ui
  Scenario: A room not marked as adults only uses dilemmas suitable from 16
    Given a host who creates a room without marking it as adults only
    When the host starts the game
    Then every dilemma of the game is suitable from age 16

  @ui
  Scenario: A room marked as adults only can use adult dilemmas
    Given a host who marks the room as adults only
    When the host starts the game
    Then the game can include dilemmas for adults

  @ui @todo
  Scenario Outline: The host chooses where the dilemmas come from
    Given a host with an account and private dilemmas
    When the host chooses "<source>" as the source of dilemmas
    Then the game uses <dilemmas>

    Examples:
      | source          | dilemmas                              |
      | catalog         | only dilemmas from the catalog        |
      | my private ones | only the private dilemmas of the host |
      | mix             | private dilemmas and catalog dilemmas |

  @ui
  Scenario: The host picks specific dilemmas by searching
    When the host searches "family" and picks 6 dilemmas
    Then the game uses exactly those 6 dilemmas
    And no new dilemmas are added for the exploration

  @ui
  Scenario: The search only shows suitable dilemmas
    Given a room not marked as adults only
    When the host searches for dilemmas
    Then only dilemmas suitable from 16 are shown

  @ui
  Scenario: The search finds a dilemma by part of its text
    When the host searches part of the text of a dilemma
    Then that dilemma is shown

  @ui
  Scenario: The host plays several categories
    When the host chooses the categories "life-and-death" and "honesty"
    Then every dilemma of the game is of one of those categories

  @ui
  Scenario: The host goes back to a game by categories
    Given the host has picked specific dilemmas
    When the host chooses to play by categories
    Then no dilemma is picked for the game

  Scenario: The host turns off new dilemmas
    Given the option to include new dilemmas is on by default
    When the host turns it off
    Then the game does not include dilemmas in exploration
