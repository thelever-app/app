Feature: Decision phase
  As a player
  I want to answer every dilemma at my own pace and in private
  So that the reveal shows how the group thinks

  Rule: Any room

    Background:
      Given "Ana" hosts a room with "Luis" and "Marta"
      And the game is in the decision phase

    @todo
    Scenario: Every player gets the dilemmas in the same order
      When the decision phase starts
      Then every player gets the first dilemma of the game
      And the dilemmas follow the same order for all players

    @todo
    Scenario: A game by category reserves room for new dilemmas
      Given a game of 8 dilemmas chosen by category with new dilemmas included
      When the game is put together
      Then it includes the number of new dilemmas set for games of 8 dilemmas
      And the rest come from the catalog

    Scenario: A player goes back and changes an answer
      Given "Luis" has answered the first two dilemmas
      When "Luis" goes back to the first dilemma and changes his vote
      Then only his new vote counts for that dilemma

    Scenario: Players see each other's progress but not their answers
      When "Luis" answers his third dilemma
      Then "Ana" and "Marta" see that "Luis" has answered 3 dilemmas
      And no other player receives what "Luis" answered

    @todo
    Scenario: A dilemma about someone in the group
      Given a dilemma with the gap "someone in the group"
      And "Marta" is chosen at random for it
      When the players get that dilemma
      Then "Ana", "Luis" and "Marta" see the nickname "Marta" in the text

    @todo
    Scenario: Each player sees the options in their own random order
      Given a dilemma with the options "save the child", "save the doctor" and "save the athlete"
      When "Ana" and "Luis" get that dilemma
      Then each of them sees the three options in a random order
      And the order each of them saw is recorded with their answer

    @todo
    Scenario: The time to answer each dilemma is recorded
      Given "Luis" got the first dilemma 40 seconds ago
      When "Luis" answers it
      Then 40 seconds are recorded as his response time for the first dilemma
      And no player sees that time

    @todo
    Scenario: A player skips a dilemma by reporting it as offensive
      Given "Luis" is on the second dilemma
      When "Luis" reports it as offensive
      Then "Luis" gets the third dilemma without voting the second
      And "Luis" is recorded as "did not vote" for the second dilemma

    @todo
    Scenario: A report for another reason does not skip the dilemma
      Given "Luis" is on the second dilemma
      When "Luis" reports it as confusing
      Then "Luis" is still on the second dilemma

    @todo
    Scenario: A player who has finished sees an ad while waiting
      Given "Luis" has answered every dilemma and "Marta" has not
      Then "Luis" sees the waiting screen with a 320 x 100 banner ad
      When the reveal starts
      Then the banner disappears
      And the reveal does not wait for the ad

    @todo
    Scenario: The reveal starts when everyone has finished
      When every player has answered every dilemma
      Then the game moves to the reveal

    @todo
    Scenario: The host starts the reveal early
      Given "Marta" has answered 2 of 6 dilemmas
      When "Ana" starts the reveal
      Then the game moves to the reveal
      And "Marta" is recorded as "did not vote" for the 4 dilemmas she did not answer

    @todo
    Scenario: Time runs out and the stragglers can keep answering
      Given "Marta" has not finished
      When the total time runs out
      Then everyone sees that "Marta" has not finished
      And "Marta" can keep answering
      And "Ana" can start the reveal at any moment

    @todo
    Scenario: The last straggler finishes after the time ran out
      Given the total time has run out and only "Marta" has not finished
      When "Marta" answers her last dilemma
      Then the game moves to the reveal

    @todo
    Scenario: A disconnected player gets back to where they were
      Given "Luis" has answered 3 dilemmas
      And "Luis" disconnects
      When "Luis" reconnects during the decision phase
      Then "Luis" is on his fourth dilemma
      And keeps his answers

    @todo
    Scenario: The host leaves voluntarily
      Given "Luis" has been in the room longer than "Marta"
      When "Ana" leaves the game
      Then "Luis" becomes the host

    @todo
    Scenario: The host is still disconnected when everyone else has finished
      Given "Luis" has been in the room longer than "Marta"
      And "Ana" has disconnected
      When "Luis" and "Marta" have answered every dilemma
      Then "Luis" becomes the host

    @todo
    Scenario: The host is still disconnected when the total time runs out
      Given "Luis" has been in the room longer than "Marta"
      And "Ana" has disconnected
      When the total time runs out
      Then "Luis" becomes the host
      And "Luis" can start the reveal at any moment

    @todo
    Scenario: The host recovers the role after reconnecting
      Given "Ana" disconnected and "Luis" became the host
      When "Ana" reconnects during the game
      Then "Ana" is the host again

    @todo
    Scenario: A host who left voluntarily comes back as a regular player
      Given "Ana" left the game voluntarily and "Luis" became the host
      When "Ana" joins the room again
      Then "Luis" is still the host

  Rule: Nominal room

    Background:
      Given "Ana" hosts a nominal room with "Luis" and "Marta"
      And the game is in the decision phase

    @todo
    Scenario: The next dilemma appears only after voting and predicting
      Given "Luis" is on the first dilemma
      When "Luis" votes and makes all his predictions
      Then "Luis" gets the second dilemma

    @todo
    Scenario: A player cannot move on with an incomplete answer
      Given "Luis" has voted the first dilemma but not made all his predictions
      Then "Luis" cannot get the second dilemma

    @todo
    Scenario: A player cannot predict before voting
      Given "Luis" has not voted the current dilemma
      Then "Luis" cannot make predictions

    @todo
    Scenario: The player makes a match prediction
      Given "Luis" has voted "pull the lever"
      When "Luis" makes the match prediction that 1 of the other 2 players chose the same as him
      Then his match prediction is that 1 of the other 2 players chose "pull the lever"

    @todo
    Scenario: The player makes a vote prediction for each person in their prediction subset
      Given "Luis" has voted
      When "Luis" makes the vote predictions that "Ana" voted "do nothing" and "Marta" voted "pull the lever"
      Then his vote predictions about "Ana" and "Marta" are recorded

    @todo
    Scenario: Only the predictions made count
      Given "Marta" has voted the current dilemma and made her match prediction but none of her vote predictions
      When the reveal starts
      Then only her match prediction can score

    @todo
    Scenario: Points are calculated before the reveal
      When the decision phase ends
      Then the points of every player are calculated
      And the game moves to the reveal

  Rule: Prediction subsets in a nominal room

    Background:
      Given the room is nominal

    @todo
    Scenario Outline: Size of the prediction subset
      Given a game with <players> players and a prediction limit of <limit>
      When a player gets a dilemma
      Then the prediction subset of the player has <predicted> players

      Examples:
        | players | limit | predicted |
        |       4 |     4 |         3 |
        |       5 |     4 |         4 |
        |      10 |     4 |         4 |

    @todo
    Scenario: Prediction subsets are balanced across the game
      Given a game with 10 players, a prediction limit of 4 and 6 dilemmas
      When the decision phase ends
      Then the number of times any two players have been predicted differs by at most 1

  Rule: Anonymous room

    Background:
      Given "Ana" hosts an anonymous room with "Luis" and "Marta"
      And the game is in the decision phase

    @todo
    Scenario: Players are told what anonymous means
      When the decision phase starts
      Then every player is told that nobody in the group will see their votes
      And that their answers are still recorded for research

    @todo
    Scenario: The next dilemma appears after voting
      Given "Luis" is on the first dilemma
      When "Luis" votes
      Then "Luis" gets the second dilemma without making any prediction
