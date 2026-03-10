import assert from 'node:assert';
import { test, describe, beforeEach, afterEach } from 'node:test';
import { generateSheetMusic } from './geminiService.ts';

describe('generateSheetMusic', () => {
  let originalApiKey: string | undefined;

  beforeEach(() => {
    originalApiKey = process.env.API_KEY;
  });

  afterEach(() => {
    if (originalApiKey !== undefined) {
      process.env.API_KEY = originalApiKey;
    } else {
      delete process.env.API_KEY;
    }
  });

  test('should throw an error if API_KEY is not defined', async () => {
    delete process.env.API_KEY;

    await assert.rejects(
      async () => {
        await generateSheetMusic(1, 'C Major');
      },
      (err: Error) => {
        assert.strictEqual(err.message, "API_KEY is not defined");
        return true;
      }
    );
  });
});
