import type { Element } from './hanja';
import type { Analysis } from '../contracts';

export const INTERPRETATION_VERSION='quzhi-winter-wood-joint-candidates-v3';

type ElementRoles = Partial<Record<Element,'allowed'|'neutral'|'discouraged'>>;
export function nameGrade(elements:readonly (Element|null)[],direction:{target:Element;roles:ElementRoles}|null):Analysis['currentName']['grade'] {
  if(!direction||direction.roles[direction.target]!=='allowed'||!elements.length||elements.some(e=>!e||!direction.roles[e])) return null;
  if(elements.some(e=>direction.roles[e!]==='discouraged')) return 'needs_supplement';
  return elements.every(e=>direction.roles[e!]==='allowed')&&elements.includes(direction.target)
    ?'well_matched':'partly_supplement';
}

export function directionConsensus<T extends {target:Element;allowed:readonly Element[];evidence:readonly string[]}>(directions:readonly (T|null)[]) {
  const first=directions[0];
  if(!first||directions.some(d=>!d||d.target!==first.target)) return null;
  const allowed=first.allowed.filter(e=>directions.every(d=>d!.allowed.includes(e)));
  if(!allowed.includes(first.target)) return null;
  return {...first,allowed,evidence:[...new Set(directions.flatMap(d=>d!.evidence))]};
}

// 評註 climate/position model; source facts and bounded service inferences are
// distinguished in docs/research/2026-10-03-winter-wood-boundary.md.
// Caller supplies complete, confirmed calendar pillars in year/month/day/hour order.
export function winterWoodBalance(pillars:readonly {stem:string;branch:string}[]) {
  if(pillars.length!==4||pillars[2].stem!=='甲'||pillars[1].branch!=='子'||pillars[3].stem!=='丙') return null;
  if([0,2,3].some(i=>pillars[i].branch!=='寅')) return null;
  const stems=pillars.map(p=>p.stem);
  if(stems.slice(0,3).some(s=>!['甲','戊','庚'].includes(s))) return null;
  if(stems.slice(1).includes('庚')||stems.filter(s=>s==='戊').length>1) return null;
  const methods=[
    {method:'eokbu',status:'applicable',evidence:'세 인목의 뿌리와 겨울 목의 신·인 양왕을 보존하는 범위에서 화의 설기를 취한다.'},
    {method:'johu',status:'applicable',evidence:'자월과 병인시의 화 기능을 보존하는 범위에서 화의 온난 기능을 취한다.'},
    {method:'tonggwan',status:'not_applicable',evidence:'수→목→화 연결이 보존되며, 재관의 뿌리·계절이 강화되지 않아 별도 균평 대치 목표를 두지 않는다.'},
    {method:'byeongyak',status:'not_applicable',evidence:'화의 합거·뿌리 손상·노출 수의 제어를 제외하고, 인약재중·구제 부재의 실제 손상 전제도 성립하지 않는 범위다.'},
  ];
  // Both applicable methods admit only FIRE as a final target. No generating
  // element or unevaluated auxiliary is added to their common permitted set.
  return {strength:'strong' as const,target:'FIRE' as const,allowed:['FIRE'] as Element[],roles:{FIRE:'allowed'} as ElementRoles,methods,evidence:[
    '갑목 일간·자월과 세 인목, 병인시의 검토 범위에서 「자평진전평주」의 설기·조후 해석에 따라 화의 상징을 담은 이름이에요.',
    '억부와 조후의 화 목표가 일치하며, 통관·병약은 이 범위의 역할과 위치를 검토해 별도 목표가 필요하지 않은 것으로 해석했어요.',
    '고전 사례와 역할 보존에 근거한 제한적인 서비스 해석이에요. 이름이 원국에 불을 더하거나 삶의 결과를 바꾼다는 뜻은 아니에요.',
  ]};
}

// 神峰通考「曲直仁寿格」楠曰, oldid=1378606; see the adoption note in docs/research.
// A service interpretation of one author's structure, not a measurement or school-wide consensus.
export function quzhiAmplify(pillars:readonly {stem:string;branch:string}[]) {
  if(pillars.length!==4||pillars[2].stem!=='甲'||pillars[1].branch!=='卯') return null;
  const branches=pillars.map(p=>p.branch),stems=pillars.map(p=>p.stem);
  if(!['寅','卯','辰'].every(branch=>branches.includes(branch))) return null;
  if(stems.some(stem=>['庚','辛'].includes(stem))||branches.some(branch=>['申','酉'].includes(branch))) return null;
  // Conservative supported subset, NOT additional doctrinal claims that other cases fail the 格.
  // Retain hidden 丙/戊/癸 in 寅/辰. Never rewrite the original pillars or hidden-stem data.
  if(branches.some(branch=>!['寅','卯','辰','子'].includes(branch))) return null;
  if(stems.some(stem=>!['甲','乙','壬','癸','戊'].includes(stem))||stems.filter(stem=>stem==='戊').length>1) return null;
  const comparisons:{stronger:Element;weaker:Element;basis:string}[]=[
    {stronger:'WOOD',weaker:'METAL',basis:'동방 세 지지가 온전하고 원문에서 명시한 금의 파격자가 없다.'},
    {stronger:'WOOD',weaker:'WATER',basis:'묘월 동방 구조에서 임·계의 물을 목을 돕는 작용으로 허용한 楠曰의 해석을 따른다.'},
    {stronger:'WOOD',weaker:'EARTH',basis:'무진이 있어도 목의 순수한 기세와 신왕을 인정한 문헌 양성을 기준으로, 노출된 무토 한 자리 이하의 구조만 지원한다.'},
    {stronger:'WOOD',weaker:'FIRE',basis:'화가 천간이나 별도 화 지지에 드러나지 않고 인목 속에만 남는 검토 범위에서 목의 주도성을 해석한다.'},
  ];
  return {target:'WOOD' as const,allowed:['WOOD'] as Element[],comparisons,evidence:[
    '갑목 일간·묘월과 인·묘·진의 동방 구조를 「신봉통고」 楠曰의 곡직 해석에 따라 살펴, 목의 특성을 강조한 이름이에요.',
    '한 저자층의 전통 구조를 서비스 기준으로 해석한 결과이며, 강도를 측정한 값이나 여러 학파의 합의는 아니에요. 이름이 원국이나 삶의 결과를 바꾼다는 뜻도 아니에요.',
  ]};
}
