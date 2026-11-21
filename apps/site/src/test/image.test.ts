import { fileURLToPath } from 'node:url';
import { missingFromImage } from '@thelever-app/config/images';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

describe('the image of the public web', () => {
  it('should copy every package of the workspace the public web needs to run', () => {
    // Act
    const missing = missingFromImage(ROOT, 'apps/site');

    // Assert
    expect(missing).toEqual([]);
  });
});
