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

  @ui @todo
  Scenario: The visitor votes in the app
    When a visitor chooses to vote on the public page of "El tranvía"
    Then the app opens on "El tranvía" ready to vote alone

  @todo
  Scenario: A vote alone counts for the world result
    When a visitor votes "El tranvía" alone in the app
    Then the vote counts for the world result of "El tranvía"
    And nobody can see what the visitor voted

  @ui @todo
  Scenario: Too few answers show no figures
    Given "La herencia" has 12 answers
    When a visitor votes "La herencia" alone in the app
    Then the visitor sees that there are still too few answers
    And sees no figures of the world result

  @ui @todo
  Scenario: A visitor under 18 cannot vote a dilemma for adults
    Given "La fiesta" has a minimum age of 18
    And the visitor is 17
    When a visitor opens the app to vote "La fiesta" alone
    Then the visitor sees that this dilemma is not for their age

  @ui @todo
  Scenario: A first-time visitor goes through the first access and comes back to the dilemma
    Given the visitor has never opened the app
    When a visitor chooses to vote on the public page of "El tranvía"
    Then the visitor goes through the first access
    And then sees "El tranvía" ready to vote alone

  @ui @todo
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
    Then a room is created whose first dilemma is "El tranvía"

  Scenario: A dilemma removed from the catalog loses its page
    Given "El tranvía" is removed from the catalog
    When the public pages are generated
    Then the address of its page answers that it no longer exists

  Scenario: A page without reviewed arguments is not indexed
    Given the dilemma "La herencia" is in the general catalog without reviewed arguments
    When the public pages are generated
    Then "La herencia" has a public page without arguments that search engines must not index
    And the sitemap does not include it

  Scenario: A page becomes indexable when its arguments are reviewed
    Given the dilemma "La herencia" is in the general catalog without reviewed arguments
    And the arguments of "La herencia" are reviewed
    When the public pages are generated
    Then the public page of "La herencia" shows its arguments and can be indexed
    And the sitemap includes it

  @ui @screen @todo
  Scenario: The page shows a banner ad below the content
    When a visitor opens the public page of "El tranvía"
    Then a banner ad appears below the arguments
