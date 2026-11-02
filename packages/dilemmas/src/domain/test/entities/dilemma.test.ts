import { describe, expect, it } from 'vitest';
import { Dilemma, type DilemmaSnapshot } from '../../entities/dilemma.ts';
import { DuplicateOptionError } from '../../errors/duplicate-option.error.ts';
import { DuplicateTagError } from '../../errors/duplicate-tag.error.ts';
import { IdMissingError } from '../../errors/id-missing.error.ts';
import { InvalidLanguageError } from '../../errors/invalid-language.error.ts';
import { InvalidMinimumAgeError } from '../../errors/invalid-minimum-age.error.ts';
import { OptionCountError } from '../../errors/option-count.error.ts';
import { TagCountError } from '../../errors/tag-count.error.ts';
import { TextMissingError } from '../../errors/text-missing.error.ts';
import { UnknownCategoryError } from '../../errors/unknown-category.error.ts';
import { UnknownOptionError } from '../../errors/unknown-option.error.ts';
import { FixedIdGenerator } from '../support/fixed-id-generator.ts';

const DATA = {
  text: 'TestDilemmaText',
  language: 'es',
  options: ['TestOption1', 'TestOption2'],
  category: 'honesty',
  tags: ['testtag'],
  minimumAge: 16,
};

/** The content of the first version of the dilemma created from DATA, as `revise` takes it. */
const CONTENT = {
  text: 'TestDilemmaText',
  options: [
    { id: 'TestOptionId1', text: 'TestOption1' },
    { id: 'TestOptionId2', text: 'TestOption2' },
  ],
  category: 'honesty',
  tags: ['testtag'],
  minimumAge: 16,
};

function ids() {
  return new FixedIdGenerator('TestDilemmaId', 'TestOptionId1', 'TestOptionId2', 'TestOptionId3');
}

/** A dilemma of a player, which only the snapshot can build until players create dilemmas. */
function dilemmaOfAPlayer(): Dilemma {
  const snapshot = Dilemma.create(DATA, ids()).toSnapshot();
  return Dilemma.restore({
    ...snapshot,
    creator: { type: 'player', identity: 'TestAnaIdentity' },
    visibility: 'private',
    version: { ...snapshot.version, status: 'approved' },
  });
}

