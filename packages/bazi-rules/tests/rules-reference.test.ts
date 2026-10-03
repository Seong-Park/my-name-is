import { expect, it } from 'vitest';
import { MYLIFE_STANDARD_V1 } from '../src/index';
import reference from './fixtures/rules-reference.json';

const tables = MYLIFE_STANDARD_V1.tables;

function field(value: unknown, key: unknown): unknown {
  if (value === null || typeof value !== 'object' || typeof key !== 'string') {
    throw new Error(`Invalid reference lookup: ${String(key)}`);
  }
  const entry = Object.entries(value).find(([name]) => name === key);
  if (!entry) throw new Error(`Missing reference field: ${key}`);
  return entry[1];
}

function membersEqual(members: readonly string[], input: unknown): boolean {
  return Array.isArray(input) && JSON.stringify([...members].sort()) === JSON.stringify([...input].sort());
}

// 정적 표의 값·조건만 투영한다. 실제 원국 탐지기나 기대값 생성기가 아니다.
function actualValue(ruleId: string, input: unknown): unknown {
  switch (ruleId) {
    case 'GANZHI_ORDER': {
      const row = tables.ganzhiCycle.find(row => row.index === field(input, 'index'));
      if (!row) throw new Error('Missing ganzhi');
      return row.stem + row.branch;
    }
    case 'STEM_BRANCH_PROPERTIES': {
      const row = tables.stems.find(row => row.stem === input)
        ?? tables.branches.find(row => row.branch === input);
      if (!row) throw new Error('Missing stem/branch');
      return { element: row.element, yinYang: row.yinYang };
    }
    case 'TEN_GODS':
      return field(field(tables.tenGods, field(input, 'dayMaster')), field(input, 'target'));
    case 'HIDDEN_STEMS': {
      const row = Object.entries(tables.hiddenStems).find(([branch]) => branch === input);
      if (!row) throw new Error('Missing hidden stems');
      return row[1].map(({ stem, role, weight }) => ({ stem, role, weight }));
    }
    case 'TWELVE_STAGES':
      return field(field(tables.twelveStages, field(input, 'dayMaster')), field(input, 'branch'));
    case 'STEM_COMBINATION': {
      const row = tables.stemRelations.find(row => membersEqual(row.members, input));
      if (!row) throw new Error('Missing stem relation');
      return { relation: row.kind, autoTransform: row.transformation !== 'not_evaluated' };
    }
    case 'SHINSAL_SCOPE': {
      const matches = tables.shinsal.filter(row =>
        row.basis.position === 'year' && row.basis.layer === 'branch'
        && row.targetPositions.some(position => position === field(input, 'targetPosition'))
        && row.matches.some(match =>
          match.basisBranches.some(branch => branch === field(input, 'yearBranch'))
          && match.targetBranch === field(input, 'targetBranch')));
      expect(matches).toHaveLength(1);
      return { code: matches[0].code, detected: true };
    }
    default: {
      if (!ruleId.startsWith('BRANCH_')) throw new Error(`Unhandled ruleId: ${ruleId}`);
      const kind = ruleId.slice('BRANCH_'.length).toLowerCase();
      const members = kind === 'self_punishment' && Array.isArray(input)
        ? input.map(member => field(member, 'branch')) : input;
      const row = tables.branchRelations.find(row => row.kind === kind && membersEqual(row.members, members));
      if (kind === 'break') return row !== undefined;
      if (!row) throw new Error(`Missing relation: ${ruleId}`);
      if (kind === 'self_punishment' && Array.isArray(input)) {
        expect(row.distinctPositions).toBe(true);
        expect(new Set(input.map(member => field(member, 'position'))).size).toBe(input.length);
      }
      return row.kind === 'punishment'
        ? { relation: row.kind, completeTriple: row.completeTriple } : row.kind;
    }
  }
}

it.each(reference.cases)('$id: 독립 표본 기대값을 버전 규칙표와 비교한다', row => {
  expect(row.status).toBe('adopted');
  expect(actualValue(row.ruleId, row.input)).toEqual(row.expected);
});
