Feature: Public dilemma pages
  As someone looking for moral dilemmas on the web
  I want to find a dilemma, read it with its arguments and play it
  So that I can discover TheLever and try it with my group

  Background:
    Given the dilemma "El tranvía" is in the general catalog
    And "El tranvía" has reviewed arguments

  @ui
  Scenario: Each catalog dilemma has a public page in each language
    When the public pages are generated
    Then "El tranvía" has a public page in each language of the app
    And each version links to the others

  Scenario Outline: Only the general catalog gets public pages
    Given the dilemma "<dilemma>" is <kind>
    When the public pages are generated
    Then "<dilemma>" has no public page

    Examples:
      | dilemma   | kind                     |
      | Mi jefe   | a private dilemma        |
      | Nuevo     | a dilemma in exploration |
      | La fiesta | a dilemma for adults     |

  Scenario: A compromising dilemma has no public page
    Given the dilemma "Los mensajes" is a compromising dilemma
    When the public pages are generated
    Then "Los mensajes" has no public page

  @ui
  Scenario: The page shows the dilemma and its arguments
    When a visitor opens the public page of "El tranvía"
    Then the visitor sees the dilemma, its options and the arguments for and against each option
    And the visitor does not see who created it

  @ui
  Scenario: The world result is not shown before voting
    Given "El tranvía" has more than 20 answers
    When a visitor opens its public page
    Then the visitor does not see how the world voted

  @ui
  Scenario: The visitor votes in the app
    When a visitor chooses to vote on the public page of "El tranvía"
    Then the app opens on "El tranvía" ready to vote alone

  Scenario: A vote alone counts for the world result
    When a visitor votes "El tranvía" alone in the app
    Then the vote counts for the world result of "El tranvía"
    And nobody can see what the visitor voted

  @ui
  Scenario: Too few answers show no figures
    Given "La herencia" has 12 answers
    When a visitor votes "La herencia" alone in the app
    Then the visitor sees that there are still too few answers
    And sees no figures of the world result

  @ui
  Scenario: A dilemma for adults cannot be voted alone from a link
    Given the dilemma "La fiesta" is a dilemma for adults
    When a visitor opens the app to vote "La fiesta" alone
    Then the visitor sees that the dilemma is not available

  @ui
  Scenario: A first-time visitor goes through the first access and comes back to the dilemma
    Given the visitor has never opened the app
    When a visitor chooses to vote on the public page of "El tranvía"
    Then the visitor goes through the first access
    And then sees "El tranvía" ready to vote alone

  @ui
  Scenario: The app opens in the language of the page
    Given the visitor has never chosen a language in the app
    When a visitor chooses to play "El tranvía" with the group from its public page in English
    Then the app opens in English

  @ui
  Scenario: The visitor switches the language of the page
    When a visitor chooses English in the language menu of the public page of "El tranvía"
    Then the visitor sees the public page of "El tranvía" in English

  @ui
  Scenario: The visitor plays it with the group
    When a visitor chooses to play "El tranvía" with the group
    And creates the room
    Then before creating it, the visitor sees that the game starts with "El tranvía"
    And a room is created whose round 1 is the specific dilemma "El tranvía"

  @ui
  Scenario: A link opens a room that starts with a dilemma for adults
    Given the dilemma "La fiesta" is a dilemma for adults
    When a visitor opens the link to play "La fiesta" with the group
    And creates the room
    Then a room is created whose round 1 is the specific dilemma "La fiesta"

  @ui @screen
  Scenario: Spicy comes chosen for a dilemma for adults
    Given the dilemma "La fiesta" is a dilemma for adults
    When a visitor opens the link to play "La fiesta" with the group
    Then the ambience "Spicy" is chosen

  @ui @screen
  Scenario: Classic leaves a dilemma for adults out of the room
    Given the dilemma "La fiesta" is a dilemma for adults
    And a visitor opens the link to play "La fiesta" with the group
    When the visitor chooses the ambience "Classic" and creates the room
    Then the visitor saw that "La fiesta" does not fit a Classic room
    And the room has 8 random rounds from every category

  @ui
  Scenario: A player under 18 does not see a dilemma for adults from its link
    Given the dilemma "La fiesta" is a dilemma for adults
    And a player who declared a birth year that makes them 17
    When the player opens the link to play "La fiesta" with the group
    Then the player is told the dilemma is only for people 18 or over
    And does not see the text of "La fiesta"

  Scenario: A compromising dilemma cannot be played from a link
    Given the dilemma "Los mensajes" is a compromising dilemma
    When a visitor opens the link to play "Los mensajes" with the group
    Then the visitor sees that the dilemma is not available

  Scenario: A dilemma removed from the catalog loses its page
    Given "El tranvía" is removed from the catalog
    When the public pages are generated
    Then the address of its page answers that it no longer exists

  Scenario: A dilemma without reviewed arguments has no public page
    Given the dilemma "La herencia" is in the general catalog without reviewed arguments
    When the public pages are generated
    Then "La herencia" has no public page
    And the sitemap does not include it

  Scenario: A dilemma gets its public page when its arguments are reviewed
    Given the dilemma "La herencia" is in the general catalog without reviewed arguments
    And the arguments of "La herencia" are reviewed
    When the public pages are generated
    Then the public page of "La herencia" shows its arguments and can be indexed
    And the sitemap includes it

  @ui @screen
  Scenario: The page shows a banner ad below the content
    When a visitor opens the public page of "El tranvía"
    Then a banner ad appears below the arguments

  @ui
  Scenario: Every public page links to the donation page
    When a visitor opens any public page
    Then the footer has a link to support TheLever with a donation

  @ui
  Scenario: The home page invites visitors to support TheLever
    When a visitor opens the home page
    Then a block before the footer invites them to support TheLever with a donation

  @ui
  Scenario: A dilemma page invites visitors to support TheLever after the arguments
    When a visitor opens the public page of "El tranvía"
    Then a line after the arguments invites them to support TheLever with a donation
