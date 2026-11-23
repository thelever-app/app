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
import { UnknownDilemmaTypeError } from '../../errors/unknown-dilemma-type.error.ts';
import { UnknownScaleError } from '../../errors/unknown-scale.error.ts';
import { UnknownOptionError } from '../../errors/unknown-option.error.ts';
import { ArgumentsDoNotMatchOptionsError } from '../../errors/arguments-do-not-match-options.error.ts';
import { NotAnOriginalError } from '../../errors/not-an-original.error.ts';
import { NotItsOriginalError } from '../../errors/not-its-original.error.ts';
import { SameLanguageTranslationError } from '../../errors/same-language-translation.error.ts';
import { TranslationOptionCountError } from '../../errors/translation-option-count.error.ts';
import { FixedIdGenerator } from '../support/fixed-id-generator.ts';

const DATA = {
  text: 'TestDilemmaText',
  language: 'es',
  options: ['TestOption1', 'TestOption2'],
  category: 'honesty',
  tags: ['testtag'],
  minimumAge: 16,
  type: 'standard',
  compromising: false,
  scale: 'everyday',
  fixedOrder: false,
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
  type: 'standard',
  compromising: false,
  scale: 'everyday',
  fixedOrder: false,
};

function ids() {
  return new FixedIdGenerator(
    'TestDilemmaId',
    'TestOptionId1',
    'TestOptionId2',
    'TestOptionId3',
    'TestDilemmaPublicId',
  );
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

    it('should have its type, whether it is compromising, its scale and whether its options keep their order', () => {
      // Act
      const dilemma = Dilemma.create(
        { ...DATA, type: 'game-theory', compromising: true, scale: 'extreme', fixedOrder: true },
        ids(),
      );

      // Assert
      expect(dilemma.type).toBe('game-theory');
      expect(dilemma.compromising).toBe(true);
      expect(dilemma.scale).toBe('extreme');
      expect(dilemma.fixedOrder).toBe(true);
    });

    it('should throw an error if the type or the scale is not in its list', () => {
      // Act & Assert
      expect(() => Dilemma.create({ ...DATA, type: 'teoría de juegos' }, ids())).toThrow(
        UnknownDilemmaTypeError,
      );
      expect(() => Dilemma.create({ ...DATA, scale: 'extremo' }, ids())).toThrow(UnknownScaleError);
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
        new FixedIdGenerator('TestDilemmaId', 'O1', 'O2', 'O3', 'O4', 'TestDilemmaPublicId'),
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
          new FixedIdGenerator(
            'TestDilemmaId',
            'O1',
            'O2',
            'O3',
            'O4',
            'O5',
            'TestDilemmaPublicId',
          ),
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
      expect(() => Dilemma.create(DATA, new FixedIdGenerator('', 'O1', 'O2', 'PublicId'))).toThrow(
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

    it('should create the next version when only its type, compromising, scale or fixed order change', () => {
      // Arrange
      const changes = [
        { type: 'would-you-rather' },
        { compromising: true },
        { scale: 'medium' },
        { fixedOrder: true },
      ];

      for (const change of changes) {
        const dilemma = Dilemma.create(DATA, ids());

        // Act
        dilemma.revise({ ...CONTENT, ...change }, new FixedIdGenerator());

        // Assert
        expect(dilemma.version).toBe(2);
        expect(dilemma.toSnapshot().version).toMatchObject(change);
      }
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

  describe('translate', () => {
    const TRANSLATION = {
      language: 'en',
      text: 'TestTranslatedText',
      options: ['TestTranslatedOption1', 'TestTranslatedOption2'],
      tags: ['testtranslatedtag'],
    };

    function translationIds() {
      return new FixedIdGenerator(
        'TestTranslationId',
        'TestTranslationOptionId1',
        'TestTranslationOptionId2',
        'TestTranslationPublicId',
      );
    }

    it('should be a dilemma of its own in the other language, with its own ids', () => {
      // Arrange
      const original = Dilemma.create(DATA, ids());

      // Act
      const translation = Dilemma.translate(original, TRANSLATION, translationIds());

      // Assert
      expect(translation.id).toBe('TestTranslationId');
      expect(translation.language).toBe('en');
      expect(translation.version).toBe(1);
      expect(translation.text).toBe('TestTranslatedText');
      expect(translation.options).toEqual([
        { id: 'TestTranslationOptionId1', text: 'TestTranslatedOption1' },
        { id: 'TestTranslationOptionId2', text: 'TestTranslatedOption2' },
      ]);
      expect(translation.tags).toEqual(['testtranslatedtag']);
    });

    it('should translate the current version of its original, automatically', () => {
      // Arrange
      const original = Dilemma.create(DATA, ids());
      original.revise({ ...CONTENT, text: 'TestRevisedText' }, new FixedIdGenerator());

      // Act
      const translation = Dilemma.translate(original, TRANSLATION, translationIds());

      // Assert
      expect(translation.translationOf).toEqual({ dilemmaId: 'TestDilemmaId', version: 2 });
      expect(translation.translation).toBe('automatic');
      expect(original.translationOf).toBeUndefined();
      expect(original.translation).toBeUndefined();
    });

    it('should keep the classification, the creator and the visibility of its original', () => {
      // Arrange
      const original = Dilemma.create(
        {
          ...DATA,
          minimumAge: 18,
          type: 'game-theory',
          compromising: true,
          scale: 'medium',
          fixedOrder: true,
        },
        ids(),
      );

      // Act
      const translation = Dilemma.translate(original, TRANSLATION, translationIds());

      // Assert
      expect(translation.category).toBe('honesty');
      expect(translation.minimumAge).toBe(18);
      expect(translation.type).toBe('game-theory');
      expect(translation.compromising).toBe(true);
      expect(translation.scale).toBe('medium');
      expect(translation.fixedOrder).toBe(true);
      expect(translation.creator).toEqual({ type: 'curation-team' });
      expect(translation.visibility).toBe('public');
    });

    it('should leave a translation of the curation team straight in the catalog', () => {
      // Act
      const translation = Dilemma.translate(
        Dilemma.create(DATA, ids()),
        TRANSLATION,
        translationIds(),
      );

      // Assert
      expect(translation.status).toBe('in-catalog');
    });

    it('should leave a translation of a player in review', () => {
      // Act
      const translation = Dilemma.translate(dilemmaOfAPlayer(), TRANSLATION, translationIds());

      // Assert
      expect(translation.status).toBe('in-review');
      expect(translation.creator).toEqual({ type: 'player', identity: 'TestAnaIdentity' });
      expect(translation.visibility).toBe('private');
    });

    it('should throw an error if it does not have as many options as its original', () => {
      // Arrange
      const original = Dilemma.create(DATA, ids());

      // Act & Assert
      expect(() =>
        Dilemma.translate(
          original,
          {
            ...TRANSLATION,
            options: ['TestTranslatedOption1', 'TestTranslatedOption2', 'TestTranslatedOption3'],
          },
          new FixedIdGenerator('TestTranslationId', 'O1', 'O2', 'O3', 'TestTranslationPublicId'),
        ),
      ).toThrow(TranslationOptionCountError);
    });

    it('should throw an error if it is in the language of its original', () => {
      // Arrange
      const original = Dilemma.create(DATA, ids());

      // Act & Assert
      expect(() =>
        Dilemma.translate(original, { ...TRANSLATION, language: 'es' }, translationIds()),
      ).toThrow(SameLanguageTranslationError);
    });

    it('should throw an error if what it translates is a translation itself', () => {
      // Arrange
      const translation = Dilemma.translate(
        Dilemma.create(DATA, ids()),
        TRANSLATION,
        translationIds(),
      );

      // Act & Assert
      expect(() =>
        Dilemma.translate(
          translation,
          { ...TRANSLATION, language: 'fr' },
          new FixedIdGenerator('TestOtherId', 'O1', 'O2', 'TestOtherPublicId'),
        ),
      ).toThrow(NotAnOriginalError);
    });
  });

  describe('retranslate', () => {
    const TRANSLATION = {
      language: 'en',
      text: 'TestTranslatedText',
      options: ['TestTranslatedOption1', 'TestTranslatedOption2'],
      tags: [],
    };

    function translationOf(original: Dilemma): Dilemma {
      return Dilemma.translate(
        original,
        TRANSLATION,
        new FixedIdGenerator(
          'TestTranslationId',
          'TestTranslationOptionId1',
          'TestTranslationOptionId2',
          'TestTranslationPublicId',
        ),
      );
    }

    it('should create the next version translating the new version of its original', () => {
      // Arrange
      const original = Dilemma.create(DATA, ids());
      const translation = translationOf(original);
      original.revise(
        { ...CONTENT, text: 'TestRevisedText', minimumAge: 18, scale: 'extreme' },
        new FixedIdGenerator(),
      );

      // Act
      translation.retranslate(
        original,
        { ...TRANSLATION, text: 'TestRetranslatedText' },
        new FixedIdGenerator(),
      );

      // Assert
      expect(translation.version).toBe(2);
      expect(translation.text).toBe('TestRetranslatedText');
      expect(translation.minimumAge).toBe(18);
      expect(translation.scale).toBe('extreme');
      expect(translation.translationOf).toEqual({ dilemmaId: 'TestDilemmaId', version: 2 });
      expect(translation.translation).toBe('automatic');
    });

    it('should keep the id of the option in each position and give new ids to the new positions', () => {
      // Arrange
      const original = Dilemma.create(DATA, ids());
      const translation = translationOf(original);
      original.revise(
        { ...CONTENT, options: [...CONTENT.options, { text: 'TestOption3' }] },
        new FixedIdGenerator('TestOptionId3'),
      );

      // Act
      translation.retranslate(
        original,
        {
          ...TRANSLATION,
          options: ['TestTranslatedOption1', 'TestTranslatedOption2', 'TestTranslatedOption3'],
        },
        new FixedIdGenerator('TestTranslationOptionId3'),
      );

      // Assert
      expect(translation.options.map(({ id }) => id)).toEqual([
        'TestTranslationOptionId1',
        'TestTranslationOptionId2',
        'TestTranslationOptionId3',
      ]);
    });

    it('should change nothing if its original has no new version', () => {
      // Arrange
      const original = Dilemma.create(DATA, ids());
      const translation = translationOf(original);

      // Act
      translation.retranslate(
        original,
        { ...TRANSLATION, text: 'TestRetranslatedText' },
        new FixedIdGenerator(),
      );

      // Assert
      expect(translation.version).toBe(1);
      expect(translation.text).toBe('TestTranslatedText');
    });

    it('should throw an error if the dilemma given is not its original', () => {
      // Arrange
      const translation = translationOf(Dilemma.create(DATA, ids()));
      const other = Dilemma.create(
        DATA,
        new FixedIdGenerator('TestOtherId', 'O1', 'O2', 'TestOtherPublicId'),
      );

      // Act & Assert
      expect(() => translation.retranslate(other, TRANSLATION, new FixedIdGenerator())).toThrow(
        NotItsOriginalError,
      );
    });

    it('should throw an error if the dilemma is not a translation', () => {
      // Arrange
      const original = Dilemma.create(DATA, ids());

      // Act & Assert
      expect(() => original.retranslate(original, TRANSLATION, new FixedIdGenerator())).toThrow(
        NotItsOriginalError,
      );
    });
  });

  describe('hasTheWordingOf', () => {
    it('should be true when only the classification changes', () => {
      // Arrange
      const dilemma = Dilemma.create(DATA, ids());
      const earlier = Dilemma.restore(dilemma.toSnapshot());
      dilemma.revise(
        { ...CONTENT, category: 'loyalty', minimumAge: 18, type: 'would-you-rather' },
        new FixedIdGenerator(),
      );

      // Act & Assert
      expect(dilemma.hasTheWordingOf(earlier)).toBe(true);
    });

    it('should be true when it is left without tags', () => {
      // Arrange
      const dilemma = Dilemma.create(DATA, ids());
      const earlier = Dilemma.restore(dilemma.toSnapshot());
      dilemma.revise({ ...CONTENT, tags: [] }, new FixedIdGenerator());

      // Act & Assert
      expect(dilemma.hasTheWordingOf(earlier)).toBe(true);
    });

    it('should be false when its text, an option or its tags read differently', () => {
      // Arrange
      const changes = [
        { text: 'TestRevisedText' },
        { options: [CONTENT.options[0]!, { id: 'TestOptionId2', text: 'TestRevisedOption' }] },
        { options: [...CONTENT.options, { text: 'TestOption3' }] },
        { tags: ['testothertag'] },
      ];

      for (const change of changes) {
        const dilemma = Dilemma.create(DATA, ids());
        const earlier = Dilemma.restore(dilemma.toSnapshot());
        dilemma.revise({ ...CONTENT, ...change }, new FixedIdGenerator('TestOptionId3'));

        // Act & Assert
        expect(dilemma.hasTheWordingOf(earlier)).toBe(false);
      }
    });
  });

  describe('follow', () => {
    const TRANSLATION = {
      language: 'en',
      text: 'TestTranslatedText',
      options: ['TestTranslatedOption1', 'TestTranslatedOption2'],
      tags: ['testtranslatedtag'],
    };

    function translationOf(original: Dilemma): Dilemma {
      return Dilemma.translate(
        original,
        TRANSLATION,
        new FixedIdGenerator(
          'TestTranslationId',
          'TestTranslationOptionId1',
          'TestTranslationOptionId2',
          'TestTranslationPublicId',
        ),
      );
    }

    it('should create the next version with the classification of its original and its own wording', () => {
      // Arrange
      const original = Dilemma.create(DATA, ids());
      const translation = translationOf(original);
      original.revise(
        {
          ...CONTENT,
          category: 'loyalty',
          minimumAge: 18,
          type: 'game-theory',
          compromising: true,
          scale: 'extreme',
          fixedOrder: true,
        },
        new FixedIdGenerator(),
      );

      // Act
      translation.follow(original);

      // Assert
      expect(translation.version).toBe(2);
      expect(translation.text).toBe('TestTranslatedText');
      expect(translation.options).toEqual([
        { id: 'TestTranslationOptionId1', text: 'TestTranslatedOption1' },
        { id: 'TestTranslationOptionId2', text: 'TestTranslatedOption2' },
      ]);
      expect(translation.tags).toEqual(['testtranslatedtag']);
      expect(translation.toSnapshot().version).toMatchObject({
        category: 'loyalty',
        minimumAge: 18,
        type: 'game-theory',
        compromising: true,
        scale: 'extreme',
        fixedOrder: true,
        translationOf: { dilemmaId: 'TestDilemmaId', version: 2 },
        translation: 'automatic',
        status: 'in-catalog',
      });
    });

    it('should be left without tags when its original has none', () => {
      // Arrange
      const original = Dilemma.create(DATA, ids());
      const translation = translationOf(original);
      original.revise({ ...CONTENT, tags: [] }, new FixedIdGenerator());

      // Act
      translation.follow(original);

      // Assert
      expect(translation.tags).toEqual([]);
    });

    it('should keep its arguments, which still argue the same options', () => {
      // Arrange
      const original = Dilemma.create(DATA, ids());
      const translation = translationOf(original);
      translation.argue({
        options: [
          { optionId: 'TestTranslationOptionId1', for: 'TestFor', against: 'TestAgainst' },
          { optionId: 'TestTranslationOptionId2', for: 'TestFor', against: 'TestAgainst' },
        ],
      });
      original.revise({ ...CONTENT, scale: 'medium' }, new FixedIdGenerator());

      // Act
      translation.follow(original);

      // Assert
      expect(translation.version).toBe(2);
      expect(translation.arguments?.options).toHaveLength(2);
    });

    it('should change nothing if its original has no new version', () => {
      // Arrange
      const original = Dilemma.create(DATA, ids());
      const translation = translationOf(original);

      // Act
      translation.follow(original);

      // Assert
      expect(translation.version).toBe(1);
    });

    it('should throw an error if the dilemma given is not its original', () => {
      // Arrange
      const translation = translationOf(Dilemma.create(DATA, ids()));
      const other = Dilemma.create(
        DATA,
        new FixedIdGenerator('TestOtherId', 'O1', 'O2', 'TestOtherPublicId'),
      );

      // Act & Assert
      expect(() => translation.follow(other)).toThrow(NotItsOriginalError);
    });

    it('should throw an error if its original no longer has as many options', () => {
      // Arrange
      const original = Dilemma.create(DATA, ids());
      const translation = translationOf(original);
      original.revise(
        { ...CONTENT, options: [...CONTENT.options, { text: 'TestOption3' }] },
        new FixedIdGenerator('TestOptionId3'),
      );

      // Act & Assert
      expect(() => translation.follow(original)).toThrow(TranslationOptionCountError);
    });
  });

  describe('withdraw', () => {
    it('should take the dilemma out of new games', () => {
      // Arrange
      const dilemma = Dilemma.create(DATA, ids());

      // Act
      dilemma.withdraw();

      // Assert
      expect(dilemma.status).toBe('withdrawn');
      expect(dilemma.version).toBe(1);
    });
  });

  describe('reinstate', () => {
    it('should bring a withdrawn dilemma of the curation team back to the catalog, at the same version', () => {
      // Arrange
      const dilemma = Dilemma.create(DATA, ids());
      dilemma.withdraw();

      // Act
      dilemma.reinstate();

      // Assert
      expect(dilemma.status).toBe('in-catalog');
      expect(dilemma.version).toBe(1);
    });

    it('should leave a withdrawn dilemma of a player in review', () => {
      // Arrange
      const dilemma = dilemmaOfAPlayer();
      dilemma.withdraw();

      // Act
      dilemma.reinstate();

      // Assert
      expect(dilemma.status).toBe('in-review');
    });

    it('should change nothing in a dilemma that is not withdrawn', () => {
      // Arrange
      const dilemma = dilemmaOfAPlayer();

      // Act
      dilemma.reinstate();

      // Assert
      expect(dilemma.status).toBe('approved');
    });
  });

  describe('canBeRead', () => {
    it('should be readable while nothing has taken it out', () => {
      // Arrange
      const dilemma = Dilemma.create(DATA, ids());
      const withdrawn = Dilemma.create(DATA, ids());
      withdrawn.withdraw();

      // Act & Assert
      expect(dilemma.canBeRead()).toBe(true);
      expect(withdrawn.canBeRead()).toBe(false);
      expect(dilemmaOfAPlayer().canBeRead()).toBe(true);
      for (const status of ['in-review', 'rejected', 'hidden-by-reports'] as const) {
        const snapshot = dilemma.toSnapshot();
        expect(
          Dilemma.restore({ ...snapshot, version: { ...snapshot.version, status } }).canBeRead(),
        ).toBe(false);
      }
    });
  });

  describe('rename', () => {
    it('should change the name without a new version', () => {
      // Arrange
      const dilemma = Dilemma.create({ ...DATA, name: 'TestName' }, ids());

      // Act
      dilemma.rename(' TestOtherName ');

      // Assert
      expect(dilemma.name).toBe('TestOtherName');
      expect(dilemma.version).toBe(1);
    });

    it('should have no name unless it is given one', () => {
      // Act & Assert
      expect(Dilemma.create(DATA, ids()).name).toBeUndefined();
    });
  });

  describe('argue', () => {
    const ARGUMENTS = {
      context: 'TestContext',
      options: [
        { optionId: 'TestOptionId1', for: 'TestFor1', against: 'TestAgainst1' },
        { optionId: 'TestOptionId2', for: 'TestFor2', against: 'TestAgainst2' },
      ],
    };

    it('should give the current version its arguments without a new version', () => {
      // Arrange
      const dilemma = Dilemma.create(DATA, ids());

      // Act
      dilemma.argue(ARGUMENTS);

      // Assert
      expect(dilemma.arguments).toEqual(ARGUMENTS);
      expect(dilemma.version).toBe(1);
    });

    it('should accept arguments without a context', () => {
      // Arrange
      const dilemma = Dilemma.create(DATA, ids());

      // Act
      dilemma.argue({ options: ARGUMENTS.options });

      // Assert
      expect(dilemma.arguments?.context).toBeUndefined();
    });

    it('should leave a new version without the arguments of the previous one', () => {
      // Arrange
      const dilemma = Dilemma.create(DATA, ids());
      dilemma.argue(ARGUMENTS);

      // Act
      dilemma.revise({ ...CONTENT, text: 'TestRevisedText' }, new FixedIdGenerator());

      // Assert
      expect(dilemma.arguments).toBeUndefined();
    });

    it('should throw an error if an option has no arguments or an unknown one has', () => {
      // Arrange
      const dilemma = Dilemma.create(DATA, ids());

      // Act & Assert
      expect(() => dilemma.argue({ options: ARGUMENTS.options.slice(0, 1) })).toThrow(
        ArgumentsDoNotMatchOptionsError,
      );
      expect(() =>
        dilemma.argue({
          options: [
            ARGUMENTS.options[0]!,
            { optionId: 'TestUnknownOptionId', for: 'F', against: 'A' },
          ],
        }),
      ).toThrow(ArgumentsDoNotMatchOptionsError);
    });

    it('should drop the arguments of the current version without a new version', () => {
      // Arrange
      const dilemma = Dilemma.create(DATA, ids());
      dilemma.argue(ARGUMENTS);

      // Act
      dilemma.dropArguments();

      // Assert
      expect(dilemma.arguments).toBeUndefined();
      expect(dilemma.version).toBe(1);
    });

    it('should throw an error if an argument is empty', () => {
      // Arrange
      const dilemma = Dilemma.create(DATA, ids());

      // Act & Assert
      expect(() =>
        dilemma.argue({
          options: [{ ...ARGUMENTS.options[0]!, against: ' ' }, ARGUMENTS.options[1]!],
        }),
      ).toThrow(TextMissingError);
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

  describe('toSnapshot and restore', () => {
    it('should rebuild the dilemma from its snapshot', () => {
      // Arrange
      const dilemma = Dilemma.create(
        DATA,
        new FixedIdGenerator(
          'TestDilemmaId',
          'TestOptionId1',
          'TestOptionId2',
          'TestDilemmaPublicId',
        ),
      );

      // Act
      const restored = Dilemma.restore(dilemma.toSnapshot());

      // Assert
      expect(restored.toSnapshot()).toEqual({
        id: 'TestDilemmaId',
        publicId: 'TestDilemmaPublicId',
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
          type: 'standard',
          compromising: false,
          scale: 'everyday',
          fixedOrder: false,
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

    it('should rebuild a translation with its name and its arguments', () => {
      // Arrange
      const translation = Dilemma.translate(
        Dilemma.create(DATA, ids()),
        {
          language: 'en',
          name: 'TestName',
          text: 'TestText',
          options: ['TestA', 'TestB'],
          tags: [],
        },
        new FixedIdGenerator('TestTranslationId', 'TestA', 'TestB', 'TestTranslationPublicId'),
      );
      translation.argue({
        options: [
          { optionId: 'TestA', for: 'TestFor', against: 'TestAgainst' },
          { optionId: 'TestB', for: 'TestFor', against: 'TestAgainst' },
        ],
      });

      // Act
      const restored = Dilemma.restore(translation.toSnapshot());

      // Assert
      expect(restored.toSnapshot()).toEqual(translation.toSnapshot());
      expect(restored.name).toBe('TestName');
      expect(restored.translationOf).toEqual({ dilemmaId: 'TestDilemmaId', version: 1 });
      expect(restored.arguments?.options).toHaveLength(2);
    });
  });
});

describe('Dilemma moderated', () => {
  it('should be hidden by reports, out of reach of players', () => {
    // Arrange
    const dilemma = Dilemma.create(DATA, ids());

    // Act
    dilemma.hideByReports();

    // Assert
    expect(dilemma.status).toBe('hidden-by-reports');
    expect(dilemma.canBeRead()).toBe(false);
    expect(dilemma.toSnapshot().moderation).toEqual({
      by: 'hidden-by-reports',
      statusBefore: 'in-catalog',
    });
  });

  it('should be back at the status it had once the team keeps it', () => {
    // Arrange
    const dilemma = dilemmaOfAPlayer();
    dilemma.hideByReports();

    // Act
    dilemma.restoreAfterReports();

    // Assert
    expect(dilemma.status).toBe('approved');
    expect(dilemma.moderation).toBeUndefined();
  });

  it('should stay withdrawn when the team withdraws it, whatever loading the catalog says', () => {
    // Arrange
    const dilemma = Dilemma.create(DATA, ids());
    dilemma.hideByReports();
    dilemma.withdrawByModeration();

    // Act
    dilemma.reinstate();
    dilemma.restoreAfterReports();

    // Assert
    expect(dilemma.status).toBe('withdrawn');
    expect(dilemma.moderation?.by).toBe('withdrawn');
  });

  it('should keep a new version out of new games too', () => {
    // Arrange
    const dilemma = Dilemma.create(DATA, ids());
    dilemma.hideByReports();

    // Act
    dilemma.revise({ ...CONTENT, text: 'TestRevisedText' }, new FixedIdGenerator());

    // Assert
    expect(dilemma.version).toBe(2);
    expect(dilemma.status).toBe('hidden-by-reports');
    dilemma.restoreAfterReports();
    expect(dilemma.status).toBe('in-catalog');
  });

  it('should be hidden once: a second hiding keeps the status it had first', () => {
    // Arrange
    const dilemma = Dilemma.create(DATA, ids());
    dilemma.hideByReports();

    // Act
    dilemma.hideByReports();
    dilemma.restoreAfterReports();

    // Assert
    expect(dilemma.status).toBe('in-catalog');
  });

  it('should stay hidden when the catalog withdraws it, and be withdrawn once the team keeps it', () => {
    // Arrange
    const dilemma = Dilemma.create(DATA, ids());
    dilemma.hideByReports();

    // Act
    dilemma.withdraw();

    // Assert
    expect(dilemma.status).toBe('hidden-by-reports');
    dilemma.restoreAfterReports();
    expect(dilemma.status).toBe('withdrawn');
  });

  it('should come back to the catalog when the catalog approves it again while hidden', () => {
    // Arrange
    const dilemma = Dilemma.create(DATA, ids());
    dilemma.hideByReports();
    dilemma.withdraw();

    // Act
    dilemma.reinstate();
    dilemma.restoreAfterReports();

    // Assert
    expect(dilemma.status).toBe('in-catalog');
  });

  it('should give back the moderation it was restored with', () => {
    // Arrange
    const dilemma = Dilemma.create(DATA, ids());
    dilemma.withdrawByModeration();

    // Act
    const restored = Dilemma.restore(dilemma.toSnapshot());

    // Assert
    expect(restored.toSnapshot()).toEqual(dilemma.toSnapshot());
  });
});
