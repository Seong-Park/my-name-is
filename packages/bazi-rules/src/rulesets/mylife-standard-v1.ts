import type { ReferenceJie } from '@mylife/bazi-domain';
import { STEMS } from '../stems';
import { BRANCHES } from '../branches';
import { GANZHI_CYCLE } from '../ganzhi';
import { HIDDEN_STEMS } from '../hidden-stems';
import { TEN_GODS } from '../ten-gods';
import { STEM_RELATIONS } from '../relations/stems';
import { BRANCH_RELATIONS } from '../relations/branches';
import { TWELVE_STAGES } from '../twelve-stages';
import { SHINSAL_RULES, SHINSAL_SUPPORT } from '../shinsal';

/** ADR-001~003의 승인된 제품 정책. 시간·팔자·대운 계산은 engine의 책임이다. */
export const MYLIFE_STANDARD_V1 = {
  version: 'mylife-standard-v1',
  timeBasis: 'true-solar-time',
  dayBoundary: '23:00',
  ziHourStart: '23:00',
  ziHourEnd: '01:00',
  splitZiHour: false,
  hourStemUsesRolledDayMaster: true,
  daeunDirectionBasis: 'year-stem-yinyang-and-sex',
  daeunSequenceBasis: 'month-pillar',
  includeNatalMonthPillarAsDaeun: false,
  daeunDirections: {
    yang: { male: 'forward', female: 'reverse' },
    yin: { male: 'reverse', female: 'forward' },
  },
  daeunStartTermBasis: 'twelve-jie',
  referenceJie: ['입춘', '경칩', '청명', '입하', '망종', '소서', '입추', '백로', '한로', '입동', '대설', '소한'] as const satisfies readonly ReferenceJie[],
  referenceTermSelection: { forward: 'at-or-after-birth', reverse: 'at-or-before-birth' },
  termComparisonBasis: 'utc-instant',
  daeunConversion: '3-real-days-per-symbolic-year',
  realSecondsPerSymbolicYear: 259200,
  realSecondsPerSymbolicDay: 720,
  symbolicYearDays: 360,
  symbolicMonthDays: 30,
  forceIntegerDaeunAge: false,
  minimumDaeunAge: null,
  calendarMapping: 'mylife-calendar-mapping-v1',
  tables: {
    stems: STEMS, branches: BRANCHES, ganzhiCycle: GANZHI_CYCLE,
    hiddenStems: HIDDEN_STEMS, tenGods: TEN_GODS,
    stemRelations: STEM_RELATIONS, branchRelations: BRANCH_RELATIONS,
    twelveStages: TWELVE_STAGES, shinsal: SHINSAL_RULES, shinsalSupport: SHINSAL_SUPPORT,
  },
} as const;
