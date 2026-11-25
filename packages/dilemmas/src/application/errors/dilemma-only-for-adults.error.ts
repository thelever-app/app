/** Someone under 18 asked for a dilemma for adults, which they never see. */
export class DilemmaOnlyForAdultsError extends Error {
  readonly publicId: string;

  constructor(publicId: string) {
    super(`the dilemma ${publicId} is only for adults`);
    this.name = 'DilemmaOnlyForAdultsError';
    this.publicId = publicId;
  }
}
