/**
 * The identities that left that email in a notice of the web form: whoever writes from it proves
 * a request over the data of those identities is theirs, with no code.
 */
export interface IdentitiesOfEmail {
  identitiesOf(email: string): Promise<readonly string[]>;
}
