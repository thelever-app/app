import { fileURLToPath } from 'node:url';
import { missingFromImage } from '@thelever-app/config/images';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

describe('the image of the room server', () => {
  it('should copy every package of the workspace the room server needs to run', () => {
    // Act
    const missing = missingFromImage(ROOT, 'apps/realtime');

    // Assert
    expect(missing).toEqual([]);
  });
});
