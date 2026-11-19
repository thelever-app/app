/** The declared age cannot be changed, neither from the app nor through the API (RF-47). */
export class AgeAlreadyDeclaredError extends Error {
  constructor(identity: string) {
    super(`${identity} already declared an age, which cannot be changed`);
    this.name = 'AgeAlreadyDeclaredError';
  }
}
