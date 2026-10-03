import { expect, it } from 'vitest';
import {
  MYLIFE_STANDARD_V1, STEMS, BRANCHES, GANZHI_CYCLE, HIDDEN_STEMS, TEN_GODS,
  STEM_RELATIONS, BRANCH_RELATIONS, TWELVE_STAGES, SHINSAL_RULES, SHINSAL_SUPPORT,
} from '../src/index';

it('ADR-001의 진태양시 일계와 분리된 자시 경계를 버전과 함께 공개한다', () => {
  expect(MYLIFE_STANDARD_V1).toMatchObject({
    version: 'mylife-standard-v1',
    timeBasis: 'true-solar-time',
    dayBoundary: '23:00', ziHourStart: '23:00', ziHourEnd: '01:00',
    splitZiHour: false, hourStemUsesRolledDayMaster: true,
  });
});

it('버전은 Task 8~9의 채택 규칙표를 묶고 미승인 판정 수치는 공개하지 않는다', () => {
  expect(MYLIFE_STANDARD_V1.tables).toEqual({
    stems: STEMS, branches: BRANCHES, ganzhiCycle: GANZHI_CYCLE,
    hiddenStems: HIDDEN_STEMS, tenGods: TEN_GODS,
    stemRelations: STEM_RELATIONS, branchRelations: BRANCH_RELATIONS,
    twelveStages: TWELVE_STAGES, shinsal: SHINSAL_RULES, shinsalSupport: SHINSAL_SUPPORT,
  });
  expect(MYLIFE_STANDARD_V1).not.toHaveProperty('diagnostics');
  expect(MYLIFE_STANDARD_V1).not.toHaveProperty('strengthWeights');
  expect(MYLIFE_STANDARD_V1).not.toHaveProperty('patternRules');
  expect(MYLIFE_STANDARD_V1).not.toHaveProperty('yongshinRules');
});

it('ADR-002/003의 방향·12절·비정수 나이와 별도 달력 매핑 정책을 보존한다', () => {
  expect(MYLIFE_STANDARD_V1).toMatchObject({
    daeunDirectionBasis: 'year-stem-yinyang-and-sex',
    daeunSequenceBasis: 'month-pillar',
    includeNatalMonthPillarAsDaeun: false,
    daeunDirections: {
      yang: { male: 'forward', female: 'reverse' },
      yin: { male: 'reverse', female: 'forward' },
    },
    daeunStartTermBasis: 'twelve-jie',
    referenceJie: ['입춘', '경칩', '청명', '입하', '망종', '소서', '입추', '백로', '한로', '입동', '대설', '소한'],
    referenceTermSelection: { forward: 'at-or-after-birth', reverse: 'at-or-before-birth' },
    termComparisonBasis: 'utc-instant',
    daeunConversion: '3-real-days-per-symbolic-year',
    realSecondsPerSymbolicYear: 259200, realSecondsPerSymbolicDay: 720,
    symbolicYearDays: 360, symbolicMonthDays: 30,
    forceIntegerDaeunAge: false, minimumDaeunAge: null,
    calendarMapping: 'mylife-calendar-mapping-v1',
  });
});
