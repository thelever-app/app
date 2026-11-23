/**
 * @thelever-app/integrations/identity
 *
 * What the Identity context gets from the other contexts: the personal data stores of each one,
 * on top of what it publishes (ADR 0001).
 */
export {
  analyticsPersonalData,
  consentPersonalData,
  dilemmasPersonalData,
  GameDataOfIdentityInGame,
  gamePersonalData,
  IdentitiesOfEmailInModeration,
  moderationPersonalData,
} from './personal-data-stores.ts';
