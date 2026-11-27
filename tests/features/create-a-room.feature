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
    And the host is asked for a nickname
    And the host is not asked for the nature of the group
    And the host is not asked whether the group plays together or remotely

  @ui @screen
  Scenario: The home screen says who should create the room
    Given a player on the home screen
    Then "Create room" says that only one person of the group creates it and invites the others
    And "Join with a code" says it is for when someone has already created the room

  @ui
  Scenario: A host alone in the lobby can join another room
    Given "Ana" and "Luis" have each created a room
    And "Luis" is alone in the lobby of his room
    When "Luis" enters the code of the room of "Ana" from his lobby
    Then "Luis" goes to the join screen of the room of "Ana"
    And the room of "Luis" is closed when he joins the room of "Ana"

  @ui @screen
  Scenario: The offer to join another room disappears when someone joins
    Given a host alone in the lobby who sees the offer to join another room
    When another player joins the room
    Then the host no longer sees the offer

  @ui
  Scenario: The host changes the avatar before creating the room
    Given a player creating a room
    When the player chooses another avatar
    And creates the room
    Then the host enters the lobby with that avatar

  @ui
  Scenario: The host leaves a round to the players
    Given a host in the lobby
    When the host sets round 3 as chosen by the players
    Then every player in the lobby can choose the dilemma of round 3

  @ui
  Scenario: The player chooses an ambience to create a room
    Given a player creating a room
    Then the player sees the ambiences "Classic", "Spicy" and "No filter", each with a description and an example dilemma
    And no ambience is selected
    And the player cannot create the room without choosing one

  @ui
  Scenario Outline: Each ambience shows the minimum number of players
    Given a player creating a room
    Then the ambience "<ambience>" shows the badge "<badge>"

    Examples:
      | ambience  | badge      |
      | Classic   | 2+ players |
      | Spicy     | 2+ players |
      | No filter | 3+ players |

  @ui
  Scenario: No filter is marked as anonymous
    Given a player creating a room
    Then "No filter" shows the badge "Anonymous"
    And "Classic" and "Spicy" do not

  @ui @screen
  Scenario: Each ambience says what it adds to the previous one
    Given a player creating a room
    Then "Spicy" says it has what "Classic" has, plus adult topics
    And "No filter" says it has what "Spicy" has, plus compromising questions, and that it is anonymous

  @ui
  Scenario Outline: The settings show the minimum number of players of each variant
    Given a host in the settings of the room
    Then the variant "<variant>" shows "<badge>"

    Examples:
      | variant   | badge      |
      | nominal   | 2+ players |
      | anonymous | 3+ players |

  @ui
  Scenario: The ambience card of the settings follows the variant
    Given a host who created a room with the ambience "Spicy"
    When the host makes the room anonymous in the settings
    Then the ambience card of the settings shows "Custom", "3+ players" and "Anonymous"

  Scenario Outline: Each ambience sets up the room
    When a player creates a room with the ambience "<ambience>"
    Then the room is <variant> and <age>, with compromising dilemmas <compromising>
    And it has 8 random rounds from every category with the contents <contents>

    Examples:
      | ambience  | variant   | age         | compromising | contents                                                                                                                   |
      | Classic   | nominal   | from 16     | off          | any, any, any, any, any, any, any, any                                                                                     |
      | Spicy     | nominal   | adults only | off          | any, adults only, any, adults only, any, adults only, any, adults only                                                     |
      | No filter | anonymous | adults only | on           | any, compromising, adults only, adults only and compromising, any, compromising, adults only, adults only and compromising |

  @ui
  Scenario: Spicy and No filter are off for a player under 18
    Given a player who declared a birth year that makes them 17
    When the player creates a room
    Then "Spicy" and "No filter" are turned off with the reason "Only for people 18 or over"

  @ui
  Scenario Outline: The lobby shows the minimum number of players
    Given a lobby of a <room> room
    Then everyone in the lobby sees the badge "<badge>" next to the ambience

    Examples:
      | room      | badge      |
      | nominal   | 2+ players |
      | anonymous | 3+ players |

  @ui
  Scenario: The lobby shows the ambience while its configuration is unchanged
    Given a host who created a room with the ambience "Spicy"
    When the host changes the time per dilemma
    Then everyone in the lobby sees that the room is "Spicy"

  @ui
  Scenario: Everything an ambience sets can be changed in the settings
    Given a host who created a room with the ambience "No filter"
    When the host sets round 2 to any content
    Then round 2 is random with any content
    And the room keeps every other setting of "No filter"
    And everyone in the lobby sees that the room is "Custom"

  @ui
  Scenario: Nothing adults-only can be turned on with a minor in the room
    Given a room with the ambience "Classic"
    And "Luis" declared a birth year that makes him 17 and is in the lobby
    Then the host sees adults-only dilemmas, "Spicy" and "No filter" turned off with the reason "Someone in the room is under 18"
    When "Luis" leaves the room
    Then the host can turn on adults-only dilemmas

  @ui
  Scenario: A room from the web keeps its ambience
    Given a player who comes from the public page of "La palanca"
    When the player creates a room with the ambience "Spicy"
    Then round 1 is "La palanca" and rounds 2 to 8 follow "Spicy"
    And everyone in the lobby sees that the room is "Spicy"

  @ui
  Scenario: The dilemma picker marks adults-only and compromising dilemmas
    Given an anonymous adults-only room with compromising dilemmas turned on
    When the host searches for the dilemma of round 3
    Then the adults-only dilemmas are marked "+18"
    And the compromising dilemmas are marked "Compromising"

  @ui
  Scenario: The host chooses an ambience in the settings
    Given a host who created a room with the ambience "Classic"
    And has set the time per dilemma to 45 seconds
    And has chosen a specific dilemma for round 3
    When the host chooses the ambience "No filter" in the settings and saves
    Then the room has the configuration of "No filter"
    And round 3 is random
    And the time per dilemma is 45 seconds

  Scenario Outline: The game records the ambience
    Given a host who created a room with the ambience "Spicy"
    And <change>
    When the game starts
    Then the game context records the ambience "<recorded>"

    Examples:
      | change                                    | recorded |
      | the host changed nothing                  | Spicy    |
      | the host set round 2 to any content       | Custom   |

  @ui
  Scenario: The host creates an anonymous room
    Given a host who has just created a room
    When the host chooses the anonymous reveal
    Then the room is anonymous

  @ui
  Scenario: The room starts with a default configuration
    Given a host whose device is in English
    When the host creates a room with the ambience "Classic"
    Then the dilemmas of the room are in English
    And the room has 8 random rounds of every category and the default time per dilemma

  @ui
  Scenario: The host changes the configuration before starting
    Given a host in the lobby
    When the host changes the rounds or the time per dilemma
    Then the game uses the new configuration

  @ui
  Scenario: The settings offer no language for the dilemmas
    Given a host in the lobby
    Then the settings offer no language for the dilemmas

  @ui
  Scenario: Each player sees the rounds of the lobby in their language
    Given round 1 has a specific dilemma with an English translation
    And "Luis" joins the room
    When "Luis" uses the app in English
    Then "Luis" sees round 1 in English

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

  @ui
  Scenario: Compromising dilemmas are off by default
    Given a host who has just created a room with the ambience "Classic"
    And has made the room anonymous
    Then compromising dilemmas are turned off

  @ui
  Scenario: The host turns on compromising dilemmas in an anonymous room
    Given a host in the lobby of an anonymous room
    When the host turns on compromising dilemmas
    Then the game can include compromising dilemmas
    And everyone in the lobby sees that the room includes compromising dilemmas

  @ui
  Scenario: Compromising dilemmas cannot be turned on in a nominal room
    Given a host in the lobby of a nominal room
    Then the host sees compromising dilemmas turned off with the reason "only in anonymous rooms"
    And the host cannot turn them on

  Scenario: Making the room nominal turns off compromising dilemmas
    Given an anonymous room with compromising dilemmas turned on
    When the host makes the room nominal
    Then compromising dilemmas are turned off
    And they stay off if the host makes the room anonymous again

  Scenario: With compromising dilemmas off, no game includes them
    Given a room with compromising dilemmas turned off
    When a game of 10 random rounds is put together
    Then none of its dilemmas is compromising

  @ui
  Scenario: With compromising dilemmas off, the host cannot pick them
    Given a room with compromising dilemmas turned off
    When the host searches for the dilemma of a round
    Then no compromising dilemma is shown

  @ui
  Scenario: A random round can be only for adults-only dilemmas
    Given a host in the lobby of an adults-only room
    When the host sets round 2 to adults-only content
    Then round 2 plays an adults-only dilemma

  @ui
  Scenario Outline: Each part of the content of a round shows only where the room allows it
    Given a host who created a room with the ambience "<ambience>"
    Then the host <age> set the age of the dilemma of a random round
    And the host <compromising> set whether the dilemma of a random round is compromising

    Examples:
      | ambience  | age    | compromising |
      | Classic   | cannot | cannot       |
      | Spicy     | can    | cannot       |
      | No filter | can    | can          |

  @ui
  Scenario: A random round can be only for compromising dilemmas
    Given a host in the lobby of an anonymous room with compromising dilemmas turned on
    When the host sets round 2 to compromising content
    Then round 2 plays a compromising dilemma

  Scenario Outline: A change that rules out part of the content of a round takes it out
    Given an adults-only anonymous room with compromising dilemmas turned on
    And round 2 is random with <content> content
    When the host <change>
    Then round 2 is left with <left> content

    Examples:
      | content                      | change                          | left        |
      | adults-only                  | turns off adults only           | any         |
      | compromising                 | turns off compromising dilemmas | any         |
      | compromising                 | makes the room nominal          | any         |
      | adults-only and compromising | turns off compromising dilemmas | adults-only |

  @ui
  Scenario: A random round can draw only dilemmas both for adults and compromising
    Given a host in the lobby of an anonymous adults-only room with compromising dilemmas turned on
    When the host sets round 2 to adults-only and compromising content
    Then round 2 plays a dilemma that is both adults-only and compromising

  @ui
  Scenario: A random round can draw a mild dilemma in a No filter room
    Given a host who created a room with the ambience "No filter"
    When the host sets round 2 to from 16 and not compromising content
    Then round 2 plays a dilemma suitable from 16 that is not compromising

  @ui @screen
  Scenario: The rounds of the settings are folded into a summary line
    Given a host who opens the settings of a room created with the ambience "Spicy"
    Then every round is folded and shows its number, where its dilemma comes from and its content
    And round 2 says "+18"

  @ui @screen
  Scenario: Only one round is unfolded at a time
    Given a host in the settings with round 2 unfolded
    When the host unfolds round 5
    Then round 5 is unfolded
    And round 2 is folded

  @ui @screen
  Scenario: The host folds a round with "Done"
    Given a host in the settings with round 2 unfolded
    When the host presses "Done" in round 2
    Then every round is folded

  @ui @screen
  Scenario: A new round is unfolded
    Given a host in the settings of a room with 8 rounds
    When the host adds a round
    Then round 9 is unfolded

  @ui @screen
  Scenario: Choosing an ambience in the settings keeps them open with its configuration
    Given a host in the lobby of a room created with the ambience "Classic"
    When the host chooses the ambience "Spicy" in the settings
    Then the settings stay open with the configuration of "Spicy"

  @ui @screen
  Scenario: Changing a setting after choosing an ambience shows the settings as custom
    Given the host has chosen the ambience "Spicy" in the settings
    When the host turns on the anonymous reveal
    Then the settings show the room as "Custom" before saving

  @ui @screen
  Scenario: Choosing an ambience in the settings changes nothing until the host saves
    Given a host in the lobby of a room created with the ambience "Classic"
    When the host chooses the ambience "Spicy" in the settings
    And closes the settings without saving
    Then everyone in the lobby sees that the room is "Classic"
