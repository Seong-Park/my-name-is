import { expect, it } from 'vitest';
import { STEMS, BRANCHES, GANZHI_CYCLE, HIDDEN_STEMS, TEN_GODS, TEN_GODS_SOURCE } from '../src/index';
import type { TenGod } from '@mylife/bazi-domain';
import reference from './fixtures/basic-reference.json';
import sources from './fixtures/rules-reference.json';
import tenGodsReference from './fixtures/ten-gods-reference.json';

const labels: Readonly<Record<TenGod, string>> = {
  peer: '比肩', rob_wealth: '劫財', eating_god: '食神', hurting_officer: '傷官',
  indirect_wealth: '偏財', direct_wealth: '正財', seven_killings: '七殺', direct_officer: '正官',
  indirect_resource: '偏印', direct_resource: '正印',
};

it.each(STEMS)('$stem 일간의 십성 10개가 수작업 기대값과 일치한다', ({ stem }) => {
  const expected = tenGodsReference.rows.find(row => row.dayMaster === stem);
  expect(STEMS.map(s => s.stem)).toEqual(tenGodsReference.targets);
  expect(STEMS.map(target => labels[TEN_GODS[stem][target.stem]])).toEqual(expected?.expected);
  expect(Object.keys(TEN_GODS[stem])).toEqual(tenGodsReference.targets);
  expect(new Set(Object.values(TEN_GODS[stem])).size).toBe(10);
});

it('십성의 기준은 일간이며 출처·표 전체 범위가 보존된다', () => {
  expect(Object.keys(TEN_GODS)).toEqual(tenGodsReference.targets);
  expect(tenGodsReference.rows).toHaveLength(10);
  expect(TEN_GODS['甲']['丁']).toBe('hurting_officer');
  expect(TEN_GODS['丁']['甲']).toBe('direct_resource');
  expect(TEN_GODS_SOURCE.sourceIds).toEqual(tenGodsReference.sourceIds);
});

it('표의 모든 출처 ID는 검증된 등록부에 연결된다', () => {
  const ids = new Set(sources.sources.map(s => s.id));
  const records = [...STEMS, ...BRANCHES, ...GANZHI_CYCLE, ...Object.values(HIDDEN_STEMS).flat(), TEN_GODS_SOURCE];
  for (const row of records) {
    expect(row.ruleCode).not.toBe('');
    expect(row.sourceIds.length).toBeGreaterThan(0);
    row.sourceIds.forEach(id => expect(ids.has(id)).toBe(true));
  }
  expect(Object.keys(HIDDEN_STEMS)).toEqual(BRANCHES.map(b => b.branch));
});

it('10간과 12지의 전체 순서·속성이 독립 출처표와 일치한다', () => {
  expect(STEMS.map(s => [s.stem, s.element, s.yinYang])).toEqual(reference.stems);
  expect(BRANCHES.map(b => [b.branch, b.element, b.yinYang])).toEqual(reference.branches);
  expect(STEMS).toHaveLength(10);
  expect(BRANCHES).toHaveLength(12);
  expect(new Set(STEMS.map(s => s.stem)).size).toBe(10);
  expect(new Set(BRANCHES.map(b => b.branch)).size).toBe(12);
  STEMS.forEach((s, i) => expect(s.index).toBe(i));
  BRANCHES.forEach((b, i) => expect(b.index).toBe(i));
});

it.each(BRANCHES)('$branch 지장간의 구성·역할은 P1 기대값과 일치하고 배분하지 않는다', ({ branch }) => {
  const expected = sources.cases.find(row => row.ruleId === 'HIDDEN_STEMS' && row.input === branch);
  expect(expected?.status).toBe('adopted');
  const entries = HIDDEN_STEMS[branch];
  expect(entries.map(({ stem, role, weight }) => ({ stem, role, weight }))).toEqual(expected?.expected);
  expect(entries.filter(e => e.role === 'main')).toHaveLength(1);
  expect(new Set(entries.map(e => e.role)).size).toBe(entries.length);
  expect(new Set(entries.map(e => e.stem)).size).toBe(entries.length);
  for (const entry of entries) {
    expect(STEMS.some(s => s.stem === entry.stem)).toBe(true);
    expect(entry.weight).toBeNull();
    expect(entry.ruleCode).toBe('HIDDEN_STEMS');
    expect(entry.policyId).toBe('P1');
    expect(entry.sourceIds).toContain('YHZP-HS');
  }
});

it('60갑자 전 항목·인덱스·간지 대응이 HKO 독립 기대값과 일치한다', () => {
  expect(GANZHI_CYCLE.map(g => g.stem + g.branch)).toEqual(reference.ganzhi);
  expect(GANZHI_CYCLE).toHaveLength(60);
  expect(new Set(GANZHI_CYCLE.map(g => g.stem + g.branch)).size).toBe(60);
  GANZHI_CYCLE.forEach((g, i) => {
    expect(g.index).toBe(i);
    expect(g.stem).toBe(STEMS[i % 10].stem);
    expect(g.branch).toBe(BRANCHES[i % 12].branch);
  });
});
