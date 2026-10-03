import type { Branch } from '@mylife/bazi-domain';
type Pair = readonly [Branch, Branch];
type Triple = readonly [Branch, Branch, Branch];
export type BranchRelationRule = { readonly ruleCode: string; readonly sourceIds: readonly [string, ...string[]]; readonly match: 'unordered'; readonly distinctPositions: true; readonly transformation: 'not_evaluated'; readonly layer: 'branch' } & (
  | { readonly kind: 'liuhe' | 'clash' | 'harm' | 'break' | 'self_punishment'; readonly members: Pair }
  | { readonly kind: 'sanhe' | 'fanghe'; readonly members: Triple }
  | ({ readonly kind: 'punishment'; readonly sourceDirectedEdges: readonly [Pair, ...Pair[]] } & (
      | { readonly members: Pair; readonly completeTriple: false }
      | { readonly members: Triple; readonly completeTriple: true }
    ))
);
// 관계 탐지 조건만 기술한다. 합화 성립·관계 우선순위는 계산하지 않는다.
export const BRANCH_RELATIONS = [
  {"layer": "branch", "kind": "liuhe", "members": ["子", "丑"], "ruleCode": "BRANCH_LIUHE_子丑", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "liuhe", "members": ["寅", "亥"], "ruleCode": "BRANCH_LIUHE_寅亥", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "liuhe", "members": ["卯", "戌"], "ruleCode": "BRANCH_LIUHE_卯戌", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "liuhe", "members": ["辰", "酉"], "ruleCode": "BRANCH_LIUHE_辰酉", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "liuhe", "members": ["巳", "申"], "ruleCode": "BRANCH_LIUHE_巳申", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "liuhe", "members": ["午", "未"], "ruleCode": "BRANCH_LIUHE_午未", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "sanhe", "members": ["申", "子", "辰"], "ruleCode": "BRANCH_SANHE_申子辰", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "sanhe", "members": ["巳", "酉", "丑"], "ruleCode": "BRANCH_SANHE_巳酉丑", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "sanhe", "members": ["寅", "午", "戌"], "ruleCode": "BRANCH_SANHE_寅午戌", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "sanhe", "members": ["亥", "卯", "未"], "ruleCode": "BRANCH_SANHE_亥卯未", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "fanghe", "members": ["寅", "卯", "辰"], "ruleCode": "BRANCH_FANGHE_寅卯辰", "sourceIds": ["SMMT-03"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "fanghe", "members": ["巳", "午", "未"], "ruleCode": "BRANCH_FANGHE_巳午未", "sourceIds": ["SMMT-03"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "fanghe", "members": ["申", "酉", "戌"], "ruleCode": "BRANCH_FANGHE_申酉戌", "sourceIds": ["SMMT-03"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "fanghe", "members": ["亥", "子", "丑"], "ruleCode": "BRANCH_FANGHE_亥子丑", "sourceIds": ["SMMT-03"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "clash", "members": ["子", "午"], "ruleCode": "BRANCH_CLASH_子午", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "clash", "members": ["丑", "未"], "ruleCode": "BRANCH_CLASH_丑未", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "clash", "members": ["寅", "申"], "ruleCode": "BRANCH_CLASH_寅申", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "clash", "members": ["卯", "酉"], "ruleCode": "BRANCH_CLASH_卯酉", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "clash", "members": ["辰", "戌"], "ruleCode": "BRANCH_CLASH_辰戌", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "clash", "members": ["巳", "亥"], "ruleCode": "BRANCH_CLASH_巳亥", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "harm", "members": ["子", "未"], "ruleCode": "BRANCH_HARM_子未", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "harm", "members": ["丑", "午"], "ruleCode": "BRANCH_HARM_丑午", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "harm", "members": ["寅", "巳"], "ruleCode": "BRANCH_HARM_寅巳", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "harm", "members": ["卯", "辰"], "ruleCode": "BRANCH_HARM_卯辰", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "harm", "members": ["申", "亥"], "ruleCode": "BRANCH_HARM_申亥", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "harm", "members": ["酉", "戌"], "ruleCode": "BRANCH_HARM_酉戌", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "punishment", "members": ["子", "卯"], "ruleCode": "BRANCH_PUNISHMENT_子卯", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated", "completeTriple": false, "sourceDirectedEdges": [["子", "卯"], ["卯", "子"]]},
  {"layer": "branch", "kind": "punishment", "members": ["寅", "巳"], "ruleCode": "BRANCH_PUNISHMENT_寅巳", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated", "completeTriple": false, "sourceDirectedEdges": [["寅", "巳"]]},
  {"layer": "branch", "kind": "punishment", "members": ["巳", "申"], "ruleCode": "BRANCH_PUNISHMENT_巳申", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated", "completeTriple": false, "sourceDirectedEdges": [["巳", "申"]]},
  {"layer": "branch", "kind": "punishment", "members": ["申", "寅"], "ruleCode": "BRANCH_PUNISHMENT_申寅", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated", "completeTriple": false, "sourceDirectedEdges": [["申", "寅"]]},
  {"layer": "branch", "kind": "punishment", "members": ["丑", "戌"], "ruleCode": "BRANCH_PUNISHMENT_丑戌", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated", "completeTriple": false, "sourceDirectedEdges": [["丑", "戌"]]},
  {"layer": "branch", "kind": "punishment", "members": ["戌", "未"], "ruleCode": "BRANCH_PUNISHMENT_戌未", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated", "completeTriple": false, "sourceDirectedEdges": [["戌", "未"]]},
  {"layer": "branch", "kind": "punishment", "members": ["未", "丑"], "ruleCode": "BRANCH_PUNISHMENT_未丑", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated", "completeTriple": false, "sourceDirectedEdges": [["未", "丑"]]},
  {"layer": "branch", "kind": "punishment", "members": ["寅", "巳", "申"], "ruleCode": "BRANCH_PUNISHMENT_寅巳申", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated", "completeTriple": true, "sourceDirectedEdges": [["寅", "巳"], ["巳", "申"], ["申", "寅"]]},
  {"layer": "branch", "kind": "punishment", "members": ["丑", "戌", "未"], "ruleCode": "BRANCH_PUNISHMENT_丑戌未", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated", "completeTriple": true, "sourceDirectedEdges": [["丑", "戌"], ["戌", "未"], ["未", "丑"]]},
  {"layer": "branch", "kind": "self_punishment", "members": ["辰", "辰"], "ruleCode": "BRANCH_SELF_PUNISHMENT_辰辰", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "self_punishment", "members": ["午", "午"], "ruleCode": "BRANCH_SELF_PUNISHMENT_午午", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "self_punishment", "members": ["酉", "酉"], "ruleCode": "BRANCH_SELF_PUNISHMENT_酉酉", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "self_punishment", "members": ["亥", "亥"], "ruleCode": "BRANCH_SELF_PUNISHMENT_亥亥", "sourceIds": ["SMMT-02"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "break", "members": ["卯", "午"], "ruleCode": "BRANCH_BREAK_卯午", "sourceIds": ["SMMT-03"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "break", "members": ["丑", "辰"], "ruleCode": "BRANCH_BREAK_丑辰", "sourceIds": ["SMMT-03"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "break", "members": ["子", "酉"], "ruleCode": "BRANCH_BREAK_子酉", "sourceIds": ["SMMT-03"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
  {"layer": "branch", "kind": "break", "members": ["未", "戌"], "ruleCode": "BRANCH_BREAK_未戌", "sourceIds": ["SMMT-03"], "match": "unordered", "distinctPositions": true, "transformation": "not_evaluated"},
] as const satisfies readonly BranchRelationRule[];