describe('Dilemma', () => {
  describe('create', () => {
    it('should have an id, its text, its language and its options with their own ids', () => {
      // Act
      const dilemma = Dilemma.create(DATA, ids());

      // Assert
      expect(dilemma.id).toBe('TestDilemmaId');
      expect(dilemma.text).toBe('TestDilemmaText');
      expect(dilemma.language).toBe('es');
      expect(dilemma.options).toEqual([
        { id: 'TestOptionId1', text: 'TestOption1' },
        { id: 'TestOptionId2', text: 'TestOption2' },
      ]);
    });

    it('should have its category, its tags and its minimum age', () => {
      // Act
      const dilemma = Dilemma.create(DATA, ids());

      // Assert
      expect(dilemma.category).toBe('honesty');
      expect(dilemma.tags).toEqual(['testtag']);
      expect(dilemma.minimumAge).toBe(16);
    });

    it('should be the first version, by the curation team, public and straight in the catalog', () => {
      // Act
      const dilemma = Dilemma.create(DATA, ids());

      // Assert
      expect(dilemma.version).toBe(1);
      expect(dilemma.creator).toEqual({ type: 'curation-team' });
      expect(dilemma.visibility).toBe('public');
      expect(dilemma.status).toBe('in-catalog');
    });

    it('should accept up to 4 options', () => {
      // Act
      const dilemma = Dilemma.create(
        { ...DATA, options: ['TestOption1', 'TestOption2', 'TestOption3', 'TestOption4'] },
        new FixedIdGenerator('TestDilemmaId', 'O1', 'O2', 'O3', 'O4'),
      );

      // Assert
      expect(dilemma.options).toHaveLength(4);
    });

    it('should trim the text and the options', () => {
      // Act
      const dilemma = Dilemma.create(
        { ...DATA, text: '  TestDilemmaText  ', options: [' TestOption1 ', 'TestOption2'] },
        ids(),
      );

      // Assert
      expect(dilemma.text).toBe('TestDilemmaText');
      expect(dilemma.options[0]?.text).toBe('TestOption1');
    });

    it('should throw an error if the text is missing', () => {
      // Act & Assert
      expect(() => Dilemma.create({ ...DATA, text: '   ' }, ids())).toThrow(TextMissingError);
    });

    it('should throw an error if an option has no text', () => {
      // Act & Assert
      expect(() => Dilemma.create({ ...DATA, options: ['TestOption1', ' '] }, ids())).toThrow(
        TextMissingError,
      );
    });

    it('should throw an error if it has fewer than 2 or more than 4 options', () => {
      // Act & Assert
      expect(() => Dilemma.create({ ...DATA, options: ['TestOption1'] }, ids())).toThrow(
        OptionCountError,
      );
      expect(() =>
        Dilemma.create(
          { ...DATA, options: ['A', 'B', 'C', 'D', 'E'] },
          new FixedIdGenerator('TestDilemmaId', 'O1', 'O2', 'O3', 'O4', 'O5'),
        ),
      ).toThrow(OptionCountError);
    });

    it('should throw an error if two options say the same', () => {
      // Act & Assert
      expect(() =>
        Dilemma.create({ ...DATA, options: ['TestOption1', ' TestOption1'] }, ids()),
      ).toThrow(DuplicateOptionError);
    });

    it('should throw an error if the language is not a language code', () => {
      // Act & Assert
      expect(() => Dilemma.create({ ...DATA, language: 'spanish' }, ids())).toThrow(
        InvalidLanguageError,
      );
    });

    it('should accept a language code with a region', () => {
      // Act & Assert
      expect(Dilemma.create({ ...DATA, language: 'pt-BR' }, ids()).language).toBe('pt-BR');
    });

    it('should throw an error if the id is missing', () => {
      // Act & Assert
      expect(() => Dilemma.create(DATA, new FixedIdGenerator('', 'O1', 'O2'))).toThrow(
        IdMissingError,
      );
    });

    it('should throw an error if the category is not in the list', () => {
      // Act & Assert
      expect(() => Dilemma.create({ ...DATA, category: 'family' }, ids())).toThrow(
        UnknownCategoryError,
      );
    });

    it('should tell whether a player under 18 may get it', () => {
      // Act & Assert
      expect(Dilemma.create(DATA, ids()).isSuitableForMinors()).toBe(true);
      expect(Dilemma.create({ ...DATA, minimumAge: 18 }, ids()).isSuitableForMinors()).toBe(false);
    });

    it('should throw an error if the minimum age is not 16 or 18', () => {
      // Act & Assert
      expect(() => Dilemma.create({ ...DATA, minimumAge: 12 }, ids())).toThrow(
        InvalidMinimumAgeError,
      );
    });

    it('should accept no tags and up to 5', () => {
      // Act & Assert
      expect(Dilemma.create({ ...DATA, tags: [] }, ids()).tags).toEqual([]);
      expect(
        Dilemma.create({ ...DATA, tags: ['t1', 't2', 't3', 't4', 't5'] }, ids()).tags,
      ).toHaveLength(5);
    });

    it('should throw an error if it has more than 5 tags', () => {
      // Act & Assert
      expect(() =>
        Dilemma.create({ ...DATA, tags: ['t1', 't2', 't3', 't4', 't5', 't6'] }, ids()),
      ).toThrow(TagCountError);
    });

    it('should throw an error if a tag is repeated, whatever its case', () => {
      // Act & Assert
      expect(() => Dilemma.create({ ...DATA, tags: ['familia', ' Familia'] }, ids())).toThrow(
        DuplicateTagError,
      );
    });
  });

  describe('revise', () => {
    it('should create the next version with the new content', () => {
      // Arrange
      const dilemma = Dilemma.create(DATA, ids());

      // Act
      dilemma.revise(
        {
          ...CONTENT,
          text: 'TestRevisedText',
          category: 'loyalty',
          tags: ['testothertag'],
          minimumAge: 18,
        },
        new FixedIdGenerator(),
      );

      // Assert
      expect(dilemma.version).toBe(2);
      expect(dilemma.text).toBe('TestRevisedText');
      expect(dilemma.category).toBe('loyalty');
      expect(dilemma.tags).toEqual(['testothertag']);
      expect(dilemma.minimumAge).toBe(18);
    });

    it('should keep the ids of the options it keeps and give new ids to the new ones', () => {
      // Arrange
      const dilemma = Dilemma.create(DATA, ids());

      // Act
      dilemma.revise(
        {
          ...CONTENT,
          options: [{ id: 'TestOptionId2', text: 'TestOption2' }, { text: 'TestOption3' }],
        },
        new FixedIdGenerator('TestOptionId3'),
      );

      // Assert
      expect(dilemma.options).toEqual([
        { id: 'TestOptionId2', text: 'TestOption2' },
        { id: 'TestOptionId3', text: 'TestOption3' },
      ]);
    });

    it('should keep the id of an option whose text changes', () => {
      // Arrange
      const dilemma = Dilemma.create(DATA, ids());

      // Act
      dilemma.revise(
        {
          ...CONTENT,
          options: [
            { id: 'TestOptionId1', text: 'TestOption1 fixed' },
            { id: 'TestOptionId2', text: 'TestOption2' },
          ],
        },
        new FixedIdGenerator(),
      );

      // Assert
      expect(dilemma.version).toBe(2);
      expect(dilemma.options[0]).toEqual({ id: 'TestOptionId1', text: 'TestOption1 fixed' });
    });

    it('should change nothing if the content is the same', () => {
      // Arrange
      const dilemma = Dilemma.create(DATA, ids());

      // Act
      dilemma.revise(
        { ...CONTENT, text: ' TestDilemmaText ', tags: ['TestTag'] },
        new FixedIdGenerator(),
      );

      // Assert
      expect(dilemma.version).toBe(1);
    });

    it('should leave a new version of the curation team straight in the catalog', () => {
      // Arrange
      const dilemma = Dilemma.create(DATA, ids());

      // Act
      dilemma.revise({ ...CONTENT, text: 'TestRevisedText' }, new FixedIdGenerator());

      // Assert
      expect(dilemma.status).toBe('in-catalog');
    });

    it('should leave a new version of a player in review', () => {
      // Arrange
      const dilemma = dilemmaOfAPlayer();

      // Act
      dilemma.revise({ ...CONTENT, text: 'TestRevisedText' }, new FixedIdGenerator());

      // Assert
      expect(dilemma.status).toBe('in-review');
      expect(dilemma.visibility).toBe('private');
    });

    it('should throw an error if it keeps an option the dilemma does not have', () => {
      // Arrange
      const dilemma = Dilemma.create(DATA, ids());

      // Act & Assert
      expect(() =>
        dilemma.revise(
          {
            ...CONTENT,
            options: [
              { id: 'TestOptionId1', text: 'TestOption1' },
              { id: 'TestUnknownOptionId', text: 'TestOption2' },
            ],
          },
          new FixedIdGenerator(),
        ),
      ).toThrow(UnknownOptionError);
    });

    it('should throw an error if it keeps the same option twice', () => {
      // Arrange
      const dilemma = Dilemma.create(DATA, ids());

      // Act & Assert
      expect(() =>
        dilemma.revise(
          {
            ...CONTENT,
            options: [
              { id: 'TestOptionId1', text: 'TestOption1' },
              { id: 'TestOptionId1', text: 'TestOption2' },
            ],
          },
          new FixedIdGenerator(),
        ),
      ).toThrow(DuplicateOptionError);
    });

    it('should leave the dilemma as it was when the new content is not valid', () => {
      // Arrange
      const dilemma = Dilemma.create(DATA, ids());
      const before = dilemma.toSnapshot();

      // Act
      expect(() =>
        dilemma.revise(
          { ...CONTENT, text: 'TestRevisedText', options: [{ text: 'TestOption3' }] },
          new FixedIdGenerator('TestOptionId3'),
        ),
      ).toThrow(OptionCountError);

      // Assert
      expect(dilemma.toSnapshot()).toEqual(before);
    });
  });

  describe('options', () => {
    it('should not let the options be changed from outside the dilemma', () => {
      // Arrange
      const dilemma = Dilemma.create(DATA, ids());

      // Act
      (dilemma.options as { id: string; text: string }[]).push({ id: 'X', text: 'X' });

      // Assert
      expect(dilemma.options).toHaveLength(2);
    });
  });

  describe('contentIn', () => {
    it('should return the text and the options in the language asked for', () => {
      // Arrange
      const dilemma = Dilemma.create(DATA, ids());

      // Act
      const content = dilemma.contentIn('es');

      // Assert
      expect(content).toEqual({
        text: 'TestDilemmaText',
        options: [
          { id: 'TestOptionId1', text: 'TestOption1' },
          { id: 'TestOptionId2', text: 'TestOption2' },
        ],
      });
    });

    it('should fall back to the original text when there is no translation', () => {
      // Arrange
      const dilemma = Dilemma.create(DATA, ids());

      // Act
      const content = dilemma.contentIn('de');

      // Assert
      expect(content.text).toBe('TestDilemmaText');
    });

    it('should throw an error if the language asked for is not a language code', () => {
      // Arrange
      const dilemma = Dilemma.create(DATA, ids());

      // Act & Assert
      expect(() => dilemma.contentIn('')).toThrow(InvalidLanguageError);
    });
  });

  describe('toSnapshot and restore', () => {
    it('should rebuild the dilemma from its snapshot', () => {
      // Arrange
      const dilemma = Dilemma.create(DATA, ids());

      // Act
      const restored = Dilemma.restore(dilemma.toSnapshot());

      // Assert
      expect(restored.toSnapshot()).toEqual({
        id: 'TestDilemmaId',
        language: 'es',
        creator: { type: 'curation-team' },
        visibility: 'public',
        version: {
          number: 1,
          text: 'TestDilemmaText',
          options: [
            { id: 'TestOptionId1', text: 'TestOption1' },
            { id: 'TestOptionId2', text: 'TestOption2' },
          ],
          category: 'honesty',
          tags: ['testtag'],
          minimumAge: 16,
          status: 'in-catalog',
        },
      } satisfies DilemmaSnapshot);
    });

    it('should rebuild a dilemma of a player at a later version', () => {
      // Arrange
      const dilemma = dilemmaOfAPlayer();
      dilemma.revise({ ...CONTENT, text: 'TestRevisedText' }, new FixedIdGenerator());

      // Act
      const restored = Dilemma.restore(dilemma.toSnapshot());

      // Assert
      expect(restored.toSnapshot()).toEqual(dilemma.toSnapshot());
      expect(restored.creator).toEqual({ type: 'player', identity: 'TestAnaIdentity' });
      expect(restored.version).toBe(2);
    });
  });
});
