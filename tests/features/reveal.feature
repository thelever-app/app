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

    @ui
    Scenario: A player likes the dilemma
      Given the reveal is on the first dilemma
      When "Luis" likes the dilemma
      Then the like counts for the rating of the dilemma

    Scenario: A player likes a dilemma only once
      Given "Luis" already liked the first dilemma in a previous game
      When the reveal is on that dilemma again
      Then the like of "Luis" is not counted twice

    @ui
    Scenario: A player reacts to the dilemma itself
      Given the reveal is on the first dilemma
      When "Luis" reacts to the dilemma
      Then all players see the reaction
      And the reaction is recorded as from "Luis" to the first dilemma

    Scenario: Only one reaction per person and dilemma
      Given "Luis" has reacted to the first dilemma
      When "Luis" reacts again to it
      Then only his latest reaction is kept

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
    Scenario: With AdSense, only the player who triggered the reveal sees a banner ad
      Given the first dilemma comes from the general catalog
      And ads are served with AdSense
      When "Luis" gives the last answer of the first dilemma
      Then "Luis" sees a 320 x 100 banner ad at the foot of the reveal
      And the banner is away from every button
      And "Ana" and "Marta" see no ad
      And the reveal does not wait for the ad

    @ui @todo
    Scenario: With AdSense, the host who reveals early sees the banner ad
      Given the first dilemma comes from the general catalog
      And ads are served with AdSense
      When "Ana" reveals the first dilemma before time as the host
      Then only "Ana" sees a banner ad in the reveal

    @ui @todo
    Scenario: With AdSense, a reveal by the time limit shows no banner ad
      Given the first dilemma comes from the general catalog
      And ads are served with AdSense
      When the time of the first dilemma runs out
      Then no player sees an ad in the reveal

    @ui @screen @todo
    Scenario: With Ad Manager, every player sees a banner ad in the reveal
      Given the first dilemma comes from the general catalog
      And ads are served with Ad Manager
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

    @ui
    Scenario: The reveal shows how many votes the person in the gap guessed
      Given "Marta" was chosen for the gap of the first dilemma
      And "Marta" predicted the votes of "Ana" and "Luis" and only the one of "Ana" was right
      When the reveal is on the first dilemma
      Then all players see "Marta" as the person in the gap, without a vote
      And all players see that "Marta" guessed 1 of 2 votes

    @ui @todo
    Scenario: A private dilemma shows its author
      Given the first dilemma is a private dilemma of "Ana"
      When the reveal is on the first dilemma
      Then all players see that the dilemma is by "Ana"

    @ui
    Scenario: The reveal shows who chose a dilemma
      Given "Luis" chose the dilemma of the first round in the lobby
      When the reveal is on the first dilemma
      Then all players see that "Luis" chose it

    @ui
    Scenario: A player reacts to the vote of a specific person
      Given the reveal is on the first dilemma
      When "Luis" reacts to the vote of "Ana"
      Then all players see the reaction of "Luis" on the vote of "Ana"
      And the reaction is recorded as from "Luis" to "Ana"

    @ui
    Scenario: A player can react to their own vote
      Given the reveal is on the first dilemma
      When "Luis" reacts to his own vote
      Then all players see the reaction of "Luis" on his own vote

    Scenario: Only one reaction per person and vote
      Given "Luis" has reacted to the vote of "Ana"
      When "Luis" reacts again to the vote of "Ana"
      Then only his latest reaction to the vote of "Ana" is kept

    @ui
    Scenario: The last round leads to the game results
      Given the reveal is on the last dilemma
      When a player moves on
      Then all players see the first title of the game
      When the players have moved through every title
      Then the last title they see is El Mentalista
      When a player moves on
      Then each player sees who knows them best
      When a player moves on
      Then all players see the ranking

    @ui
    Scenario: Each title is shown on its own screen with its winner, the fact and the runner-up
      Given "Marta" voted with the minority more often than anyone
      When the title "Verso suelto" is shown
      Then all players see the avatar of the winner, the fact that earned it and the runner-up

    @ui
    Scenario: Titles are shown in a fixed order
      When the titles of the game are shown
      Then they come in this order: "Almas gemelas", "Verso suelto", "La voz del grupo", "Imán de reacciones", "Enigma", "Libro abierto" and "El Mentalista"

    @ui
    Scenario: The ranking shows the titles of each player
      Given "Marta" is El Mentalista and "Luis" is "Imán de reacciones"
      When the ranking is shown
      Then the ranking shows the badge of El Mentalista next to "Marta"
      And the badge of "Imán de reacciones" next to "Luis"

    Scenario Outline: Each title goes to the player who earned it
      Given every player voted the 3 dilemmas
      And <fact>
      When the titles of the game are shown
      Then <winner> gets the title "<title>"

      Examples:
        | title              | fact                                                         | winner          |
        | Libro abierto      | the others guessed the votes of "Ana" more than anyone's     | "Ana"           |
        | Enigma             | the others guessed the votes of "Luis" less than anyone's    | "Luis"          |
        | Verso suelto       | "Marta" voted with the minority more often than anyone       | "Marta"         |
        | La voz del grupo   | "Ana" voted with the majority more often than anyone         | "Ana"           |
        | Imán de reacciones | the votes of "Luis" received more reactions than anyone's    | "Luis"          |
        | Almas gemelas      | "Ana" and "Marta" predicted each other better than any pair  | "Ana" and "Marta" |

    Scenario: Only players who voted at least 3 dilemmas can get a title
      Given "Marta" voted only 2 dilemmas
      When the titles of the game are shown
      Then "Marta" gets no title

    Scenario: The dilemma about a player counts as voted for the titles
      Given "Marta" voted 2 dilemmas and was chosen for the gap of the third
      When the titles of the game are shown
      Then "Marta" can get a title

    Scenario: A tie shares the title
      Given "Ana" and "Luis" voted with the minority equally often and more than "Marta"
      When the titles of the game are shown
      Then "Ana" and "Luis" share the title "Verso suelto"

    Scenario: A title where everybody ties is skipped
      Given every player received the same number of reactions to their votes
      When the titles of the game are shown
      Then the title "Imán de reacciones" is skipped

    @ui
    Scenario: Players see who moved on in the game results
      Given all players see who is El Mentalista of the game
      When "Marta" moves on
      Then "Ana" and "Luis" see in the player strip that "Marta" moved on

    @ui @screen
    Scenario: A player looks back at the game results without moving the others
      Given all players see who is El Mentalista of the game
      When "Ana" goes back to the previous screen of the game results
      Then "Ana" sees the previous screen of the game results
      And "Luis" and "Marta" still see who is El Mentalista of the game
      When "Ana" moves on
      Then "Ana" sees who is El Mentalista of the game again
      And "Luis" and "Marta" still see who is El Mentalista of the game

    @ui
    Scenario: El Mentalista is shared in case of a tie
      Given "Ana" and "Luis" have the same highest points
      When the game results are shown
      Then "Ana" and "Luis" are both El Mentalista of the game

    @ui
    Scenario: Who knows a player best is shared in case of a tie
      Given "Ana" and "Luis" have predicted the votes of "Marta" equally well
      When the game results are shown
      Then "Marta" sees that "Ana" and "Luis" know her best

    @ui @screen @todo
    Scenario: With AdSense, one banner ad stays during all the titles
      Given ads are served with AdSense
      When the titles of the game are shown
      Then each player sees one 320 x 100 banner ad at the foot of the first title
      And the same banner stays, without reloading, until the last title

    @ui @screen @todo
    Scenario: With Ad Manager, each title shows a new banner ad
      Given ads are served with Ad Manager
      When a player moves to the next title
      Then every player sees a new 320 x 100 banner ad at the foot of that title

    @ui @screen @todo
    Scenario: No ad is shown in who knows you best or in the ranking
      When each player sees who knows them best
      Then no ad is shown
      When the ranking is shown
      Then no ad is shown

    @ui
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
    Scenario: Too few votes score nothing
      Given only "Luis" and "Marta" voted the first dilemma
      When the reveal is on the first dilemma
      Then no player scores points for the first dilemma
      And no player sees anything about their distribution prediction

    @ui
    Scenario: The reveal never shows who chose a dilemma
      Given "Luis" chose the dilemma of the first round in the lobby
      When the reveal is on the first dilemma
      Then no player sees who chose it

    @ui
    Scenario: The last round leads to the ranking of who reads the group best
      Given the reveal is on the last dilemma
      When a player moves on
      Then all players see the ranking of who reads the group best
      And nobody sees the titles of the game or who knows them best

    @ui
    Scenario: The leader of the ranking is El Mentalista
      Given "Luis" has the most points for the distribution predictions
      When the ranking of who reads the group best is shown
      Then "Luis" is marked as El Mentalista of the game

    @ui
    Scenario: A tie at the top shares El Mentalista
      Given "Ana" and "Luis" share the most points for the distribution predictions
      When the ranking of who reads the group best is shown
      Then "Ana" and "Luis" are both marked as El Mentalista of the game

    Scenario: Nobody is El Mentalista without points
      Given no dilemma had enough votes to score
      When the ranking of who reads the group best is shown
      Then nobody is marked as El Mentalista of the game

    @ui
    Scenario: A player who left the game is not in the ranking
      Given "Marta" left the game
      When the ranking of who reads the group best is shown
      Then the ranking has "Ana" and "Luis"

    @ui
    Scenario: The ranking of an anonymous room ends the game
      Given the ranking of who reads the group best is shown
      When a player moves on
      Then the game ends

    @ui @screen @todo
    Scenario: No ad is shown in the ranking of an anonymous room
      When the ranking of who reads the group best is shown
      Then no ad is shown

  Rule: Points for vote predictions

    Background:
      Given a nominal room with players "Ana", "Luis", "Marta" and "Sara"

    Scenario Outline: A right prediction scores more when fewer chose that option
      Given <same> of the 4 players voted the same option as "Luis" on the first dilemma
      And "Ana" predicted the vote of "Luis" right
      When the reveal is on the first dilemma
      Then "Ana" scores <points> points for that prediction

      Examples:
        | same | points |
        | 1    | 78     |
        | 2    | 55     |
        | 3    | 33     |
        | 4    | 10     |

    @ui
    Scenario: Each player sees in private the points of the dilemma
      Given "Ana", "Luis" and "Marta" voted the first option of the first dilemma and "Sara" voted the second
      And "Ana" predicted the votes of "Luis" and "Sara" right and the vote of "Marta" wrong
      When the reveal is on the first dilemma
      Then "Ana" sees that she scored 111 points in the first dilemma
      And no other player receives the points of "Ana"

    Scenario: A wrong prediction scores nothing
      Given "Ana" predicted the vote of "Luis" wrong on the first dilemma
      When the reveal is on the first dilemma
      Then "Ana" scores no points for that prediction

  Rule: Points for the distribution prediction

    Background:
      Given an anonymous room with 10 players

    Scenario Outline: Points depend on how close the prediction was
      Given the first dilemma has 2 options and the group voted <real>
      And "Ana" predicted <predicted>
      When the reveal is on the first dilemma
      Then "Ana" scores <points> points for the first dilemma

      Examples:
        | real          | predicted     | points |
        | 70 % and 30 % | 70 % and 30 % | 100    |
        | 70 % and 30 % | 50 % and 50 % | 80     |
        | 70 % and 30 % | 30 % and 70 % | 60     |
        | 70 % and 30 % | 0 % and 100 % | 30     |

    Scenario: Points are rounded to a whole number
      Given 9 of the players voted the first dilemma, 6 for the first option and 3 for the second
      And "Ana" predicted 50 % and 50 %
      When the reveal is on the first dilemma
      Then "Ana" scores 83 points for the first dilemma

    @ui
    Scenario: Each player sees their own prediction and points in private
      Given "Ana" predicted 50 % and 50 % on the first dilemma
      When the reveal is on the first dilemma
      Then "Ana" sees a mark on each bar at the share she predicted
      And "Ana" sees the points she scored for the first dilemma
      And no other player receives the prediction or the points of "Ana"

    Scenario: Players who did not vote score nothing
      Given "Ana" did not vote the first dilemma
      When the reveal is on the first dilemma
      Then "Ana" scores no points for the first dilemma

    Scenario: The person in the gap scores for the distribution prediction
      Given "Ana" was chosen for the gap of the first dilemma
      And the other 9 players voted it, 6 for the first option and 3 for the second
      And "Ana" predicted 70 % and 30 %
      When the reveal is on the first dilemma
      Then "Ana" scores 97 points for the first dilemma

    Scenario: A player who joined late scores for the distribution prediction
      Given "Pedro" joined the game in the second round
      And "Pedro" voted the second dilemma and predicted its distribution
      When the reveal is on the second dilemma
      Then "Pedro" scores points for the second dilemma
      And "Pedro" is in the ranking of who reads the group best

    @ui
    Scenario: Ties in the ranking share the position
      Given "Ana" and "Luis" share the highest total of points and "Marta" has the next one
      When the ranking of who reads the group best is shown
      Then "Ana" and "Luis" share the first position
      And "Marta" is third

  Rule: Sharing a result

    Background:
      Given a room with players "Ana", "Luis", "Marta", "Sara" and "Nico"

    @ui @todo
    Scenario: A player shares the result of a catalog dilemma
      Given the first dilemma comes from the general catalog and was voted 4 to 1
      When "Luis" shares the result in the reveal
      Then the card shows the dilemma and the split as 80 % and 20 %
      And it shows no nickname
      And it shows nothing about how "Luis" voted

    @todo
    Scenario: The card of a catalog dilemma links to its public page
      Given the first dilemma comes from the general catalog and was voted 4 to 1
      When "Luis" shares the result in the reveal
      Then the card links to the public page of the first dilemma in the language of "Luis"

    @ui @todo
    Scenario: A dilemma with fewer than 5 votes cannot be shared
      Given only 4 players voted the first dilemma
      When the reveal is on the first dilemma
      Then no player is offered to share the result

    @ui @todo
    Scenario: The gap is shared without the nickname
      Given "Marta" was chosen for the gap of the first dilemma
      When "Luis" shares the result in the reveal
      Then the card says "alguien del grupo" instead of "Marta"

    @ui @todo
    Scenario: Only the author can share a private dilemma
      Given the first dilemma is a private dilemma of "Ana"
      When the reveal is on the first dilemma
      Then "Ana" is offered to share the result
      And "Luis" is not

    @ui @todo
    Scenario: The author's card lets others play the private dilemma
      Given the first dilemma is a private dilemma of "Ana"
      When "Ana" shares the result
      And someone outside the room opens the link on the card
      Then that person can create a room with that dilemma
      And the dilemma is still not in the catalog

    @ui @todo
    Scenario: The player chooses to show the vote on the result card
      When "Luis" turns on showing the vote before sharing
      Then the card marks the option "Luis" voted
