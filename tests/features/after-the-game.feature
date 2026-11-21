Feature: After the game
  As a player
  I want to share how the game went and play again if we feel like it
  So that the fun continues and more people discover TheLever

  Rule: Nominal room

    Background:
      Given a nominal room with players "Ana", "Luis" and "Marta"
      And the game has ended

    @ui
    Scenario: A player shares a personal card
      Given "Luis" finished first, is El Mentalista and "Verso suelto" and is best known by "Marta"
      When "Luis" shares his card
      Then the card shows that he finished first
      And his titles El Mentalista and "Verso suelto"
      And that "Marta" knows him best

    @ui
    Scenario: The card shows the partner of Almas gemelas
      Given "Luis" and "Ana" are "Almas gemelas"
      When "Luis" shares his card
      Then the card shows the title "Almas gemelas" with the avatar of "Ana"
      And "Luis" can show the nickname of "Ana" before sharing

    @ui
    Scenario: The card hides the other nicknames unless the player shows them
      Given "Luis" is best known by "Marta"
      When "Luis" shares his card
      Then the card shows the avatar of "Marta" without her nickname
      When "Luis" shows the other nicknames on his card
      Then the card shows the nickname of "Marta"

    @ui
    Scenario: The end of the game sums up the game results
      Given "Luis" is El Mentalista and "Marta" is "Imán de reacciones"
      Then each player sees at the end of the game the ranking with the badges of the titles
      And each player sees at the end of the game every title of the game with who won it

    @ui @screen @todo
    Scenario: A player chooses to watch a rewarded ad to see how each player reads them
      Given a rewarded ad is ready
      When "Luis" chooses to watch the rewarded ad at the end of the game
      And the ad finishes
      Then only "Luis" sees how many of his votes each other player guessed
      And the dilemma where the fewest players guessed his vote

    @ui @todo
    Scenario: There is no reward when no rewarded ad is ready
      Given no rewarded ad is ready
      When "Luis" sees the end of the game
      Then he is not offered the reward

    @todo
    Scenario: A late player is counted only on the rounds they played
      Given "Marta" joined the game in the third of 6 rounds
      When "Marta" watches the rewarded ad
      Then the guesses about her votes count only the 4 rounds she played

    @ui @todo
    Scenario: The reward is not kept
      Given "Luis" has seen how each player reads him
      When "Luis" leaves the end of the game
      Then that reward is not in his history
      And it is not on his card

    @ui @todo
    Scenario: Nobody has to watch the rewarded ad
      When "Luis" does not choose the rewarded ad
      Then "Luis" can share his card and play the rematch as usual

  Rule: Anonymous room

    Background:
      Given an anonymous room with players "Ana", "Luis" and "Marta" and 8 dilemmas
      And the game has ended

    @ui
    Scenario: A player shares the group card
      When "Luis" shares the card
      Then the card shows that the group played 8 dilemmas
      And shows the dilemma that divided the group the most
      And shows no information about any player

    @ui
    Scenario: The end of the game shows the ranking of who reads the group best
      Then each player sees at the end of the game the ranking of who reads the group best

    Scenario: The most divisive dilemma is the closest to an even split
      Given the third dilemma was voted 2 to 1
      And every other dilemma was voted 3 to 0
      When "Luis" shares the card
      Then the card shows the third dilemma as the one that divided the group the most

    Scenario: A tie for the most divisive dilemma goes to the first one
      Given the second and the fifth dilemmas were both voted 2 to 1
      And every other dilemma was voted 3 to 0
      When "Luis" shares the card
      Then the card shows the second dilemma as the one that divided the group the most

  Rule: Any room

    Background:
      Given a room with players "Ana", "Luis" and "Marta"
      And "Ana" is the host
      And the game has ended

    @ui
    Scenario: The host starts a rematch with the same group
      When "Ana" starts a rematch
      Then all players still in the room move to the lobby of a new game
      And the new game keeps the configuration of the previous one

    @ui @screen @todo
    Scenario: Each player sees one interstitial ad when leaving the game results
      When "Luis" leaves the game results for the end of the game
      Then "Luis" is shown one full screen ad from the ad network
      And then sees the end of the game
      And is not shown another full screen ad in that game

    @ui
    Scenario: The host is still disconnected when the game ends
      Given "Luis" has been in the room longer than "Marta"
      And "Ana" disconnected before the game ended
      Then "Luis" is the host
      And "Luis" can start a rematch

    @ui
    Scenario: The host changes the configuration before the rematch starts
      Given the players are in the lobby of the rematch
      When "Ana" changes the rounds
      Then the rematch uses the new rounds

    Scenario: The rematch keeps the rounds
      Given round 1 had a specific dilemma and round 3 was chosen by the players
      When the players are in the lobby of the rematch
      Then round 1 is random from every category
      And round 3 is empty

    Scenario: The rematch does not repeat dilemmas
      Given the room has already played 8 dilemmas
      When the rematch starts
      Then none of its dilemmas has been played before in that room

    @ui
    Scenario: The categories of a random round run out
      Given the room has played every dilemma of the categories of round 2
      When "Ana" starts a rematch
      Then "Ana" is told round 2 has no new dilemmas left
      And "Ana" can change its categories

    @ui
    Scenario: A player leaves instead of playing the rematch
      When "Marta" leaves the room
      And "Ana" starts a rematch
      Then the rematch lobby has "Ana" and "Luis"

    @ui
    Scenario: The end of the game shows who is still in the room
      When "Marta" leaves the game
      Then "Ana" and "Luis" see at the end of the game that they are still in the room
      And that "Marta" has left

    @ui @todo
    Scenario: A player plays the dilemmas of a past game with another group
      Given "Luis" played a game hosted by "Ana" with 6 dilemmas from the catalog
      When "Luis" opens that game in his history
      And chooses to play these dilemmas with another group
      Then "Luis" is the host of a new room with those 6 dilemmas

    @todo
    Scenario: Private dilemmas of other players are not copied
      Given the game played a private dilemma of "Ana" and a private dilemma of "Luis"
      When "Luis" plays these dilemmas with another group
      Then the new room has the private dilemma of "Luis"
      And it does not have the private dilemma of "Ana"

    @ui @todo
    Scenario: The home screen suggests it once on another day
      Given "Luis" played a game hosted by "Ana" yesterday
      When "Luis" opens the app today
      Then the home screen suggests playing the dilemmas of the game with "Ana" with his own people
      When "Luis" closes the suggestion
      Then it is not shown again for that game

    @todo
    Scenario: The analytics counts rooms born from another room
      Given "Luis" has not objected to the usage analytics
      When "Luis" plays the dilemmas of a past game with another group
      Then the usage analytics counts one room born from another
      And it records no vote

    Scenario: The room closes when everyone has left
      When every player has left the room
      Then the room closes
      And its invitation link no longer lets anyone in

    Scenario: The room closes after 15 minutes with no player connected
      Given no player has been connected to the room for 15 minutes
      Then the room closes
      And its invitation link no longer lets anyone in

    Scenario: The room stays open while players are connected
      Given every player is still connected
      And nobody has done anything in the room for 20 minutes
      Then the room is still open

    @ui @screen @todo
    Scenario: The end of the game shows a banner ad
      When the players see the end of the game
      Then a 320 x 100 banner ad appears below the main actions
      And it does not cover any of them

    @ui @screen
    Scenario: An adult player is invited to support TheLever when chance picks the game
      Given "Luis" is 18 or older
      And chance picks this game to invite "Luis" to donate
      When "Luis" sees the end of the game
      Then the end of the game shows one line to support TheLever with a donation
      And it does not cover the main actions

    @ui @screen
    Scenario: The end of the game shows no invitation when chance does not pick it
      Given "Luis" is 18 or older
      And chance does not pick this game to invite "Luis" to donate
      When "Luis" sees the end of the game
      Then the end of the game shows no invitation to donate

    @ui @screen
    Scenario: The home screen invites an adult player to support TheLever until they close the card
      Given "Luis" is 18 or older
      When "Luis" opens the home screen
      Then the home screen shows a card to support TheLever with a donation
      When "Luis" closes the card
      Then it is not shown again on this device

    @ui @screen
    Scenario: A player under 18 is not invited to donate
      Given "Marta" is 17
      And chance picks this game to invite "Marta" to donate
      When "Marta" sees the end of the game
      And opens the home screen
      Then she sees no invitation to donate

  Rule: Restarting the game

    Background:
      Given a room with players "Ana", "Luis" and "Marta"
      And "Ana" is the host

    @ui
    Scenario: The host restarts a game in progress
      Given the game is on the decision phase of its third round
      When "Ana" restarts the game
      Then all players still in the room move to the lobby of a new game
      And the new game keeps the configuration of the previous one

    Scenario: Restarting keeps the votes given and records the game as stopped
      Given the game is on the decision phase of its second round
      And "Luis" has voted the second dilemma
      When "Ana" restarts the game
      Then the votes of the first and the second dilemmas are kept
      And the game is recorded as stopped before its end

    Scenario: Only the dilemmas revealed before restarting count as played
      Given the game is on the decision phase of its third round
      When "Ana" restarts the game
      Then the first two dilemmas count as played in the room
      And the third dilemma does not

    @ui
    Scenario: Only the host can restart the game
      Given the game is on the decision phase of its second round
      Then "Ana" can restart the game
      And neither "Luis" nor "Marta" can
