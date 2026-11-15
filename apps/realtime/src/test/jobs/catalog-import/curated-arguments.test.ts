import { describe, expect, it } from 'vitest';
import { parseArguments } from '../../../jobs/catalog-import/curated-arguments.ts';

const OPTIONS = ['Se lo digo yo', 'No me meto'];

describe('parseArguments', () => {
  it('should read the arguments for and against each option, in the order of the options', () => {
    // Arrange
    const text = [
      'No me meto',
      'A favor: TestForB.',
      'En contra: TestAgainstB.',
      '',
      'Se lo digo yo',
      'A favor: TestForA.',
      'En contra: TestAgainstA.',
    ].join('\n');

    // Act
    const parsed = parseArguments(text, OPTIONS);

    // Assert
    expect(parsed).toEqual({
      options: [
        { for: 'TestForA.', against: 'TestAgainstA.' },
        { for: 'TestForB.', against: 'TestAgainstB.' },
      ],
    });
  });

  it('should read the context before the options', () => {
    // Arrange
    const text = [
      'Contexto: TestContext.',
      '',
      'Se lo digo yo',
      'A favor: TestForA.',
      'En contra: TestAgainstA.',
      '',
      'No me meto',
      'A favor: TestForB.',
      'En contra: TestAgainstB.',
    ].join('\n');

    // Act
    const parsed = parseArguments(text, OPTIONS);

    // Assert
    expect(parsed.context).toBe('TestContext.');
  });

  it('should ignore blank lines and spaces around the lines', () => {
    // Arrange
    const text =
      '\n  Se lo digo yo  \nA favor:  TestForA.\n\n En contra: TestAgainstA.\n\n\nNo me meto\nA favor: TestForB.\nEn contra: TestAgainstB.\n';

    // Act
    const parsed = parseArguments(text, OPTIONS);

    // Assert
    expect(parsed.options[0]).toEqual({ for: 'TestForA.', against: 'TestAgainstA.' });
  });

  it('should throw an error naming an option without arguments', () => {
    // Arrange
    const text = 'Se lo digo yo\nA favor: TestForA.\nEn contra: TestAgainstA.';

    // Act & Assert
    expect(() => parseArguments(text, OPTIONS)).toThrow('No me meto');
  });

  it('should throw an error naming an option without an argument against it', () => {
    // Arrange
    const text =
      'Se lo digo yo\nA favor: TestForA.\n\nNo me meto\nA favor: TestForB.\nEn contra: TestAgainstB.';

    // Act & Assert
    expect(() => parseArguments(text, OPTIONS)).toThrow('Se lo digo yo');
  });

  it('should throw an error for a heading that is not an option', () => {
    // Arrange
    const text = 'Otra cosa\nA favor: TestFor.\nEn contra: TestAgainst.';

    // Act & Assert
    expect(() => parseArguments(text, OPTIONS)).toThrow('Otra cosa');
  });
});
