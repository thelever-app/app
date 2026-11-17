import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { bearer, composedHttpServer } from '../../support/room-server.ts';

/** The options of the dilemma of the seed that the public web links to, as the app reads them. */
async function optionsOf(server: Awaited<ReturnType<typeof composedHttpServer>>) {
  const { body } = await request(server)
    .get('/dilemmas/seed-trolley-public')
    .set('Authorization', bearer('ana'));
  return (body as { options: { optionId: string }[] }).options.map(({ optionId }) => optionId);
}

describe('POST /dilemmas/:publicId/vote', () => {
  it('should count the vote alone of the caller once, and answer already-voted the second time', async () => {
    // Arrange
    const server = await composedHttpServer();
    const [first, second] = await optionsOf(server);

    // Act
    const vote = await request(server)
      .post('/dilemmas/seed-trolley-public/vote')
      .set('Authorization', bearer('ana'))
      .send({ optionId: first });
    const again = await request(server)
      .post('/dilemmas/seed-trolley-public/vote')
      .set('Authorization', bearer('ana'))
      .send({ optionId: second });

    // Assert
    expect(vote.status).toBe(204);
    expect(again.status).toBe(409);
    expect(again.body).toEqual({ code: 'already-voted' });
  });

  it('should answer option-not-in-dilemma for an option the dilemma does not have', async () => {
    // Act
    const response = await request(await composedHttpServer())
      .post('/dilemmas/seed-trolley-public/vote')
      .set('Authorization', bearer('ana'))
      .send({ optionId: 'TestUnknownOption' });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'option-not-in-dilemma' });
  });

  it('should reject a request without a token', async () => {
    // Act
    const response = await request(await composedHttpServer())
      .post('/dilemmas/seed-trolley-public/vote')
      .send({ optionId: 'TestOption' });

    // Assert
    expect(response.status).toBe(401);
  });
});

describe('GET /dilemmas/:publicId/world-result', () => {
  it('should show no figures of a dilemma with fewer than 20 published answers', async () => {
    // Arrange
    const server = await composedHttpServer();
    const [first] = await optionsOf(server);

    // Act
    const response = await request(server)
      .get('/dilemmas/seed-trolley-public/world-result')
      .query({ option: first, prediction: '50' })
      .set('Authorization', bearer('ana'));

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ shown: false, answers: 0, needed: 20 });
  });

  it('should answer invalid-message for a prediction that is not a whole percentage', async () => {
    // Arrange
    const server = await composedHttpServer();
    const [first] = await optionsOf(server);

    // Act
    const response = await request(server)
      .get('/dilemmas/seed-trolley-public/world-result')
      .query({ option: first, prediction: '150' })
      .set('Authorization', bearer('ana'));

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'invalid-message' });
  });
});
