import { SEED_DILEMMAS } from '@thelever-app/dilemmas/seed';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { bearer, composedHttpServer, ROOM_CHOICES } from '../../support/room-server.ts';

async function roomOfAna() {
  const server = await composedHttpServer();
  const { body } = await request(server)
    .post('/rooms')
    .set('Authorization', bearer('ana'))
    .send({ nickname: 'Ana', ...ROOM_CHOICES });
  return { server, roomId: body.roomId as string };
}

describe('GET /rooms/:roomId/dilemmas', () => {
  it('should show a player of the room the dilemmas of the catalog that suit it', async () => {
    // Arrange
    const { server, roomId } = await roomOfAna();
    const forEveryone = SEED_DILEMMAS.filter(({ minimumAge }) => minimumAge === 16);

    // Act
    const response = await request(server)
      .get(`/rooms/${roomId}/dilemmas`)
      .set('Authorization', bearer('ana'));

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.dilemmas.map(({ dilemmaId }: { dilemmaId: string }) => dilemmaId)).toEqual(
      forEveryone.map(({ id }) => id).sort(),
    );
  });

  it('should find only the dilemmas of the category and with every tag asked for', async () => {
    // Arrange
    const { server, roomId } = await roomOfAna();
    const [trolley] = SEED_DILEMMAS;

    // Act
    const response = await request(server)
      .get(`/rooms/${roomId}/dilemmas`)
      .query({ category: trolley!.category, tags: trolley!.tags.join(',') })
      .set('Authorization', bearer('ana'));

    // Assert
    expect(response.body).toEqual({
      dilemmas: [
        {
          dilemmaId: trolley!.id,
          text: trolley!.text,
          minimumAge: trolley!.minimumAge,
          category: trolley!.category,
          tags: trolley!.tags,
        },
      ],
    });
  });

  it('should answer player-not-in-room to someone who is not in the room', async () => {
    // Arrange
    const { server, roomId } = await roomOfAna();

    // Act
    const response = await request(server)
      .get(`/rooms/${roomId}/dilemmas`)
      .set('Authorization', bearer('stranger'));

    // Assert
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ code: 'player-not-in-room' });
  });

  it('should answer invalid-message to a criterion it does not know', async () => {
    // Arrange
    const { server, roomId } = await roomOfAna();

    // Act
    const response = await request(server)
      .get(`/rooms/${roomId}/dilemmas`)
      .query({ status: 'in-exploration' })
      .set('Authorization', bearer('ana'));

    // Assert
    expect(response.status).toBe(400);
  });
});
