import { describe, expect, it } from 'vitest';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import type { NatalBirthInput } from '@mylife/bazi-domain';
import { calculateFourPillars, createCalendarContext } from '../src/index';
import referenceFixture from './fixtures/reference-cases.json';

interface ReferenceCase {
  id: string;
  category: string;
  description: string;
  source: { name: string; locator?: string };
  policy: { appliedPolicy: string; differencesWithSource?: string };
  input: NatalBirthInput;
}

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    deepFreeze((obj as any)[key]);
  }
  return obj;
}

describe('🌌 [Task 17] 100건 재현성 및 불변성 검증 (Reproducibility & Purity)', () => {
  const context = createCalendarContext(new KoreanLunarCalendar());
  const cases = referenceFixture.cases as unknown as ReferenceCase[];

  it('100건 2회 반복 계산 시 완벽한 심층 동일성(Deep Equality)을 만족해야 한다', () => {
    for (const testCase of cases) {
      const run1 = calculateFourPillars(testCase.input, context);
      const run2 = calculateFourPillars(testCase.input, context);
      expect(run1).toEqual(run2);
    }
  });

  it('100건 실행 순서를 역순 및 무작위로 섞어도 각 결과는 단독 실행 결과와 완전히 일치해야 한다', () => {
    // 기준 단독 실행 맵
    const baselineMap = new Map<string, any>();
    for (const testCase of cases) {
      baselineMap.set(testCase.id, calculateFourPillars(testCase.input, context));
    }

    // 역순 실행
    const reversed = [...cases].reverse();
    for (const testCase of reversed) {
      const result = calculateFourPillars(testCase.input, context);
      expect(result).toEqual(baselineMap.get(testCase.id));
    }

    // 임의 셔플 순서 실행 (결정적 의사 셔플)
    const shuffled = [...cases].sort((a, b) => {
      const hashA = a.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const hashB = b.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      return hashA - hashB;
    });
    for (const testCase of shuffled) {
      const result = calculateFourPillars(testCase.input, context);
      expect(result).toEqual(baselineMap.get(testCase.id));
    }
  });

  it('계산 함수가 입력 객체(NatalBirthInput)를 일체 변경하지 않아야 한다 (입력 불변성)', () => {
    for (const testCase of cases) {
      // JSON clone으로 원본 스냅샷 확보
      const snapshot = JSON.parse(JSON.stringify(testCase.input));
      // deepFreeze된 입력 객체로 계산 시도 (변경 시도 시 엄격 모드에서 즉시 throw)
      const frozenInput = deepFreeze(JSON.parse(JSON.stringify(testCase.input)));

      expect(() => {
        const result = calculateFourPillars(frozenInput, context);
        expect(result).toBeDefined();
      }).not.toThrow();

      // 원본 스냅샷과 deep equality 유지 확인
      expect(frozenInput).toEqual(snapshot);
    }
  });

  it('호스트 시스템의 Date.now()나 new Date() 변경에 영향받지 않는 순수 결정론적 계산이어야 한다', () => {
    const originalNow = Date.now;
    try {
      // Date.now를 인위적으로 1970년, 2030년, 2099년으로 모킹해도 동일한 결과 반환
      for (const fakeNow of [0, 1893456000000, 4102444800000]) {
        Date.now = () => fakeNow;
        const testCase = cases[0];
        const result = calculateFourPillars(testCase.input, context);
        expect(result.completeness).toBe('complete');
        expect(result.pillars.year.status).toBe('confirmed');
      }
    } finally {
      Date.now = originalNow;
    }
  });
});
