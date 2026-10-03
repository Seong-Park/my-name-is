import { expect, it } from 'vitest';
import { STEM_RELATIONS, BRANCH_RELATIONS, STEMS, BRANCHES } from '../src/index';
import reference from './fixtures/relations-reference.json';
import catalog from './fixtures/rules-reference.json';

it('천간합 5쌍 전체가 원문 기대값과 일치한다', () => {
  expect(STEM_RELATIONS.map(r => r.members.join(''))).toEqual(reference.stems.members);
  for (const row of STEM_RELATIONS) {
    expect(row.kind).toBe('combination');
    expect(row.members).toHaveLength(2);
    expect(row.sourceIds).toEqual(reference.stems.sourceIds);
    row.members.forEach(m => expect(STEMS.some(s => s.stem === m)).toBe(true));
  }
});

it.each(reference.branches)('$kind 전 항목이 채택 목록과 일치한다', expected => {
  const rows = BRANCH_RELATIONS.filter(r => r.kind === expected.kind);
  expect(rows.map(r => r.members.join(''))).toEqual(expected.members);
  rows.forEach(row => expect(row.sourceIds).toEqual(expected.sourceIds));
});

it('관계는 순서 무관·서로 다른 위치 조건을 보존하고 합화를 미평가로 둔다', () => {
  const keys = new Set<string>();
  const codes = new Set<string>();
  for (const row of [...STEM_RELATIONS, ...BRANCH_RELATIONS]) {
    const key = `${row.layer}/${row.kind}/${[...row.members].sort().join('')}`;
    expect(keys.has(key)).toBe(false);
    keys.add(key);
    expect(codes.has(row.ruleCode)).toBe(false);
    codes.add(row.ruleCode);
    expect(row.match).toBe('unordered');
    expect(row.distinctPositions).toBe(true);
    expect(row.transformation).toBe('not_evaluated');
    for (const id of row.sourceIds) expect(catalog.sources.some(s => s.id === id)).toBe(true);
  }
});

it('2자·3자·자형의 멤버 수와 형의 원문 방향을 보존한다', () => {
  for (const row of BRANCH_RELATIONS) {
    row.members.forEach(m => expect(BRANCHES.some(b => b.branch === m)).toBe(true));
    if (row.kind === 'sanhe' || row.kind === 'fanghe') expect(row.members).toHaveLength(3);
    else if (row.kind === 'punishment') {
      expect(row.completeTriple).toBe(row.members.length === 3);
      const expected = Object.entries(reference.punishmentEdges).find(([key]) => key === row.members.join(''));
      expect(row.sourceDirectedEdges.map(edge => edge.join(''))).toEqual(expected?.[1]);
    } else expect(row.members).toHaveLength(2);
    expect(new Set(row.members).size).toBe(row.kind === 'self_punishment' ? 1 : row.members.length);
  }
  expect(BRANCH_RELATIONS.filter(r => r.kind === 'break').map(r => r.members.join(''))).not.toContain('寅亥');
  expect(BRANCH_RELATIONS.filter(r => r.kind === 'break').map(r => r.members.join(''))).not.toContain('巳申');
});
