import type { Stem, Element, YinYang } from '@mylife/bazi-domain';

export const STEMS = [
  { index: 0, stem: '甲', element: 'wood', yinYang: 'yang', ruleCode: 'STEM_BRANCH_PROPERTIES', sourceIds: ['HKO-GZ', 'SMMT-02'] },
  { index: 1, stem: '乙', element: 'wood', yinYang: 'yin', ruleCode: 'STEM_BRANCH_PROPERTIES', sourceIds: ['HKO-GZ', 'SMMT-02'] },
  { index: 2, stem: '丙', element: 'fire', yinYang: 'yang', ruleCode: 'STEM_BRANCH_PROPERTIES', sourceIds: ['HKO-GZ', 'SMMT-02'] },
  { index: 3, stem: '丁', element: 'fire', yinYang: 'yin', ruleCode: 'STEM_BRANCH_PROPERTIES', sourceIds: ['HKO-GZ', 'SMMT-02'] },
  { index: 4, stem: '戊', element: 'earth', yinYang: 'yang', ruleCode: 'STEM_BRANCH_PROPERTIES', sourceIds: ['HKO-GZ', 'SMMT-02'] },
  { index: 5, stem: '己', element: 'earth', yinYang: 'yin', ruleCode: 'STEM_BRANCH_PROPERTIES', sourceIds: ['HKO-GZ', 'SMMT-02'] },
  { index: 6, stem: '庚', element: 'metal', yinYang: 'yang', ruleCode: 'STEM_BRANCH_PROPERTIES', sourceIds: ['HKO-GZ', 'SMMT-02'] },
  { index: 7, stem: '辛', element: 'metal', yinYang: 'yin', ruleCode: 'STEM_BRANCH_PROPERTIES', sourceIds: ['HKO-GZ', 'SMMT-02'] },
  { index: 8, stem: '壬', element: 'water', yinYang: 'yang', ruleCode: 'STEM_BRANCH_PROPERTIES', sourceIds: ['HKO-GZ', 'SMMT-02'] },
  { index: 9, stem: '癸', element: 'water', yinYang: 'yin', ruleCode: 'STEM_BRANCH_PROPERTIES', sourceIds: ['HKO-GZ', 'SMMT-02'] },
] as const satisfies readonly { readonly index: number; readonly stem: Stem; readonly element: Element; readonly yinYang: YinYang; readonly ruleCode: string; readonly sourceIds: readonly [string, ...string[]] }[];
