import { describe, expect, it } from 'vitest';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import type { NatalBirthInput } from '@mylife/bazi-domain';
import { calculateFourPillars, createCalendarContext } from '../src/index';
import referenceFixture from './fixtures/reference-cases.json';

interface ExpectedPillar {
  status: 'confirmed' | 'ambiguous' | 'unavailable';
  value?: { stem: string; branch: string; index: number };
  candidates?: { stem: string; branch: string; index: number }[];
  reason?: string;
}

interface ReferenceCase {
  id: string;
  category: string;
  description: string;
  source: { name: string; locator?: string };
  policy: { appliedPolicy: string; differencesWithSource?: string };
  input: NatalBirthInput;
  expected: {
    completeness: 'complete' | 'partial';
    year: ExpectedPillar;
    month: ExpectedPillar;
    day: ExpectedPillar;
    hour: ExpectedPillar;
  };
}

describe('🌌 [Task 17] 독립 기준 명식 벤치마크 (Independent Reference Cases)', () => {
  const context = createCalendarContext(new KoreanLunarCalendar());
  const cases = referenceFixture.cases as unknown as ReferenceCase[];

  it('독립 기준 fixture에 최소 20건 이상 등록되어 있어야 한다', () => {
    expect(cases.length).toBeGreaterThanOrEqual(20);
  });

  describe.each(cases)('$id: $description ($category)', (testCase) => {
    it('사주 팔자 계산 결과가 독립 기대값과 일치해야 한다', () => {
      const result = calculateFourPillars(testCase.input, context);

      expect(result.completeness).toBe(testCase.expected.completeness);

      function assertPillar(actual: any, expected: ExpectedPillar) {
        expect(actual.status).toBe(expected.status);
        if (expected.status === 'confirmed') {
          expect(actual).toMatchObject({
            value: expect.objectContaining(expected.value!),
          });
        } else if (expected.status === 'ambiguous') {
          expect(actual.candidates).toBeDefined();
          if (expected.candidates) {
            expect(actual.candidates).toEqual(
              expect.arrayContaining(expected.candidates.map(c => expect.objectContaining(c)))
            );
          }
        } else if (expected.status === 'unavailable') {
          expect(actual).toMatchObject({
            reason: expected.reason,
          });
        }
      }

      // 연주, 월주, 일주, 시주 전수 검증
      assertPillar(result.pillars.year, testCase.expected.year);
      assertPillar(result.pillars.month, testCase.expected.month);
      assertPillar(result.pillars.day, testCase.expected.day);
      assertPillar(result.pillars.hour, testCase.expected.hour);
    });
  });
});
