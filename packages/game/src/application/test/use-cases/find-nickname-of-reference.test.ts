import { describe, expect, it } from 'vitest';
import { FindNicknameOfReferenceUseCase } from '../../use-cases/find-nickname-of-reference.use-case.ts';
import { lobbyOfThree } from '../support/game-in-decision-phase.ts';

async function arrange() {
  const lobby = await lobbyOfThree();
  const { code } = (await lobby.roomRepository.findById(lobby.roomId))!;
  return { code, find: new FindNicknameOfReferenceUseCase(lobby.roomRepository) };
}

describe('FindNicknameOfReferenceUseCase', () => {
  it('should find the player of a room whose nickname the text names, with its code', async () => {
    // Arrange
    const { code, find } = await arrange();

    // Act
    const found = await find.execute(`Sala ${code.toLowerCase()}: el apodo marta es un insulto`);

    // Assert
    expect(found).toEqual({ nickname: 'Marta', owner: 'TestMartaIdentity' });
  });

  it('should find it in the link to join the room', async () => {
    // Arrange
    const { code, find } = await arrange();

    // Act
    const found = await find.execute(`https://thelever.app/?sala=${code} y el apodo «Luis»`);

    // Assert
    expect(found).toEqual({ nickname: 'Luis', owner: 'TestLuisIdentity' });
  });

  it.each([
    { case: 'no room has the code', text: () => 'Sala ZZZZZ, apodo Marta' },
    { case: 'no player of the room is named', text: (code: string) => `Sala ${code}, apodo Pepe` },
    { case: 'the name is only part of a word', text: (code: string) => `Sala ${code}, Martaxx` },
    {
      case: 'it names more than one player',
      text: (code: string) => `Sala ${code}: Marta insultó a Luis`,
    },
  ])('should find nobody when $case', async ({ text }) => {
    // Arrange
    const { code, find } = await arrange();

    // Act & Assert
    await expect(find.execute(text(code))).resolves.toBeNull();
  });
});
