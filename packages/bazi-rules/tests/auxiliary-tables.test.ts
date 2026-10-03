import { expect, it } from 'vitest';
import { TWELVE_STAGES, TWELVE_STAGES_SOURCE } from '../src/index';
import type { Branch, Stem } from '@mylife/bazi-domain';
import reference from './fixtures/auxiliary-reference.json';
import { SHINSAL_RULES, SHINSAL_SUPPORT } from '../src/index';
import catalog from './fixtures/rules-reference.json';

it.each(Object.entries(reference.stages))('%s 십이운성 12칸이 채택 기대값과 일치한다', (stem, values) => {
  expect(reference.branchOrder.map(branch => TWELVE_STAGES[stem as Stem][branch as Branch])).toEqual(values);
  expect(new Set(Object.values(TWELVE_STAGES[stem as Stem])).size).toBe(12);
});

it.each(Object.entries(reference.shinsal))('%s 신살의 12개 연지 대응 및 적용 범위를 보존한다', (code, targets) => {
  const rule = SHINSAL_RULES.find(r => r.code === code)!;
  expect(rule.matches.map(m => m.basisBranches.join(''))).toEqual(reference.groups);
  expect(rule.matches.map(m => m.targetBranch)).toEqual(targets);
  expect(new Set(rule.matches.flatMap(m => [...m.basisBranches])).size).toBe(12);
  expect(rule.basis).toEqual({ position: 'year', layer: 'branch' });
  expect(rule.targetPositions).toEqual(['month', 'day', 'hour']);
  expect(rule.unknownTarget).toBe('unavailable');
  expect(rule.activation).toBe('not_evaluated');
  expect(rule.policyId).toBe('P3');
  expect(rule.sourceIds).toEqual([code === 'yima' ? 'SMMT-03' : 'SMMT-02-A']);
});

it('지원 목록을 닫고 그 밖의 신살은 미지원으로 명시한다', () => {
  expect(SHINSAL_SUPPORT).toEqual({ supported: ['yima', 'peach_blossom', 'canopy', 'general_star'], otherwise: 'unsupported' });
  expect(SHINSAL_RULES.map(r => r.code)).toEqual(SHINSAL_SUPPORT.supported);
  expect(new Set(SHINSAL_RULES.map(r => r.ruleCode)).size).toBe(4);
  for (const row of [...SHINSAL_RULES, TWELVE_STAGES_SOURCE]) {
    row.sourceIds.forEach(id => expect(catalog.sources.some(s => s.id === id)).toBe(true));
  }
});

it('십이운성은 일간 기준이며 음간 역행·화토동궁 정책과 출처를 명시한다', () => {
  expect(TWELVE_STAGES_SOURCE).toEqual({
    ruleCode: 'TWELVE_STAGES', sourceIds: ['SMMT-02', 'ZP-LIFE'], policyId: 'P2',
    basis: 'day_stem', targets: ['year', 'month', 'day', 'hour'],
    yangDirection: 'forward', yinDirection: 'reverse', earthFollowsFire: true,
  });
  expect(Object.keys(TWELVE_STAGES)).toHaveLength(10);
});
