import { describe, expect, it } from 'vitest';
import reference from './fixtures/rules-reference.json';

describe('독립 규칙 자료의 출처 계약', () => {
  it('규칙 표본마다 고유 ID, 원문 위치, 등록된 출처를 보존한다', () => {
    expect(reference.cases.length).toBeGreaterThan(0);
    const ids = reference.cases.map(row => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    const sources = new Set(reference.sources.map(source => source.id));
    for (const row of reference.cases) {
      expect(row.ruleId).not.toBe('');
      expect(row.locator.trim()).not.toBe('');
      expect(row.sourceIds.length).toBeGreaterThan(0);
      for (const id of row.sourceIds) expect(sources.has(id), `${row.id}: ${id}`).toBe(true);
      expect(row.expected).not.toBeUndefined();
    }
  });
  it('서지·권리·실제 확인 수준을 기록하며 같은 자료를 중복 등록하지 않는다', () => {
    expect(new Set(reference.sources.map(source => source.id)).size).toBe(reference.sources.length);
    for (const source of reference.sources) {
      for (const key of ['citation', 'url', 'locator', 'rights', 'verification', 'checkedAt'] as const) {
        expect(source[key].trim(), `${source.id}: ${key}`).not.toBe('');
      }
      expect(source.url).toMatch(/^https:\/\//);
      expect(source.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it('제품 선택이 미결정인 행을 승인된 규칙으로 승격하지 않는다', () => {
    for (const row of reference.cases) {
      expect(['adopted', 'proposed']).toContain(row.status);
      if (row.policyId !== null) {
        const policy = reference.policies.find(p => p.id === row.policyId);
        expect(policy, row.id).toBeDefined();
        expect(row.status).toBe(policy?.status);
        if (policy?.status === 'adopted') expect(policy.approval).toEqual(expect.any(String));
      }
      if (row.status === 'proposed') expect(row.policyId).not.toBeNull();
    }
  });
  it('채택 후보 네 정책과 기본/관계 영역에 독립 표본이 있다', () => {
    expect(reference.policies.map(p => p.id).sort()).toEqual(['P1', 'P2', 'P3', 'P4']);
    for (const rule of ['GANZHI_ORDER', 'STEM_BRANCH_PROPERTIES', 'TEN_GODS', 'HIDDEN_STEMS',
      'STEM_COMBINATION', 'BRANCH_LIUHE', 'BRANCH_SANHE', 'BRANCH_FANGHE', 'BRANCH_CLASH',
      'BRANCH_HARM', 'BRANCH_PUNISHMENT', 'BRANCH_SELF_PUNISHMENT', 'BRANCH_BREAK',
      'TWELVE_STAGES', 'SHINSAL_SCOPE']) {
      expect(reference.cases.some(row => row.ruleId === rule), rule).toBe(true);
    }
  });
});
