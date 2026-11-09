Feature: Reveal
  As a player
  I want to discover how the group voted each dilemma before the next one
  So that we can comment on every result together

  Rule: Any room

    Background:
      Given a room with players "Ana", "Luis" and "Marta" and 3 dilemmas

    @ui
    Scenario: Any player moves to the next round
      Given the reveal is on the first dilemma
      When "Marta" moves to the next round
      Then all players get the second dilemma

    @ui
    Scenario: Players see who moved on
      Given the reveal is on the first dilemma
      When "Marta" moves to the next round
      Then "Ana" and "Luis" see in the player strip that "Marta" moved on

    @ui @screen
    Scenario: The notice of who moved on covers nothing
      Given the reveal is on the first dilemma
      When "Marta" moves to the next round
      Then the notice in the player strip of "Ana" covers nothing of the dilemma
      And it disappears by itself

    @ui
    Scenario: Two players move on at the same time
      Given the reveal is on the first dilemma
      When "Ana" and "Luis" move to the next round at the same time
      Then all players get the second dilemma

    @ui
    Scenario: Nobody goes back to a past round
      Given the reveal is on the second dilemma
      Then no player can go back to the first dilemma

    @todo
    Scenario: The time spent on each dilemma is recorded
      Given the reveal was on the first dilemma for 90 seconds
      When a player moves to the next round
      Then 90 seconds are recorded for the first dilemma
      And no player sees that time

    @ui
    Scenario: A disconnected player gets back to the current reveal
      Given "Luis" disconnects during the reveal of the first dilemma
      When "Luis" reconnects
      Then "Luis" sees the reveal of the first dilemma

    @ui @todo
    Scenario: A player likes the dilemma
      Given the reveal is on the first dilemma
      When "Luis" likes the dilemma
      Then the like counts for the rating of the dilemma

    @todo
    Scenario: A player likes a dilemma only once
      Given "Luis" already liked the first dilemma in a previous game
      When the reveal is on that dilemma again
      Then the like of "Luis" is not counted twice

    @ui @todo
    Scenario: A player reacts to the dilemma itself
      Given the reveal is on the first dilemma
      When "Luis" reacts to the dilemma
      Then all players see the reaction
      And the reaction is recorded as from "Luis" to the first dilemma

    @todo
    Scenario: Only one reaction per person and dilemma
      Given "Luis" has reacted to the first dilemma
      When "Luis" reacts again to it
      Then only his latest reaction is kept

    @todo
    Scenario: Each reaction and like records the consents and whether the player was under 18
      Given "Luis" declared a birth year that makes him 17
      When "Luis" reacts to the dilemma and likes it
      Then his reaction and his like record that there is no research consent and no commercial licence consent
      And both are marked as given by a player under 18

    @ui
    Scenario: The reveal shows who the dilemma was about
      Given "Marta" was chosen for the gap of the first dilemma
      When the reveal is on the first dilemma
      Then all players see that the dilemma was about "Marta"

    @ui
    Scenario: A public dilemma does not show its creator
      Given the first dilemma comes from the catalog
      When the reveal is on the first dilemma
      Then no player sees who created it

    @ui @screen @todo
    Scenario: The reveal of each dilemma shows a banner ad
      Given the first dilemma comes from the general catalog
      When the reveal is on the first dilemma
      Then the players see a 320 x 100 banner ad at the foot of the screen
      And the banner is away from every button
      And the reveal does not wait for the ad

    @ui @screen @todo
    Scenario Outline: A dilemma outside the general catalog shows no banner ad
      Given the first dilemma is <kind>
      When the reveal is on the first dilemma
      Then no ad is shown

      Examples:
        | kind                      |
        | a private dilemma         |
        | a dilemma in exploration  |

  Rule: Nominal room

    Background:
      Given a nominal room with players "Ana", "Luis" and "Marta" and 3 dilemmas

    @ui
    Scenario: Each dilemma shows the distribution, the votes and the predictions
      Given the reveal is on the first dilemma
      Then all players see how many chose each option
      And all players see what each player voted
      And each player sees which of their own predictions were right

    @ui
    Scenario: The reveal of a dilemma shows no total of points
      Given the reveal is on the second dilemma
      Then no player sees the points of anyone so far

    @ui
    Scenario: A player who did not vote appears as such
      Given "Marta" did not vote the second dilemma
      When the reveal is on the second dilemma
      Then "Marta" appears as "did not vote"
      And her vote is not counted in the distribution

    @ui @todo
    Scenario: A private dilemma shows its author
      Given the first dilemma is a private dilemma of "Ana"
      When the reveal is on the first dilemma
      Then all players see that the dilemma is by "Ana"

    @ui
    Scenario: The reveal shows who added a dilemma
      Given "Luis" added the first dilemma in the lobby
      When the reveal is on the first dilemma
      Then all players see that "Luis" added it

    @ui @todo
    Scenario: A player reacts to the vote of a specific person
      Given the reveal is on the first dilemma
      When "Luis" reacts to the vote of "Ana"
      Then all players see the reaction of "Luis" on the vote of "Ana"
      And the reaction is recorded as from "Luis" to "Ana"

    @ui @todo
    Scenario: A player can react to their own vote
      Given the reveal is on the first dilemma
      When "Luis" reacts to his own vote
      Then all players see the reaction of "Luis" on his own vote

    @todo
    Scenario: Only one reaction per person and vote
      Given "Luis" has reacted to the vote of "Ana"
      When "Luis" reacts again to the vote of "Ana"
      Then only his latest reaction to the vote of "Ana" is kept

    @ui @todo
    Scenario: The last round leads to the game results
      Given the reveal is on the last dilemma
      When a player moves on
      Then all players see who is El Mentalista of the game
      When a player moves on
      Then each player sees who knows them best
      When a player moves on
      Then all players see the ranking

    @ui @todo
    Scenario: Players see who moved on in the game results
      Given all players see who is El Mentalista of the game
      When "Marta" moves on
      Then "Ana" and "Luis" see in the player strip that "Marta" moved on

    @ui @todo
    Scenario: El Mentalista is shared in case of a tie
      Given "Ana" and "Luis" have the same highest points
      When the game results are shown
      Then "Ana" and "Luis" are both El Mentalista of the game

    @ui @todo
    Scenario: Who knows a player best is shared in case of a tie
      Given "Ana" and "Luis" have predicted the votes of "Marta" equally well
      When the game results are shown
      Then "Marta" sees that "Ana" and "Luis" know her best

    @ui @screen @todo
    Scenario: No ad is shown in the game results
      When the game results are shown
      Then no ad is shown

    @ui @todo
    Scenario: The game results end the game
      Given the ranking is shown
      When a player moves on
      Then the game ends

  Rule: Anonymous room

    Background:
      Given an anonymous room with players "Ana", "Luis" and "Marta" and 3 dilemmas

    @ui
    Scenario: Each dilemma shows only the distribution
      Given the reveal is on the first dilemma
      Then all players see how many chose each option
      And no player receives what any other player voted

    @ui
    Scenario: Players who did not vote appear only as a count
      Given "Marta" did not vote the second dilemma
      When the reveal is on the second dilemma
      Then all players see that 1 player did not vote
      And nobody sees who it was

    @ui
    Scenario: Too few votes hide the distribution
      Given only "Luis" and "Marta" voted the first dilemma
      When the reveal is on the first dilemma
      Then nobody sees how many chose each option
      And all players see that there were too few votes to show it

    @ui
    Scenario: The reveal never shows who added a dilemma
      Given "Luis" added the first dilemma in the lobby
      When the reveal is on the first dilemma
      Then no player sees who added it

    @ui @todo
    Scenario: The last round ends the game without game results
      Given the reveal is on the last dilemma
      When a player moves on
      Then the game ends
      And nobody sees a ranking, El Mentalista or who knows them best
