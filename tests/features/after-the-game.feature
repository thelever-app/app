Feature: After the game
  As a player
  I want to share how the game went and play again if we feel like it
  So that the fun continues and more people discover TheLever

  Rule: Nominal room

    Background:
      Given a nominal room with players "Ana", "Luis" and "Marta"
      And the game has ended

    @ui @todo
    Scenario: A player shares a personal card
      Given "Luis" finished second, is El Mentalista and is best known by "Marta"
      When "Luis" shares his card
      Then the card shows that he finished second
      And that he is El Mentalista
      And that "Marta" knows him best

    @ui @todo
    Scenario: A player removes another nickname from the card
      Given "Luis" is best known by "Marta"
      When "Luis" removes the nickname of "Marta" from his card
      Then the card shows the avatar of "Marta" without her nickname

  Rule: Anonymous room

    Background:
      Given an anonymous room with players "Ana", "Luis" and "Marta" and 8 dilemmas
      And the game has ended

    @ui @todo
    Scenario: A player shares the group card
      When "Luis" shares the card
      Then the card shows that the group played 8 dilemmas
      And shows the dilemma that divided the group the most
      And shows no information about any player

    @todo
    Scenario: The most divisive dilemma is the closest to an even split
      Given the third dilemma was voted 2 to 1
      And every other dilemma was voted 3 to 0
      When "Luis" shares the card
      Then the card shows the third dilemma as the one that divided the group the most

    @todo
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

    @ui @todo
    Scenario: The host starts a rematch with the same group
      When "Ana" starts a rematch
      Then all players still in the room move to the lobby of a new game
      And the new game keeps the configuration of the previous one

    @ui @screen @todo
    Scenario: Players watch a video ad before the rematch lobby
      When "Ana" starts a rematch
      Then each player still in the room is shown a video ad they can skip after 5 seconds
      And then moves to the lobby of the rematch

    @ui @todo
    Scenario: The host is still disconnected when the game ends
      Given "Luis" has been in the room longer than "Marta"
      And "Ana" disconnected before the game ended
      Then "Luis" is the host
      And "Luis" can start a rematch

    @ui @todo
    Scenario: The host changes the configuration before the rematch starts
      Given the players are in the lobby of the rematch
      When "Ana" changes the number of dilemmas
      Then the rematch uses the new number of dilemmas

    @todo
    Scenario: The rematch does not repeat dilemmas
      Given the room has already played 8 dilemmas
      When the rematch starts
      Then none of its dilemmas has been played before in that room

    @ui @todo
    Scenario: The category runs out of unplayed dilemmas
      Given the room has played every dilemma of its category
      When "Ana" starts a rematch
      Then "Ana" is told there are no new dilemmas in that category
      And "Ana" can choose another category

    @ui @todo
    Scenario: A player leaves instead of playing the rematch
      When "Marta" leaves the room
      And "Ana" starts a rematch
      Then the rematch lobby has "Ana" and "Luis"

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
