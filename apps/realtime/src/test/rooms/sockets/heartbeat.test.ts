import { describe, expect, it } from 'vitest';
import { PING_INTERVAL_MS } from '../../../rooms/sockets/heartbeat.ts';

describe('the heartbeat of the room sockets', () => {
  it('should show a player who lost the network as disconnected within 20 seconds', () => {
    // A socket is ended when it did not answer the previous ping: two intervals at most.
    expect(2 * PING_INTERVAL_MS).toBeLessThanOrEqual(20_000);
  });
});
