Feature: Sound and motion
  As a player
  I want the game to sound, move and vibrate at its key moments
  So that playing as a group feels alive

  @ui @screen
  Scenario: A sound effect plays when a player joins the lobby
    Given "Ana" is in the lobby
    When "Luis" joins the room
    Then "Ana" hears the sound effect of a player joining

  @ui @screen
  Scenario: A sound effect plays when the game starts
    Given a lobby with "Ana" and "Luis"
    When the host starts the game
    Then "Ana" and "Luis" hear the sound effect of the game starting

  @ui @screen
  Scenario: A sound effect plays and the device vibrates when the player answers the dilemma
    Given "Ana" is in the decision phase of a round
    When "Ana" answers the dilemma
    Then "Ana" hears the sound effect of an answer
    And the device of "Ana" vibrates

  @ui @screen
  Scenario: A sound effect plays and the device vibrates when the dilemma is revealed
    Given "Ana" and "Luis" are in the decision phase of a round
    When the dilemma is revealed
    Then "Ana" and "Luis" hear the sound effect of the reveal
    And their devices vibrate

  @ui @screen
  Scenario: A tick sounds every second of the last seconds to whoever has not answered
    Given "Ana" has not answered the dilemma of the round
    And "Luis" has answered it
    When the last seconds of the time per dilemma begin
    Then "Ana" hears a tick every second
    And "Luis" does not hear them

  @ui @screen
  Scenario: The game sounds unless the player has muted it
    Given a device where the player has never muted the game
    When the player joins a room
    Then the game is not muted

  @ui @screen
  Scenario: A player who mutes the game hears no sound effect and feels no vibration
    Given "Ana" has muted the game
    When the dilemma of the round is revealed
    Then "Ana" hears no sound effect
    And the device of "Ana" does not vibrate

  @ui @screen
  Scenario: The game stays muted when the player comes back
    Given "Ana" has muted the game
    When "Ana" opens the app again
    Then the game is still muted for "Ana"

  @ui @screen
  Scenario: With reduced motion nothing moves or changes size
    Given a device with reduced motion
    When the player goes through the lobby and a round
    Then no component moves or changes size
