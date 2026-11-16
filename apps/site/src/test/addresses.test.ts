import { describe, expect, it } from 'vitest';
import { dilemmaPath, numberIn, slug } from '../addresses.ts';

describe('slug', () => {
  it('should write a text in lowercase, without accents and with hyphens between the words', () => {
    // Act & Assert
    expect(slug('El dilema del tranvía: ¿tirarías de la palanca?')).toBe(
      'el-dilema-del-tranvia-tirarias-de-la-palanca',
    );
    expect(slug('Vida i mort · L’herència')).toBe('vida-i-mort-l-herencia');
  });
});

describe('dilemmaPath', () => {
  it('should put the dilemma under its category, with its name and its number', () => {
    // Act & Assert
    expect(dilemmaPath('es', 'Vida y muerte', 'La palanca', 12)).toBe(
      '/es/vida-y-muerte/la-palanca-12',
    );
  });
});

describe('numberIn', () => {
  it('should find the number at the end of the address of a dilemma, whatever its name', () => {
    // Act & Assert
    expect(numberIn('/es/vida-y-muerte/un-nombre-viejo-12')).toBe(12);
    expect(numberIn('/es/vida-y-muerte/')).toBeUndefined();
    expect(numberIn('/es/vida-y-muerte/sin-numero')).toBeUndefined();
  });
});
