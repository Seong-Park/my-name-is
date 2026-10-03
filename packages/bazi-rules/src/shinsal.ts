import type { Branch } from '@mylife/bazi-domain';

export type SupportedShinsal = 'yima' | 'peach_blossom' | 'canopy' | 'general_star';
export type ShinsalRule = {
  readonly code: SupportedShinsal;
  readonly ruleCode: string;
  readonly sourceIds: readonly [string, ...string[]];
  readonly locator: string;
  readonly policyId: 'P3';
  readonly basis: { readonly position: 'year'; readonly layer: 'branch' };
  readonly targetPositions: readonly ['month', 'day', 'hour'];
  readonly unknownTarget: 'unavailable';
  readonly activation: 'not_evaluated';
  readonly matches: readonly {
    readonly basisBranches: readonly [Branch, Branch, Branch];
    readonly targetBranch: Branch;
  }[];
};

// P3: 연지를 기준으로 월·일·시지만 대조한다. 발생과 작동·길흉 판단은 별개다.
export const SHINSAL_RULES = [
  {"code": "yima", "ruleCode": "SHINSAL_YIMA", "sourceIds": ["SMMT-03"], "locator": "論驛馬", "policyId": "P3", "basis": {"position": "year", "layer": "branch"}, "targetPositions": ["month", "day", "hour"], "unknownTarget": "unavailable", "activation": "not_evaluated", "matches": [{"basisBranches": ["申", "子", "辰"], "targetBranch": "寅"}, {"basisBranches": ["寅", "午", "戌"], "targetBranch": "申"}, {"basisBranches": ["巳", "酉", "丑"], "targetBranch": "亥"}, {"basisBranches": ["亥", "卯", "未"], "targetBranch": "巳"}]},
  {"code": "peach_blossom", "ruleCode": "SHINSAL_PEACH_BLOSSOM", "sourceIds": ["SMMT-02-A"], "locator": "論咸池", "policyId": "P3", "basis": {"position": "year", "layer": "branch"}, "targetPositions": ["month", "day", "hour"], "unknownTarget": "unavailable", "activation": "not_evaluated", "matches": [{"basisBranches": ["申", "子", "辰"], "targetBranch": "酉"}, {"basisBranches": ["寅", "午", "戌"], "targetBranch": "卯"}, {"basisBranches": ["巳", "酉", "丑"], "targetBranch": "午"}, {"basisBranches": ["亥", "卯", "未"], "targetBranch": "子"}]},
  {"code": "canopy", "ruleCode": "SHINSAL_CANOPY", "sourceIds": ["SMMT-02-A"], "locator": "論將星華蓋", "policyId": "P3", "basis": {"position": "year", "layer": "branch"}, "targetPositions": ["month", "day", "hour"], "unknownTarget": "unavailable", "activation": "not_evaluated", "matches": [{"basisBranches": ["申", "子", "辰"], "targetBranch": "辰"}, {"basisBranches": ["寅", "午", "戌"], "targetBranch": "戌"}, {"basisBranches": ["巳", "酉", "丑"], "targetBranch": "丑"}, {"basisBranches": ["亥", "卯", "未"], "targetBranch": "未"}]},
  {"code": "general_star", "ruleCode": "SHINSAL_GENERAL_STAR", "sourceIds": ["SMMT-02-A"], "locator": "論將星華蓋", "policyId": "P3", "basis": {"position": "year", "layer": "branch"}, "targetPositions": ["month", "day", "hour"], "unknownTarget": "unavailable", "activation": "not_evaluated", "matches": [{"basisBranches": ["申", "子", "辰"], "targetBranch": "子"}, {"basisBranches": ["寅", "午", "戌"], "targetBranch": "午"}, {"basisBranches": ["巳", "酉", "丑"], "targetBranch": "酉"}, {"basisBranches": ["亥", "卯", "未"], "targetBranch": "卯"}]},

] as const satisfies readonly ShinsalRule[];

// 미지원은 미검출(false)이 아니다. 전체 12신살·천을귀인·양인·공망 등은 포함하지 않는다.
export const SHINSAL_SUPPORT = {
  supported: ['yima', 'peach_blossom', 'canopy', 'general_star'],
  otherwise: 'unsupported',
} as const satisfies { readonly supported: readonly SupportedShinsal[]; readonly otherwise: 'unsupported' };
