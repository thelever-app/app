import { describe, expect, it } from 'vitest';
import { Acceptances } from '../../entities/acceptances.ts';
import { NotCurrentVersionError } from '../../errors/not-current-version.error.ts';
import type { PublishedVersions } from '../../vos/legal-document.vo.ts';

const NOW = new Date('2026-11-19T10:00:00Z');
const FIRST: PublishedVersions = [
  { document: 'terms-of-use', version: 1, asksAgain: true },
  { document: 'game-consent', version: 1, asksAgain: true },
];

describe('Acceptances', () => {
  describe('pending', () => {
    it('should ask for the terms and then the game consent of who accepted nothing', () => {
      // Act & Assert
      expect(Acceptances.none('uid-ana').pending(FIRST)).toEqual(['terms-of-use', 'game-consent']);
    });

    it('should ask for nothing once the current versions are accepted', () => {
      // Arrange
      const acceptances = Acceptances.none('uid-ana');

      // Act
      acceptances.accept('terms-of-use', 1, FIRST, NOW);
      acceptances.accept('game-consent', 1, FIRST, NOW);

      // Assert
      expect(acceptances.pending(FIRST)).toEqual([]);
    });

    it('should ask again for a document whose new version asks to be accepted again', () => {
      // Arrange
      const acceptances = Acceptances.none('uid-ana');
      acceptances.accept('terms-of-use', 1, FIRST, NOW);
      acceptances.accept('game-consent', 1, FIRST, NOW);
      const later: PublishedVersions = [
        ...FIRST,
        { document: 'terms-of-use', version: 2, asksAgain: true },
      ];

      // Act & Assert
      expect(acceptances.pending(later)).toEqual(['terms-of-use']);
      expect(acceptances.changed(later)).toEqual(['terms-of-use']);
    });

    it('should not ask again for a new version that does not ask for it', () => {
      // Arrange
      const acceptances = Acceptances.none('uid-ana');
      acceptances.accept('terms-of-use', 1, FIRST, NOW);
      acceptances.accept('game-consent', 1, FIRST, NOW);
      const later: PublishedVersions = [
        ...FIRST,
        { document: 'game-consent', version: 2, asksAgain: false },
      ];

      // Act & Assert
      expect(acceptances.pending(later)).toEqual([]);
    });
  });

  describe('changed', () => {
    it('should not count as changed a document never accepted', () => {
      // Act & Assert
      expect(Acceptances.none('uid-ana').changed(FIRST)).toEqual([]);
    });
  });

  describe('accept', () => {
    it('should keep the version and when it was accepted', () => {
      // Arrange
      const acceptances = Acceptances.none('uid-ana');

      // Act
      acceptances.accept('game-consent', 1, FIRST, NOW);

      // Assert
      expect(acceptances.toSnapshot()).toEqual({
        identity: 'uid-ana',
        accepted: [{ document: 'game-consent', version: 1, acceptedAt: NOW }],
      });
    });

    it('should not accept a version that is not the current one', () => {
      // Arrange
      const acceptances = Acceptances.none('uid-ana');
      const later: PublishedVersions = [
        ...FIRST,
        { document: 'terms-of-use', version: 2, asksAgain: false },
      ];

      // Act & Assert
      expect(() => acceptances.accept('terms-of-use', 1, later, NOW)).toThrow(
        NotCurrentVersionError,
      );
      expect(() => acceptances.accept('terms-of-use', 3, later, NOW)).toThrow(
        NotCurrentVersionError,
      );
    });
  });
});
