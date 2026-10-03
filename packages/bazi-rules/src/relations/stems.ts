import type { Stem } from '@mylife/bazi-domain';

export type StemRelationRule = { readonly ruleCode: string; readonly sourceIds: readonly [string, ...string[]]; readonly match: 'unordered'; readonly distinctPositions: true; readonly transformation: 'not_evaluated'; readonly layer: 'stem'; readonly kind: 'combination'; readonly members: readonly [Stem, Stem] };

export const STEM_RELATIONS = [
  {"layer": "stem", "kind": "combination", "members": ["甲", "己"], "ruleCode": "STEM_COMBINATION_甲己", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "stem", "kind": "combination", "members": ["乙", "庚"], "ruleCode": "STEM_COMBINATION_乙庚", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "stem", "kind": "combination", "members": ["丙", "辛"], "ruleCode": "STEM_COMBINATION_丙辛", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "stem", "kind": "combination", "members": ["丁", "壬"], "ruleCode": "STEM_COMBINATION_丁壬", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "stem", "kind": "combination", "members": ["戊", "癸"], "ruleCode": "STEM_COMBINATION_戊癸", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
] as const satisfies readonly StemRelationRule[];
