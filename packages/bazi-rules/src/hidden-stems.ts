import type { Branch, Stem, HiddenStemRole } from '@mylife/bazi-domain';

export interface HiddenStemRule {
  readonly stem: Stem;
  readonly role: HiddenStemRole;
  /** P1: 미배분. 일수·비율·강약 기여도가 아니다. */
  readonly weight: null;
  readonly ruleCode: 'HIDDEN_STEMS';
  readonly policyId: 'P1';
  readonly sourceIds: readonly ['YHZP-HS'];
}

export const HIDDEN_STEMS = {
  子: [
    { stem: '癸', role: 'main', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
  ],
  丑: [
    { stem: '己', role: 'main', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
    { stem: '辛', role: 'middle', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
    { stem: '癸', role: 'residual', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
  ],
  寅: [
    { stem: '甲', role: 'main', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
    { stem: '丙', role: 'middle', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
    { stem: '戊', role: 'residual', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
  ],
  卯: [
    { stem: '乙', role: 'main', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
  ],
  辰: [
    { stem: '戊', role: 'main', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
    { stem: '癸', role: 'middle', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
    { stem: '乙', role: 'residual', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
  ],
  巳: [
    { stem: '丙', role: 'main', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
    { stem: '庚', role: 'middle', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
    { stem: '戊', role: 'residual', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
  ],
  午: [
    { stem: '丁', role: 'main', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
    { stem: '己', role: 'middle', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
  ],
  未: [
    { stem: '己', role: 'main', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
    { stem: '乙', role: 'middle', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
    { stem: '丁', role: 'residual', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
  ],
  申: [
    { stem: '庚', role: 'main', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
    { stem: '壬', role: 'middle', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
    { stem: '戊', role: 'residual', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
  ],
  酉: [
    { stem: '辛', role: 'main', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
  ],
  戌: [
    { stem: '戊', role: 'main', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
    { stem: '丁', role: 'middle', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
    { stem: '辛', role: 'residual', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
  ],
  亥: [
    { stem: '壬', role: 'main', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
    { stem: '甲', role: 'middle', weight: null, ruleCode: 'HIDDEN_STEMS', policyId: 'P1', sourceIds: ['YHZP-HS'] },
  ],
} as const satisfies Readonly<Record<Branch, readonly HiddenStemRule[]>>;
