import { describe, expect, it } from 'vitest';
import { Dilemma } from '../../entities/dilemma.ts';
import { DuplicateOptionError } from '../../errors/duplicate-option.error.ts';
import { IdMissingError } from '../../errors/id-missing.error.ts';
import { InvalidLanguageError } from '../../errors/invalid-language.error.ts';
import { OptionCountError } from '../../errors/option-count.error.ts';
import { TextMissingError } from '../../errors/text-missing.error.ts';
import { FixedIdGenerator } from '../support/fixed-id-generator.ts';

const DATA = {
  text: 'TestDilemmaText',
  language: 'es',
  options: ['TestOption1', 'TestOption2'],
};

function ids() {
  return new FixedIdGenerator('TestDilemmaId', 'TestOptionId1', 'TestOptionId2', 'TestOptionId3');
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
        text: 'TestDilemmaText',
        language: 'es',
        options: [
          { id: 'TestOptionId1', text: 'TestOption1' },
          { id: 'TestOptionId2', text: 'TestOption2' },
        ],
      });
    });
  });
});
