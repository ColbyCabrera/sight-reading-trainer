import assert from 'node:assert';
import { test, describe } from 'node:test';
import { getSettingsForLevel } from './musicTheory.ts';
import type { DifficultyLevel, GenerationSettings } from '../types.ts';

describe('getSettingsForLevel', () => {
  const testCases: { level: DifficultyLevel; expected: Partial<GenerationSettings> }[] = [
    {
      level: 1,
      expected: {
        maxInterval: 2,
        handCoordination: 'SEPARATE',
        playability: '5-FINGER',
        rhythmComplexity: 1
      }
    },
    {
      level: 2,
      expected: {
        maxInterval: 3,
        handCoordination: 'RANDOM',
        playability: '5-FINGER',
        rhythmComplexity: 2
      }
    },
    {
      level: 3,
      expected: {
        maxInterval: 6,
        handCoordination: 'RANDOM',
        playability: 'OCTAVE',
        rhythmComplexity: 3
      }
    },
    {
      level: 4,
      expected: {
        maxInterval: 4,
        handCoordination: 'INDEPENDENT',
        playability: '5-FINGER',
        rhythmComplexity: 2
      }
    },
    {
      level: 5,
      expected: {
        maxInterval: 5,
        handCoordination: 'INDEPENDENT',
        playability: 'OCTAVE',
        rhythmComplexity: 3
      }
    },
    {
      level: 6,
      expected: {
        maxInterval: 6,
        handCoordination: 'INDEPENDENT',
        playability: 'OCTAVE',
        rhythmComplexity: 5
      }
    },
    {
      level: 7,
      expected: {
        maxInterval: 8,
        handCoordination: 'INDEPENDENT',
        playability: 'OCTAVE',
        rhythmComplexity: 7
      }
    },
    {
      level: 8,
      expected: {
        maxInterval: 12,
        handCoordination: 'INDEPENDENT',
        playability: 'LARGE',
        rhythmComplexity: 8
      }
    },
    {
      level: 9,
      expected: {
        maxInterval: 12,
        handCoordination: 'INDEPENDENT',
        playability: 'LARGE',
        rhythmComplexity: 9
      }
    },
    {
      level: 10,
      expected: {
        maxInterval: 12,
        handCoordination: 'INDEPENDENT',
        playability: 'LARGE',
        rhythmComplexity: 10
      }
    }
  ];

  testCases.forEach(({ level, expected }) => {
    test(`should return correct settings for level ${level}`, () => {
      const settings = getSettingsForLevel(level);

      (Object.keys(expected) as (keyof GenerationSettings)[]).forEach(key => {
        assert.strictEqual(settings[key], expected[key], `Failed for level ${level} on key ${key}`);
      });
    });
  });
});
