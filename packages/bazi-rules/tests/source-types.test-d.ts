import type { RuleSource, RuleReferenceCase } from '../src/types';

const source: RuleSource = {
  id: 'TEST', citation: 'source title', url: 'https://example.org/source', locator: 'section',
  rights: 'facts only', checkedAt: '2026-09-23', verification: 'primary_transcription_checked',
};
const { locator, ...withoutLocator } = source;
// @ts-expect-error 출처 위치 필수
const missingLocator: RuleSource = withoutLocator;
// @ts-expect-error 조사 수준을 임의 값으로 대체하지 않는다.
const unknownVerification: RuleSource = { ...source, verification: 'trust-me' };
const row: RuleReferenceCase = {
  id: 'test', ruleId: 'TEST', sourceIds: ['TEST'], locator: 'section', status: 'proposed',
  policyId: 'P1', input: { branch: '子' }, expected: { stems: ['癸'], weight: null },
};
// @ts-expect-error 출처 없는 기대값 금지
const unsourced: RuleReferenceCase = { ...row, sourceIds: [] };
// @ts-expect-error 승인 대기 규칙에는 선택 정책 ID 필수
const lostDecision: RuleReferenceCase = { ...row, policyId: null };
void [source, locator, missingLocator, unknownVerification, row, unsourced, lostDecision];
