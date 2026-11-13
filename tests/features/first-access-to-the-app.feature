Feature: First access to the app
  As a player
  I want to get into the app the first time with as few steps as possible
  So that I can start playing while meeting the age and terms requirements

  @ui @todo
  Scenario: The user accepts the terms, gives the game consent and reaches the home screen
    Given a device that has never used TheLever
    When the user opens the app
    And declares an age of 25
    And accepts the terms of use
    And gives the game consent
    And answers the cookie consent
    Then the user reaches the home screen

  @ui @todo
  Scenario: The terms of use must be accepted to play
    Given a device that has never used TheLever
    When the user opens the app
    And declares an age of 25
    Then the user sees a summary of the terms of use and can open the full text and the privacy policy
    And the accepted version of the terms is recorded when the user accepts them

  @ui @todo
  Scenario: The user does not accept the terms of use
    Given a device that has never used TheLever
    When the user opens the app
    And declares an age of 25
    And does not accept the terms of use
    Then the user cannot access any feature of the app
    And the user stays on the terms of use, able to accept them later

  @ui @todo
  Scenario: The game consent must be given explicitly to play
    Given a device that has never used TheLever
    When the user opens the app
    And declares an age of 25
    And accepts the terms of use
    Then the user is asked for the explicit consent to process, to play, their votes, predictions and reactions and what others predict or react about them, in a separate statement that is not preselected
    And the user cannot access any feature of the app until giving it
    And the accepted version of the game consent is recorded

  @ui @todo
  Scenario: The game consent explains what is and is not done with the votes
    Given the user is asked for the game consent
    Then before the checkboxes the user is told that the votes are used only to play and, under this consent, are not sold or used for ads, profiling or research, are seen only by the group, and are deleted within 24 hours except their history
    And that their history stays on the phone or in the account until they delete it or do not open the app for 24 months
    And why the consent is asked separately
    And the user can open the privacy policy, which explains that the ranking and, in nominal rooms, the split of the group stay in the history of the others

  @ui @todo
  Scenario: The game consent links to how TheLever is funded
    Given the user is asked for the game consent
    Then the user can open "How TheLever is funded"

  @ui @todo
  Scenario: Nothing from the ad network loads before the cookie consent
    Given a device that has never used TheLever
    When the user opens the app
    And has not answered the cookie consent yet
    Then no ad network script and no non-essential cookie is loaded

  @ui @todo
  Scenario: Rejecting cookies is as easy as accepting them
    Given the user is shown the cookie consent
    Then rejecting takes the same number of taps as accepting

  @ui @todo
  Scenario: The home screen shows a banner ad
    Given a device that has completed the first access
    When the user reaches the home screen
    Then a 320 x 100 banner ad marked as an ad appears at the bottom

  @ui @todo
  Scenario: The age screen does not reveal the minimum age
    Given a device that has never used TheLever
    When the user opens the app
    Then the user is asked for a year of birth with no year preselected
    And the screen does not mention any minimum age

  @ui @todo
  Scenario: A user arriving from an invitation link goes to that room
    Given a device that has never used TheLever
    And an invitation link to an existing room
    When the user opens the invitation link
    And declares an age of 30
    And accepts the terms of use
    And gives the game consent
    And answers the cookie consent
    Then the user is asked for a nickname to join that room

  @ui @todo
  Scenario Outline: Minimum age depends on the region
    Given a device that has never used TheLever
    And the user is <region>
    When the user opens the app
    And declares an age of <age>
    Then the user <outcome>

    Examples:
      | region                   | age | outcome                              |
      | in the EEA               | 15  | cannot access any feature of the app |
      | in the EEA               | 16  | is shown the terms of use            |
      | in the EEA               | 17  | is shown the terms of use            |
      | in the EEA               | 18  | is shown the terms of use            |
      | in the rest of the world | 17  | cannot access any feature of the app |
      | in the rest of the world | 18  | is shown the terms of use            |

  @ui @todo
  Scenario Outline: The month of birth is asked in a boundary year
    Given a device <region> that has never used TheLever
    When the user opens the app
    And chooses the year of birth of someone who turns <age> this year
    Then the user is also asked for the month of birth, with no month preselected

    Examples:
      | region                   | age |
      | in the EEA               | 16  |
      | in the EEA               | 18  |
      | in the rest of the world | 18  |

  @ui @todo
  Scenario Outline: The app is not available in blocked countries
    Given a device that has never used TheLever
    And the user is in <country>
    When the user opens the app
    Then the user is told that TheLever is not available in their country
    And the user cannot access any feature of the app

    Examples:
      | country               |
      | a sanctioned country  |
      | the United Kingdom    |

  @todo
  Scenario: Only the region is stored, not the IP address
    Given a device that has never used TheLever
    When the user completes the first access
    Then the region is stored with the declared age
    And the IP address is not stored

  @ui @todo
  Scenario: A user under the minimum age stays blocked on that device
    Given a device in the EEA where the user declared an age of 15
    When the user opens the app again
    Then the user cannot access any feature of the app

  @ui @todo
  Scenario: A returning user skips age, terms and consent
    Given a device that has completed the first access
    When the user opens the app
    Then the user reaches the home screen without being asked for age, terms or the game consent

  @ui @todo
  Scenario: A user with an account signs in instead of declaring the age
    Given a device that has never used TheLever
    And an account with a declared age, accepted terms and the game consent
    When the user opens the app
    And chooses to sign in to that account
    Then the region of the device is determined
    And the user answers the cookie consent
    And the Global Privacy Control signal of the browser is read
    And the user reaches the home screen without being asked for age, terms or the game consent

  @ui @todo
  Scenario: Signing in from a blocked country is not allowed
    Given an account with a declared age, accepted terms and the game consent
    And the user is in a blocked country
    When the user tries to sign in to that account on a new device
    Then the user is told that TheLever is not available in their country

  @ui @todo
  Scenario: Global Privacy Control rejects personalised ads
    Given a browser that sends the Global Privacy Control signal
    When the user answers the cookie consent
    Then personalised ads are not enabled
    And the user is told why

  @ui @todo
  Scenario: Substantially changed terms must be accepted again
    Given a player who accepted a previous version of the terms of use
    And a new version marked as substantial has been published
    When the player opens the app
    Then the player is asked to accept the new terms before playing
    And the accepted version is recorded

  @ui @todo
  Scenario: A changed game consent must be given again
    Given a player who gave a previous version of the game consent
    And a new version that requires new consent has been published
    When the player opens the app
    Then the player sees the game consent screen with a notice that it has changed, separate from the terms of use
    And the player cannot create or join a room until giving it
    And the accepted version is recorded when the player gives it

  Scenario: Game data is deleted within 24 hours of the room closing
    Given a room where the player played closed 24 hours ago
    Then no vote, prediction, reaction or point of any player from that game is kept

  @ui @todo
  Scenario: The app offers to be installed
    Given a device that has completed the first access
    And the app is not installed on the home screen
    When the user reaches the home screen
    Then the user is offered to install the app

  @ui @todo
  Scenario: A closed install offer comes back only after 30 days and a finished game
    Given the user closed the offer to install the app
    When the user reaches the home screen again before 30 days have passed
    Then the user is not offered to install the app
    When 30 days have passed and the user finishes a game
    Then the user is offered to install the app again
