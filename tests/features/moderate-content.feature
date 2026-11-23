Feature: Moderate content
  As the curation team
  I want to review only the content that needs a human decision
  So that the catalog and the rooms stay safe without moderation becoming a bottleneck

  Background:
    Given a member of the curation team

  Scenario: Dilemmas created by the curation team go straight to the catalog
    When the team creates a dilemma
    Then the dilemma enters the general catalog without going through the exploration

  @todo
  Scenario: A dilemma of the curation team with few likes is flagged, not withdrawn
    Given a dilemma created by the curation team that 50 players have played
    And the lower bound of its share of likes is below the threshold
    Then an issue is created in the moderation repository
    And the dilemma stays in the general catalog until the team decides

  @todo
  Scenario: The team approves a dilemma by labelling its issue
    Given a public dilemma in review with an issue in the moderation repository
    When the team adds the label "approve" to the issue
    Then the dilemma enters the exploration of new dilemmas
    And its creator sees its status as "in exploration"

  @todo
  Scenario: The team rejects a dilemma with a statement of reasons
    Given a public dilemma in review
    When the team rejects it for breaking a rule of the terms of use and writes the facts in the issue
    Then the dilemma is not published
    And its creator sees the reason, the facts, the rule applied, that a person decided it and how to appeal

  @todo
  Scenario: A dilemma about someone in the group waits for a human decision
    Given a public dilemma with the gap "someone in the group" that passed the automatic filter
    Then an issue is created in the moderation repository
    And the dilemma stays in review until the team approves or rejects it

  Scenario: A dilemma is hidden automatically after several reports
    Given a dilemma that has received as many reports as the hiding threshold
    Then the dilemma is hidden from new games
    And an issue is created in the moderation repository

  Scenario: The team restores a hidden dilemma
    Given a dilemma hidden by reports
    When the team restores it
    Then the dilemma returns to the status it had before being hidden

  Scenario: The team withdraws a dilemma hidden by reports
    Given a dilemma hidden by reports
    When the team withdraws it
    Then the dilemma is not used in new games

  @todo
  Scenario: The creator of a dilemma hidden by reports sees its status
    Given a public dilemma of a player hidden by reports
    Then its creator sees its status as "hidden by reports"

  @todo
  Scenario: The team withdraws a dilemma of a player with a statement of reasons
    Given a public dilemma of a player hidden by reports
    When the team withdraws it
    Then its creator sees the reason, the facts, the rule applied, that a person decided it and how to appeal

  @todo
  Scenario: The team withdraws a reported private dilemma
    Given a private dilemma reported in a room
    When the team withdraws it
    Then its creator can no longer add it to any room
    And its creator sees the reason, the facts, the rule applied, that a person decided it and how to appeal

  @ui @screen
  Scenario: The team withdraws a reported nickname
    Given "Marta" is in an open room with a nickname that was reported
    When the team withdraws the nickname
    Then "Marta" is shown with a generic nickname in that room
    And the withdrawn nickname is no longer proposed to "Marta" when she joins a room
    And "Marta" sees the reason, the facts, the rule applied, that a person decided it and how to appeal the next time she opens the app

  @todo
  Scenario: The team blocks a creator with a statement of reasons
    Given a creator with public dilemmas
    When the team blocks the creator
    Then the creator cannot create dilemmas
    And the public dilemmas of the creator are kept
    And the creator can still play
    And the creator sees the reason, the facts, the rule applied, that a person decided it and how to appeal

  @todo
  Scenario: The team unblocks a creator
    Given a blocked creator
    When the team unblocks the creator
    Then the creator can create dilemmas again

  Scenario: Whoever reported is told the decision
    Given a dilemma reported by a player and by a web notice with an email
    When the team decides on it
    Then the player gets the decision the next time they open the app
    And the person who sent the web notice gets the decision by email
