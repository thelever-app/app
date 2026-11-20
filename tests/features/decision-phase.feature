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

    Scenario: Random rounds reserve room for new dilemmas
      Given a game of 8 random rounds with new dilemmas included
      When the game is put together
      Then it includes the number of new dilemmas set for 8 random rounds
      And each new dilemma is of the categories of its round
      And the rest come from the catalog

    Scenario: At most one game theory dilemma in any five rounds
      Given a game of 10 random rounds from every category
      And there are enough suitable dilemmas that are not game theory dilemmas
      When the game is put together
      Then no five consecutive rounds have more than one game theory dilemma

    Scenario: Would-you-rather dilemmas are never in consecutive rounds
      Given a game of 10 random rounds from every category
      And there are enough suitable dilemmas that are not would-you-rather dilemmas
      When the game is put together
      Then no two would-you-rather dilemmas are in consecutive rounds

    Scenario: At most one extreme dilemma in any five rounds
      Given a game of 10 random rounds from every category
      And there are enough suitable dilemmas that are not extreme
      When the game is put together
      Then no five consecutive rounds have more than one extreme dilemma

    Scenario: An adults-only round plays an adults-only dilemma
      Given an adults-only room whose round 2 is random with adults-only content
      When the game is put together
      Then the dilemma of round 2 is adults only

    Scenario: A compromising round plays a compromising dilemma
      Given an anonymous room with compromising dilemmas turned on whose round 2 is random with compromising content
      When the game is put together
      Then the dilemma of round 2 is compromising

    Scenario: A round without dilemmas of its content plays any content
      Given an adults-only room whose round 2 is random from "honesty" with adults-only content
      And there are no adults-only dilemmas of "honesty" left to play
      When the game is put together
      Then the dilemma of round 2 is a "honesty" dilemma of any content

    Scenario: Dilemmas nobody in the room has played come first
      Given "Luis" has 3 catalog dilemmas in his history and "Marta" has 2
      And there are enough suitable dilemmas that nobody in the room has played
      When a game of 10 random rounds from every category is put together
      Then none of the dilemmas in the history of "Ana", "Luis" or "Marta" is chosen

    Scenario: Dilemmas played by fewer players come next
      Given there are only 8 suitable dilemmas that nobody in the room has played
      And 2 suitable dilemmas are only in the history of "Luis"
      And 2 suitable dilemmas are in the history of "Ana", "Luis" and "Marta"
      When a game of 10 random rounds from every category without new dilemmas is put together
      Then the game has the 8 dilemmas nobody has played and the 2 only "Luis" has played

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

    @ui
    Scenario: The person in the gap does not vote
      Given a dilemma with the gap "someone in the group" for which "Marta" was chosen
      When the players get that dilemma
      Then "Marta" sees that the dilemma is about her
      And "Marta" cannot vote it

    Scenario: The dilemma keeps its text with the gap
      Given a dilemma with the gap "someone in the group" for which "Marta" was chosen
      When "Ana" and "Luis" answer it
      Then the dilemma keeps its text with the gap, without the nickname
      And the game records that "Marta" was the person in the gap

    Scenario: The person in the gap is never recorded as "did not vote"
      Given a dilemma with the gap "someone in the group" for which "Marta" was chosen
      And "Marta" has not answered it
      When the time for the dilemma runs out
      Then "Marta" is not recorded as "did not vote" for that dilemma

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

    @ui
    Scenario: Options with a fixed order keep it for every player
      Given a dilemma with a fixed order and the options "half", "a third" and "a tenth"
      When "Ana" and "Luis" get that dilemma
      Then both see the options in the order "half", "a third" and "a tenth"
      And that order is recorded with their answers

    @ui
    Scenario: Each player reads the dilemma in their language
      Given the room plays its dilemmas in Spanish
      And "Luis" uses the app in English
      And the first dilemma has an English translation
      When the players get the first dilemma
      Then "Luis" reads it in English
      And "Ana" and "Marta" read it in Spanish

    @ui
    Scenario: A dilemma without a translation is shown in the language of the room
      Given the room plays its dilemmas in Spanish
      And "Luis" uses the app in English
      And the first dilemma has no English translation
      When the players get the first dilemma
      Then "Luis" reads it in Spanish

    Scenario: A vote cast in another language counts for the dilemma of the room
      Given the room plays its dilemmas in Spanish
      And "Luis" reads the first dilemma in English
      When "Luis" votes "pull the lever"
      Then his vote counts for "tirar de la palanca" in the dilemma the room plays

    Scenario Outline: Each answer records the language the player read the dilemma in
      Given the room plays its dilemmas in Spanish
      And "Luis" uses the app in English
      And the first dilemma <translation>
      When "Luis" answers the first dilemma
      Then his answer records that he read it in <language>

      Examples:
        | translation                | language |
        | has an English translation | English  |
        | has no English translation | Spanish  |

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
    Scenario: The player makes a vote prediction for every other player
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
      Given "Marta" has voted the current dilemma and made her vote prediction about "Ana" but not the one about "Luis"
      When the dilemma is revealed
      Then her vote counts
      And only her vote prediction about "Ana" can score

    Scenario: Points are calculated when each dilemma is revealed
      When the first dilemma is revealed
      Then the points of every player for the first dilemma are calculated

  Rule: Predictions in a nominal room

    Background:
      Given the room is nominal

    Scenario: A player predicts the vote of every other player
      Given a game with 10 players
      When a player gets a dilemma without the gap "someone in the group"
      Then the player predicts the vote of the other 9 players

  Rule: Anonymous room

    Background:
      Given "Ana" hosts an anonymous room with "Luis" and "Marta"
      And the game has started

    @ui @screen
    Scenario: Each player is told what anonymous means
      When the first round starts
      Then each player is told that nobody in the group will see their votes
      And that the group sees how many chose each option of each dilemma
      And that their answers are only used to play and are deleted within 24 hours of the room closing, except their history

    @ui
    Scenario: A player has answered only after voting and pressing Ready
      Given "Luis" is on the first dilemma
      When "Luis" votes
      Then the first dilemma does not count as answered by "Luis"
      When "Luis" presses Ready
      Then the first dilemma counts as answered by "Luis"

    @ui
    Scenario: A player cannot predict the distribution before voting
      Given "Luis" has not voted the current dilemma
      Then "Luis" cannot predict the distribution

    Scenario: The current distribution prediction counts when time runs out
      Given "Luis" voted the first dilemma and set his distribution prediction to 70 % and 30 %
      And "Luis" has not pressed Ready
      When the time for the dilemma runs out
      Then his vote and his distribution prediction of 70 % and 30 % count

    @ui
    Scenario: Players see how many have answered but not who
      When "Luis" answers the first dilemma
      Then "Ana" and "Marta" see that 1 player has answered it
      And no player receives who has answered

  Rule: Distribution prediction in an anonymous room

    Background:
      Given the room is anonymous

    @ui
    Scenario Outline: The distribution prediction starts with an even split
      Given a dilemma with <options> options
      When a player has voted it
      Then the distribution prediction starts at <split> in the order the player sees the options
      And the option the player voted is marked as their vote

      Examples:
        | options | split                  |
        | 2       | 50 %, 50 %             |
        | 3       | 35 %, 35 %, 30 %       |
        | 4       | 25 %, 25 %, 25 %, 25 % |

    @ui
    Scenario: Moving one option adjusts the others in proportion
      Given a distribution prediction of 40 %, 30 %, 20 % and 10 %
      When the player moves the first option to 60 %
      Then the distribution prediction is 60 %, 20 %, 15 % and 5 %

    Scenario: The distribution prediction always adds up to 100 % in steps of 5 %
      When a player moves any option of their distribution prediction
      Then every option is a multiple of 5 %
      And all the options add up to 100 %

    @ui @screen
    Scenario: Two options are predicted with a single slider
      Given a dilemma with 2 options
      When a player predicts the distribution
      Then the player moves a single slider that sets both options

  Rule: The person in the gap in a nominal room

    Background:
      Given "Ana" hosts a nominal room with "Luis", "Marta" and "Sara"
      And the first dilemma has the gap "someone in the group" and "Marta" is chosen for it
      And the game has started

    @ui
    Scenario: The person in the gap answers by predicting every other vote
      When "Marta" makes the vote predictions that "Ana" voted "do nothing", "Luis" voted "pull the lever" and "Sara" voted "do nothing"
      Then the first dilemma counts as answered by "Marta"

    @ui
    Scenario: The person in the gap has not answered with predictions missing
      When "Marta" makes the vote prediction that "Ana" voted "do nothing"
      Then the first dilemma does not count as answered by "Marta"

    @ui
    Scenario: Nobody predicts the vote of the person in the gap
      When "Luis" gets the first dilemma
      Then "Luis" predicts the votes of "Ana" and "Sara" only

  Rule: The person in the gap in an anonymous room

    Background:
      Given "Ana" hosts an anonymous room with "Luis", "Marta" and "Sara"
      And the first dilemma has the gap "someone in the group" and "Marta" is chosen for it
      And the game has started

    @ui
    Scenario: The person in the gap predicts the distribution without voting
      When "Marta" sets her distribution prediction to 70 % and 30 % and presses Ready
      Then the first dilemma counts as answered by "Marta"
      And "Marta" has no vote on the first dilemma

  Rule: Dilemmas about someone in the group need enough players

    Scenario Outline: Dilemmas with the gap are only played in rooms that are big enough
      Given a <variant> room with <players> players
      And the host chose a dilemma with the gap "someone in the group" for a specific round
      When the game starts
      Then the dilemma with the gap is <result>

      Examples:
        | variant   | players | result               |
        | nominal   | 2       | left out of the game |
        | nominal   | 3       | played               |
        | anonymous | 3       | left out of the game |
        | anonymous | 4       | played               |

    Scenario: The round of a dilemma with the gap left out gets a random dilemma
      Given a nominal room with 2 players
      And the host chose a dilemma with the gap "someone in the group" for the first round
      When the game starts
      Then the first round plays a random dilemma from every category

    Scenario: Random rounds leave out dilemmas with the gap in a room that is too small
      Given a nominal room with 2 players
      And a game of 8 random rounds from every category
      When the game starts
      Then the game has 8 dilemmas
      And none of them has the gap "someone in the group"

    @ui
    Scenario Outline: The lobby warns that a dilemma with the gap needs more players
      Given a <variant> room with <players> players
      And a player chose a dilemma with the gap "someone in the group" for a round of the players
      When the players are in the lobby
      Then every player sees that a dilemma about someone in the group needs at least <minimum> players
      And the host can still start the game

      Examples:
        | variant   | players | minimum |
        | anonymous | 3       | 4       |
        | nominal   | 2       | 3       |
