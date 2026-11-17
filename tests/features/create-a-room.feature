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
  Scenario: The host leaves a round to the players
    Given a host in the lobby
    When the host sets round 3 as chosen by the players
    Then every player in the lobby can choose the dilemma of round 3

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
    And the room has 8 random rounds of every category and the default time per dilemma

  @ui
  Scenario: The host changes the configuration before starting
    Given a host in the lobby
    When the host changes the dilemma language, the rounds or the time per dilemma
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
    Then "Luis" sees the rounds, the summary of the new configuration and the type of room
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
  Scenario: The host chooses a specific dilemma for a round
    When the host searches "family" and chooses a dilemma for round 2
    Then round 2 of the game plays that dilemma

  @ui
  Scenario: The search only shows suitable dilemmas
    Given a room not marked as adults only
    When the host searches for the dilemma of a round
    Then only dilemmas suitable from 16 are shown

  @ui
  Scenario: The search finds a dilemma by part of its text
    When the host searches part of the text of a dilemma for a round
    Then that dilemma is shown

  @ui
  Scenario: The search shows the dilemmas twenty at a time
    Given more than 20 dilemmas of the catalog suit the room
    When the host searches for the dilemma of a round
    Then 20 dilemmas are shown
    And the host can ask for 20 more

  @ui
  Scenario: A random round plays one of its categories
    When the host sets round 1 as random from "life-and-death" and "honesty"
    Then the dilemma of round 1 is of one of those categories

  @ui
  Scenario: The host turns a specific round back into a random one
    Given round 2 has a specific dilemma
    When the host sets round 2 as random
    Then round 2 has no dilemma chosen

  Scenario: The host turns off new dilemmas
    Given the option to include new dilemmas is on by default
    When the host turns it off
    Then the game does not include dilemmas in exploration

  @ui
  Scenario: The rounds are played in their order
    Given round 1 has the specific dilemma "El tranvía" and round 2 is random
    When the game starts
    Then the first round plays "El tranvía"

  @ui
  Scenario Outline: A room has from 1 to 12 rounds
    Given a room with <rounds> rounds
    When the host tries to <change>
    Then the room still has <rounds> rounds

    Examples:
      | rounds | change         |
      | 12     | add a round    |
      | 1      | remove a round |

  @ui
  Scenario: A dilemma cannot be in two rounds
    Given round 1 has the dilemma "El tranvía"
    When the host tries to choose "El tranvía" for round 2
    Then round 2 does not get it

  Scenario: A change that leaves out a dilemma makes its round random
    Given an adults-only room whose round 2 has an adults-only dilemma
    When the host turns off adults only
    Then round 2 is random from every category
