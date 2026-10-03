import type { Branch, Element, YinYang } from '@mylife/bazi-domain';

export const BRANCHES = [
  { index: 0, branch: '子', element: 'water', yinYang: 'yang', ruleCode: 'STEM_BRANCH_PROPERTIES', sourceIds: ['HKO-GZ', 'SMMT-02'] },
  { index: 1, branch: '丑', element: 'earth', yinYang: 'yin', ruleCode: 'STEM_BRANCH_PROPERTIES', sourceIds: ['HKO-GZ', 'SMMT-02'] },
  { index: 2, branch: '寅', element: 'wood', yinYang: 'yang', ruleCode: 'STEM_BRANCH_PROPERTIES', sourceIds: ['HKO-GZ', 'SMMT-02'] },
  { index: 3, branch: '卯', element: 'wood', yinYang: 'yin', ruleCode: 'STEM_BRANCH_PROPERTIES', sourceIds: ['HKO-GZ', 'SMMT-02'] },
  { index: 4, branch: '辰', element: 'earth', yinYang: 'yang', ruleCode: 'STEM_BRANCH_PROPERTIES', sourceIds: ['HKO-GZ', 'SMMT-02'] },
  { index: 5, branch: '巳', element: 'fire', yinYang: 'yin', ruleCode: 'STEM_BRANCH_PROPERTIES', sourceIds: ['HKO-GZ', 'SMMT-02'] },
  { index: 6, branch: '午', element: 'fire', yinYang: 'yang', ruleCode: 'STEM_BRANCH_PROPERTIES', sourceIds: ['HKO-GZ', 'SMMT-02'] },
  { index: 7, branch: '未', element: 'earth', yinYang: 'yin', ruleCode: 'STEM_BRANCH_PROPERTIES', sourceIds: ['HKO-GZ', 'SMMT-02'] },
  { index: 8, branch: '申', element: 'metal', yinYang: 'yang', ruleCode: 'STEM_BRANCH_PROPERTIES', sourceIds: ['HKO-GZ', 'SMMT-02'] },
  { index: 9, branch: '酉', element: 'metal', yinYang: 'yin', ruleCode: 'STEM_BRANCH_PROPERTIES', sourceIds: ['HKO-GZ', 'SMMT-02'] },
  { index: 10, branch: '戌', element: 'earth', yinYang: 'yang', ruleCode: 'STEM_BRANCH_PROPERTIES', sourceIds: ['HKO-GZ', 'SMMT-02'] },
  { index: 11, branch: '亥', element: 'water', yinYang: 'yin', ruleCode: 'STEM_BRANCH_PROPERTIES', sourceIds: ['HKO-GZ', 'SMMT-02'] },
] as const satisfies readonly { readonly index: number; readonly branch: Branch; readonly element: Element; readonly yinYang: YinYang; readonly ruleCode: string; readonly sourceIds: readonly [string, ...string[]] }[];
