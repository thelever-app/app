import { describe, expect, it } from 'vitest';
import { InMemorySealProvider, SEAL_BEFORE_FIRST_ACCESS } from '../in-memory-seal-provider.ts';

describe('InMemorySealProvider', () => {
  describe('sealFor', () => {
    it('should give the seal it was given for an identity', async () => {
      // Arrange
      const seal = {
        gameConsentVersion: 'TestGameConsentVersion',
        researchConsentVersion: 'TestResearchConsentVersion',
        commercialLicenceConsentVersion: null,
        underEighteen: false,
      };
      const provider = new InMemorySealProvider(new Map([['TestAnaIdentity', seal]]));

      // Act & Assert
      expect(await provider.sealFor('TestAnaIdentity')).toEqual(seal);
    });

    it('should give anyone else the seal of before the first access', async () => {
      // Arrange
      const provider = new InMemorySealProvider();

      // Act & Assert
      expect(await provider.sealFor('TestLuisIdentity')).toEqual(SEAL_BEFORE_FIRST_ACCESS);
    });
  });

  describe('SEAL_BEFORE_FIRST_ACCESS', () => {
    it('should have no optional consent and count the player as under 18, which protects them', () => {
      // Assert
      expect(SEAL_BEFORE_FIRST_ACCESS).toEqual({
        gameConsentVersion: '0',
        researchConsentVersion: null,
        commercialLicenceConsentVersion: null,
        underEighteen: true,
      });
    });
  });
});
