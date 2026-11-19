export class InvalidDeclaredAgeError extends Error {
  constructor(birthYear: number, birthMonth: number | null) {
    super(
      `${birthMonth === null ? birthYear : `${birthMonth}/${birthYear}`} is not a date of birth`,
    );
    this.name = 'InvalidDeclaredAgeError';
  }
}
