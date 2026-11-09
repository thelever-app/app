import { describe, expect, it } from 'vitest';
import { SearchDilemmasQueryDto, SearchDilemmasResponseDto } from '../../http/search-dilemmas.ts';

describe('SearchDilemmasQueryDto', () => {
  it('should read a category and the text the player typed', () => {
    // Act
    const query = SearchDilemmasQueryDto.parse({ category: 'honesty', q: 'tranvía' });

    // Assert
    expect(query).toEqual({ category: 'honesty', q: 'tranvía' });
  });

  it('should reject a text longer than a player would type', () => {
    // Act & Assert
    expect(SearchDilemmasQueryDto.safeParse({ q: 'a'.repeat(101) }).success).toBe(false);
  });

  it('should accept no criteria at all', () => {
    // Act & Assert
    expect(SearchDilemmasQueryDto.parse({})).toEqual({});
  });

  it('should reject a criterion it does not know', () => {
    // Act & Assert
    expect(SearchDilemmasQueryDto.safeParse({ status: 'in-exploration' }).success).toBe(false);
  });
});

describe('SearchDilemmasResponseDto', () => {
  it('should carry what the lobby shows of each dilemma', () => {
    // Arrange
    const response = {
      dilemmas: [
        {
          dilemmaId: 'dilemma-1',
          text: 'Text of the first dilemma',
          minimumAge: 16,
          category: 'honesty',
          tags: ['family'],
          optionCount: 2,
        },
      ],
    };

    // Act & Assert
    expect(SearchDilemmasResponseDto.parse(response)).toEqual(response);
  });

  it('should reject a minimum age other than 16 or 18', () => {
    // Arrange
    const response = {
      dilemmas: [{ dilemmaId: 'd', text: 't', minimumAge: 12, category: 'honesty', tags: [] }],
    };

    // Act & Assert
    expect(SearchDilemmasResponseDto.safeParse(response).success).toBe(false);
  });
});
