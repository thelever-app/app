Feature: Decision phase
  As a player
  I want to answer each dilemma in private at the same time as my group
  So that we find out together how the group thinks before moving on

  Rule: Any room

    Background:
      Given "Ana" hosts a room with "Luis" and "Marta"
      And the game has started

    Scenario: Every player gets the dilemmas in the same order
      When the first round starts
      Then every player gets the first dilemma of the game
      And the dilemmas follow the same order for all players

    Scenario: A game by category reserves room for new dilemmas
      Given a game of 8 dilemmas chosen by category with new dilemmas included
      When the game is put together
      Then it includes the number of new dilemmas set for games of 8 dilemmas
      And the rest come from the catalog

    @ui
    Scenario: A player who has answered waits for the others
      When "Luis" answers the first dilemma
      Then "Luis" waits for the others on the first dilemma
      And nobody gets the second dilemma before the first one is revealed

    @ui
    Scenario: A player changes the answer before the dilemma is revealed
      Given "Luis" has answered the first dilemma
      When "Luis" changes his vote before it is revealed
      Then only his new vote counts for that dilemma

    @ui
    Scenario: Nobody answers a dilemma once it is revealed
      Given the first dilemma has been revealed
      Then no player can answer it or change their answer

    @ui
    Scenario: Players see who has answered but not what
      When "Luis" answers the first dilemma
      Then "Ana" and "Marta" see that "Luis" has answered it
      And no other player receives what "Luis" answered

    @ui
    Scenario: Players see the time left for the dilemma
      Given the first dilemma started 20 seconds ago with a time per dilemma of 60 seconds
      Then every player sees that 40 seconds are left for the first dilemma

    @ui @screen @todo
    Scenario: No ad is shown while waiting for the others
      Given "Luis" has answered the first dilemma and "Marta" has not
      Then "Luis" waits for the others without any ad

    @ui
    Scenario: The dilemma is revealed when everyone has answered
      When "Ana", "Luis" and "Marta" answer the first dilemma
      Then the first dilemma is revealed to every player

    @ui
    Scenario: The dilemma is revealed when its time runs out
      Given "Marta" has not answered the first dilemma
      When the time for the dilemma runs out
      Then the first dilemma is revealed to every player
      And "Marta" is recorded as "did not vote" for the first dilemma

    @ui
    Scenario: The host reveals the dilemma early
      Given "Marta" has not answered the first dilemma
      When "Ana" reveals it early
      Then the first dilemma is revealed to every player
      And "Marta" is recorded as "did not vote" for the first dilemma

    @ui
    Scenario: A dilemma about someone in the group
      Given a dilemma with the gap "someone in the group"
      And "Marta" is chosen at random for it
      When the players get that dilemma
      Then "Ana", "Luis" and "Marta" see the nickname "Marta" in the text

    Scenario: Nobody is chosen twice for the gap while others are left
      Given a game with 3 dilemmas with the gap "someone in the group"
      When the players get those dilemmas
      Then "Ana", "Luis" and "Marta" are each chosen once

    Scenario: The answer records whether the voter was the person in the gap
      Given a dilemma with the gap "someone in the group" for which "Marta" was chosen
      When "Marta" and "Luis" answer it
      Then the answer of "Marta" records that she was the person in the gap
      And the answer of "Luis" records that he was not
      And the dilemma keeps its text with the gap, without the nickname

    Scenario: Each answer records the consents and whether the player was under 18
      Given "Luis" declared a birth year that makes him 17
      When "Luis" answers a dilemma
      Then his answer records that there is no research consent and no commercial licence consent
      And his answer is marked as given by a player under 18

    Scenario: A room has only one game in progress
      When "Ana" tries to start another game in that room
      Then no new game starts

    @ui
    Scenario: Each player sees the options in their own random order
      Given a dilemma with the options "save the child", "save the doctor" and "save the athlete"
      When "Ana" and "Luis" get that dilemma
      Then each of them sees the three options in a random order
      And the order each of them saw is recorded with their answer

    Scenario: The time to answer each dilemma is recorded
      Given "Luis" got the first dilemma 40 seconds ago
      When "Luis" answers it
      Then 40 seconds are recorded as his response time for the first dilemma
      And no player sees that time

    @ui
    Scenario: A player skips a dilemma by reporting it as offensive
      Given "Luis" is on the second dilemma
      When "Luis" reports it as offensive and skips it
      Then "Luis" is recorded as "did not vote" for the second dilemma
      And the round does not wait for "Luis"

    @ui
    Scenario: A report for another reason does not skip the dilemma
      Given "Luis" is on the second dilemma
      When "Luis" reports it as confusing
      Then "Luis" can still answer the second dilemma

    Scenario: With nobody connected the dilemma waits for its time
      Given every player has disconnected without answering the first dilemma
      When the time for the dilemma runs out
      Then the first dilemma is revealed to every player

    @ui
    Scenario: The round does not wait for a disconnected player
      Given "Marta" has disconnected without answering the first dilemma
      When "Ana" and "Luis" answer it
      Then the first dilemma is revealed to every player
      And "Marta" is recorded as "did not vote" for the first dilemma

    @ui
    Scenario: A disconnected player gets back to the current round
      Given "Luis" has answered the first dilemma
      And "Luis" disconnects
      When "Luis" reconnects before the first dilemma is revealed
      Then "Luis" is on the first dilemma
      And keeps his answer

    @ui
    Scenario: A player who reconnects after the reveal sees it
      Given "Luis" has answered the first dilemma
      And "Luis" disconnects
      When the first dilemma is revealed and "Luis" reconnects
      Then "Luis" sees the reveal of the first dilemma

    @ui
    Scenario: Players see who is disconnected
      Given "Luis" has answered the first dilemma
      When "Luis" disconnects
      Then "Ana" and "Marta" see "Luis" as disconnected
      And they still see that "Luis" has answered the first dilemma

    @ui
    Scenario: The host leaves voluntarily
      Given "Luis" has been in the room longer than "Marta"
      When "Ana" leaves the game
      Then "Luis" becomes the host

    Scenario: The host leaves while nobody else is connected
      Given "Luis" has been in the room longer than "Marta"
      And "Luis" and "Marta" have disconnected
      When "Ana" leaves the game
      Then "Luis" becomes the host

    @ui
    Scenario: The host is still disconnected when a dilemma is revealed
      Given "Luis" has been in the room longer than "Marta"
      And "Ana" has disconnected
      When the first dilemma is revealed
      Then "Luis" becomes the host
      And "Luis" can reveal the next dilemma early

    @ui
    Scenario: The host recovers the role after reconnecting
      Given "Ana" disconnected and "Luis" became the host
      When "Ana" reconnects during the game
      Then "Ana" is the host again

    @ui
    Scenario: A host who left voluntarily comes back as a regular player
      Given "Ana" left the game voluntarily and "Luis" became the host
      When "Ana" joins the room again
      Then "Luis" is still the host

  Rule: Nominal room

    Background:
      Given "Ana" hosts a nominal room with "Luis" and "Marta"
      And the game has started

    @ui
    Scenario: A player has answered only after voting and predicting
      Given "Luis" is on the first dilemma
      When "Luis" votes and makes all his predictions
      Then the first dilemma counts as answered by "Luis"

    @ui
    Scenario: A player has not answered with an incomplete answer
      Given "Luis" has voted the first dilemma but not made all his predictions
      Then the first dilemma does not count as answered by "Luis"

    @ui
    Scenario: A player cannot predict before voting
      Given "Luis" has not voted the current dilemma
      Then "Luis" cannot make predictions

    @ui
    Scenario: The player makes a match prediction
      Given "Luis" has voted "pull the lever"
      When "Luis" makes the match prediction that 1 of the other 2 players chose the same as him
      Then his match prediction is that 1 of the other 2 players chose "pull the lever"

    @ui
    Scenario: The player makes a vote prediction for each person in their prediction subset
      Given "Luis" has voted
      When "Luis" makes the vote predictions that "Ana" voted "do nothing" and "Marta" voted "pull the lever"
      Then his vote predictions about "Ana" and "Marta" are recorded

    @ui
    Scenario: A player keeps the predictions when changing the vote
      Given "Luis" has voted "pull the lever" and made all his predictions on the first dilemma
      When "Luis" changes his vote to "do nothing" before it is revealed
      Then his predictions are kept
      And the first dilemma still counts as answered by "Luis"

    Scenario: Only the predictions made count
      Given "Marta" has voted the current dilemma and made her match prediction but none of her vote predictions
      When the dilemma is revealed
      Then her vote counts
      And only her match prediction can score

    Scenario: Points are calculated when each dilemma is revealed
      When the first dilemma is revealed
      Then the points of every player for the first dilemma are calculated

  Rule: Prediction subsets in a nominal room

    Background:
      Given the room is nominal

    Scenario Outline: Size of the prediction subset
      Given a game with <players> players and a prediction limit of <limit>
      When a player gets a dilemma
      Then the prediction subset of the player has <predicted> players

      Examples:
        | players | limit | predicted |
        | 4       | 4     | 3         |
        | 5       | 4     | 4         |
        | 10      | 4     | 4         |

    Scenario: Prediction subsets are balanced across the game
      Given a game with 10 players, a prediction limit of 4 and 6 dilemmas
      When every dilemma has been revealed
      Then the number of times any two players have been predicted differs by at most 1

  Rule: Anonymous room

    Background:
      Given "Ana" hosts an anonymous room with "Luis" and "Marta"
      And the game has started

    @ui @todo
    Scenario: A player with the research consent is told what anonymous means
      Given "Luis" has given the research consent
      When the first round starts
      Then "Luis" is told that nobody in the group will see his votes
      And that the group sees how many chose each option of each dilemma
      And that his answers count for research under a pseudonym
      And that he can change it in the settings

    @ui @todo
    Scenario: A player without the research consent is told what anonymous means
      Given "Marta" has not given the research consent
      When the first round starts
      Then "Marta" is told that nobody in the group will see her votes
      And that the group sees how many chose each option of each dilemma
      And that her answers are only used to play and are deleted 24 hours after the room closes, except her history
      And that she can change it in the settings

    @todo
    Scenario: Nobody receives the consent status of another player
      Given "Luis" has given the research consent and "Marta" has not
      When the first round starts
      Then no player receives the consent status of any other player

    @ui
    Scenario: A player answers by voting
      Given "Luis" is on the first dilemma
      When "Luis" votes
      Then "Luis" has answered the first dilemma without making any prediction

    @ui
    Scenario: Players see how many have answered but not who
      When "Luis" answers the first dilemma
      Then "Ana" and "Marta" see that 1 player has answered it
      And no player receives who has answered
