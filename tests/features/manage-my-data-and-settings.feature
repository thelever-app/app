Feature: Manage my data and settings
  As a player
  I want to control the app, my history and my data
  So that I decide how TheLever uses my information

  Background:
    Given a player who has completed the first access

  @ui @screen
  Scenario: The player changes the language of the app
    Given the app is in Spanish
    When the player changes the language to English in the settings
    Then the app is shown in English immediately

  @ui @screen
  Scenario: The declared age cannot be changed
    When the player opens the settings
    Then the player has no option to change the declared age

  @ui @todo
  Scenario: The player sees the history of games played on this device
    Given the player has played 3 games on this device
    When the player opens the history
    Then the player sees those 3 games

  @ui @todo
  Scenario: The history is lost when the device identifier changes
    Given the player has played 3 games on this device without an account
    When the browser data of the device is deleted
    Then the player is treated as a new player
    And the previous history is no longer available

  @ui @todo
  Scenario: The history follows the account to another device
    Given the player has played 3 games on this device
    When the player registers an account
    And signs in on another device
    Then the player sees those 3 games on the other device

  @ui @todo
  Scenario: The history of a game is kept when its room is deleted
    Given the player has played a game on this device
    And the room of that game has been deleted
    When the player opens the history
    Then the player sees that game

  @ui @todo
  Scenario: The player withdraws the game consent
    Given the player has an account with a game history
    When the player chooses to withdraw the game consent in the settings
    Then the player is warned that the history stored in the account and the game data still within 24 hours will be deleted
    When the player confirms
    Then the player cannot create or join a room
    And the history stored in the account and the game data still within 24 hours are deleted
    And the player is offered to give the game consent again

  @ui @todo
  Scenario: The player downloads their data
    Given the player has an account with a game history
    When the player downloads their data in the settings
    Then the player gets a JSON file with their nickname, email, age, region, consents with dates and versions, history, created dilemmas, likes, reports, moderation decisions and analytics events

  @todo
  Scenario: A request by email without a code is not answered
    Given a player without an account
    When someone sends a data request by email without the code of that player
    Then the request is not carried out
    And the reply explains how to send it with the code

  @todo
  Scenario: The player objects to product analytics
    When the player objects to product analytics in the settings
    And plays a game
    Then no analytics event of the player is recorded

  @todo
  Scenario: The player requests the deletion of their data
    When the player requests the deletion of their data
    Then all data linked to their identifier is deleted within one month
    And their account is deleted if they have one
    And only a minimal record of the consent required by law is kept

  @ui @todo
  Scenario: The deletion screen explains what is deleted and what is kept
    When the player opens "Delete my data"
    Then the player is told what is deleted and what is kept
    And that their nickname will show as "Player" in the history of the others

  @todo
  Scenario: The nickname of a deleted player shows as "Player" in the history of others
    Given "Ana" and "Luis" played a game together
    When the data of "Luis" is deleted
    And "Ana" opens that game in the history
    Then "Ana" sees "Player" instead of "Luis" in the ranking, with his position

  @ui @todo
  Scenario: A player without account gets a code to send requests by email
    Given a player without an account
    When the player opens "Your data" in the settings
    Then the player sees a code to include in any request sent by email

  @ui @todo
  Scenario: The player sees how to correct their age
    When the player opens "Correct a data item" in the settings
    Then the player sees the contact email and that the request is reviewed by hand

  @todo
  Scenario: An inactive player with an account is warned before the deletion
    Given a player with an account who has not opened the app for 23 months
    When 30 days are left until 24 months of inactivity
    Then the player receives an email explaining that their account and history will be deleted
    And the email has a link to request the deletion without opening the app

  @todo
  Scenario: An inactive player is deleted after 24 months
    Given a player who has not opened the app for 24 months
    When the daily job runs
    Then their account, email, device identifier and history are deleted
    And their public dilemmas remain in the catalog without a link to them

  @ui @todo
  Scenario: The device starts from scratch as soon as the deletion is requested
    When the player requests the deletion of their data
    Then the player is signed out at once
    And the app shows the welcome screen as on a new device

  @todo
  Scenario: The public dilemmas of a player are kept without their author after the deletion
    Given a player who created public dilemmas
    When the data of the player is deleted
    Then the public dilemmas remain in the catalog
    And they are no longer linked to the player

  @ui @todo
  Scenario: A player without an account downloads their data from the app
    Given a player without an account
    When the player downloads their data in the settings
    Then the player gets the JSON file without having to identify themselves any further

  @ui @todo
  Scenario: The player changes the cookie choices
    When the player opens "Cookies and ads" in the settings
    Then the player can change what they allow, personalised ads included, as easily as they first answered

  @ui @screen
  Scenario: The settings show how TheLever is funded
    When the player opens "How TheLever is funded" in the settings
    Then the player sees that TheLever is funded with ads
    And that permission to use games for research may be asked later, optionally and explicitly
    And that players can support TheLever with a donation, which gives no advantage in the game
    And the player can open the donation page

  @ui @screen
  Scenario: The settings start with a link to support TheLever
    When the player opens the settings
    Then the first row is a link to support TheLever with a donation
    And it opens the donation page

  @ui @screen
  Scenario: The settings show the contact email for users and authorities
    When the player opens "Contact and reports"
    Then the player sees the contact email and the languages in which it is answered
    And can open the web form to report illegal content

  @ui @screen
  Scenario: The settings show credits, licences and the source code
    When the player opens "Credits and licences"
    Then the player sees the third-party licence notices and the credit to DiceBear
    And can open the source code of the app

  Rule: Nominal room

    @ui @todo
    Scenario: The history shows my votes, the split and the ranking, but not the votes of others
      Given the player played a nominal game with "Ana" and "Luis"
      When the player opens that game in the history
      Then the player sees their own votes, how the group split and the ranking with the nickname and position of each player
      And the player sees the date, the number of players and their own position
      And the player sees the room as "Room of 3 players", without the host's nickname
      And the player does not see what "Ana" or "Luis" voted

  Rule: Anonymous room

    @ui @todo
    Scenario: The history of an anonymous game shows my votes and the ranking but not the split
      Given the player played an anonymous game with 3 players
      When the player opens that game in the history
      Then the player sees their own votes and the ranking with the nickname and position of each player
      And the player does not see how the group split
