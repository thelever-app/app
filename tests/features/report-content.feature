Feature: Report content
  As a player or anyone who comes across TheLever content
  I want to report a dilemma or a nickname that is offensive, confusing or illegal
  So that the curation team can review it and I learn what was decided

  Rule: In a game

    Background:
      Given "Ana" hosts a room with "Luis" and "Marta"

    @ui
    Scenario Outline: A player reports a dilemma during the game
      Given the game is in the <phase>
      When "Luis" reports the current dilemma as "<reason>"
      Then an issue is created in the moderation repository with the id and text of the dilemma and the reason
      And the issue contains no data about "Luis"
      And "Luis" is told that the team will review it

      Examples:
        | phase          | reason           |
        | decision phase | offensive        |
        | reveal         | confusing        |
        | decision phase | badly translated |
        | reveal         | other            |

    Scenario: The comment of a report stays out of the issue
      When "Luis" reports the current dilemma with the comment "The question is ambiguous"
      Then the comment is stored with the report
      And the issue does not contain the comment

    @ui
    Scenario: A player can report a dilemma only once
      Given "Luis" has already reported the current dilemma
      Then "Luis" cannot report it again

    @ui
    Scenario: Reporting does not interrupt the game
      When "Luis" reports the current dilemma
      Then the game continues for everyone
      And "Ana" and "Marta" do not know about the report

    @ui @todo
    Scenario: A player reports a private dilemma
      Given the current dilemma is a private dilemma added in the lobby
      When "Luis" reports it as "offensive"
      Then an issue is created in the moderation repository with the id and text of the dilemma and the reason
      And nobody in the group knows about the report

    @ui
    Scenario Outline: A player reports a nickname from the avatar menu
      Given the room is in the <moment>
      When "Luis" opens the menu on the avatar of "Marta" and reports her nickname
      Then an issue is created in the moderation repository with the nickname and the reason
      And the issue contains no data about "Luis"
      And "Ana" and "Marta" do not know about the report

      Examples:
        | moment |
        | lobby  |
        | reveal |

  Rule: From the catalog

    Background:
      Given a player who has completed the first access

    @ui @todo
    Scenario: A player reports a dilemma from the catalog
      When the player reports a dilemma from its detail in the catalog
      Then an issue is created in the moderation repository with the id and text of the dilemma and the reason
      And the player is told that the team will review it

    @ui @todo
    Scenario: The detail of a dilemma links to the illegal content form
      When the player opens a dilemma in the catalog
      Then the player can open the web form to report illegal content

  Rule: From the web

    @ui
    Scenario: Anyone can send an illegal content notice without the app
      Given a person who does not use TheLever
      When the person sends the web form with the link to a catalog dilemma and why it is illegal
      Then the person gets an acknowledgement of receipt
      And an issue is created in the moderation repository with the id and text of the dilemma and the reason

    @ui
    Scenario: Name and email are optional in the web form
      When a person sends the web form without a name or an email
      Then the notice is accepted

    Scenario: A person who left an email gets the decision by email
      Given a person who sent an illegal content notice with an email
      When the team decides on the notice
      Then the person receives by email the decision, the rule applied and how to appeal

  Rule: Decisions on a report

    @ui
    Scenario: A player sees the decision on their report the next time they open the app
      Given "Luis" reported a dilemma as offensive
      And the team has withdrawn the dilemma
      When "Luis" opens the app
      Then "Luis" sees, only on his own screen, the decision, the rule applied, that a person decided it and how to appeal
      And the notice is not shown again
