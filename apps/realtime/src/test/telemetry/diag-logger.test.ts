import { describe, expect, it } from 'vitest';
import { diagLogger } from '../../telemetry/telemetry.ts';

function recordingLogger() {
  const warnings: string[] = [];
  const errors: string[] = [];
  return {
    warnings,
    errors,
    logger: {
      info: () => {},
      warn: (message: string) => warnings.push(message),
      error: (message: string) => errors.push(message),
    },
  };
}

describe('diagLogger', () => {
  it('should leave out the attributes of other platforms the detector of Google Cloud cannot fill', () => {
    // Arrange
    const { logger, warnings } = recordingLogger();

    // Act
    diagLogger(logger).warn('dropping invalid resource attribute value for key "host.id"');

    // Assert
    expect(warnings).toEqual([]);
  });

  it('should pass on any other warning of the SDK', () => {
    // Arrange
    const { logger, warnings } = recordingLogger();

    // Act
    diagLogger(logger).warn('export took too long');

    // Assert
    expect(warnings).toEqual(['telemetry: export took too long']);
  });
});
