import KoreanLunarCalendar from 'korean-lunar-calendar';
import { createCalendarContext } from '../../../../packages/bazi-engine/src/index';
import type { Analysis,Input,Recommendation } from '../contracts';
import { koreaNow } from '../contracts';
import { calculateBirth,ageBand } from './calculation';
import { findHanja,hanjaExplanation,originalStrokes,reviewedElement,HANJA_VERSION } from './hanja';
import { suriExplanations,SURI_VERSION } from './suri';
import { issueReceipt,candidateId } from './receipt';
import { phonetics,PHONETICS_VERSION } from './phonetics';
import { selectNames,NAME_REVIEW_VERSION } from './naming';
import { quzhiAmplify,winterWoodBalance,directionConsensus,nameGrade,INTERPRETATION_VERSION } from './interpretation';

export const VISIBLE_COUNT:1|2|3=3;
export function analysisVersions(input:Input):Record<string,string> {
  const versions=createCalendarContext(new KoreanLunarCalendar()).versions;
  return {...versions,lunarCalendarVersion:input.calendarType==='lunar'?versions.lunarCalendarVersion??'not-used':'not-used',
    hanjaVersion:HANJA_VERSION,suriVersion:SURI_VERSION,locationVersion:'kma-2026-07-01-v1',
    interpretationVersion:INTERPRETATION_VERSION,phoneticsVersion:PHONETICS_VERSION,nameReviewVersion:NAME_REVIEW_VERSION,publicConfigVersion:`visible-${VISIBLE_COUNT}-v1`};
}

export function analysisContent(input:Input,analysisId:string,birth=calculateBirth(input)) {
  const amplify=directionConsensus(birth.possiblePillars.map(quzhiAmplify));
  const balances=birth.possiblePillars.map(winterWoodBalance);
  const balance=directionConsensus(balances);
  const selected=selectNames(input,{balance,amplify},VISIBLE_COUNT);
  const explanations:Analysis['currentName']['explanations']=[];
  const sound=phonetics(input.surname+input.givenName);
  explanations.push({title:'이름의 소리 · 초성 기준',text:
    `${sound.syllables.map(s=>`${s.character}(${s.initial}·${s.element})`).join(' → ')}. `+
    `${sound.pairs.map(p=>`${p.left}–${p.right}: ${p.relation}`).join(', ')}. `+
    '서비스에서 채택한 초성표로 성씨와 이름의 이웃 음절만 살펴본 참고 풀이예요. 받침·연음은 반영하지 않으며, 상극이 있다는 이유로 이름 전체가 나쁘다고 판단하지 않아요.'});
  for(const key of ['surname','givenName'] as const) {
    const label=key==='surname'?'성씨':'이름';
    input[`${key}Hanja`].forEach((id,index)=>{
      if(id===null) return;
      const row=findHanja(id)!; // parseAnalysisInput already checked the row and reading.
      explanations.push({title:`${label} ${input[key][index]} · ${row.character}`,text:hanjaExplanation(id)});
    });
  }
  explanations.push({title:'출생정보 계산',text:birth.inputAccuracy==='unknown'
    ?'날짜·출생지역으로 가능한 완전 원국을 함께 살펴보았으며, 모르는 출생시간을 임의로 채우지 않았어요. 모든 후보에서 목표와 허용 범위가 확인될 때만 추천해요. 실제 시주는 미확정으로 남겨 두었어요.'
    :birth.completeness==='complete'?'입력한 날짜·시간·출생지역으로 원국을 계산했어요. 강약과 추천 방향의 검증은 별도 단계예요.'
    :'입력한 시각이 시간대·절기 또는 일시 경계의 불확실성에 걸려 일부 기둥을 하나로 확정하지 못했어요.'});
  const surnameStrokes=input.surnameHanja.map(originalStrokes);
  explanations.push(...suriExplanations(surnameStrokes,input.givenNameHanja.map(originalStrokes)));
  const givenElements=input.givenNameHanja.map(reviewedElement);
  // The adopted winter rule confirms only FIRE's role. Other elements remain
  // unknown, so neither a neutral nor an adverse grade can be inferred from them.
  const grades=balances.map(direction=>nameGrade(givenElements,direction));
  const grade=balance&&[...input.surnameHanja,...input.givenNameHanja].every(id=>id!==null)
    &&grades[0]&&grades.every(value=>value===grades[0])?grades[0]:null;
  if(balance) {
    const methodLabels:Record<string,string>={eokbu:'억부',johu:'조후',tonggwan:'통관',byeongyak:'병약'};
    for(const method of balance.methods) explanations.push({title:`균형 판단 · ${methodLabels[method.method]}`,text:method.evidence});
    const adverse=input.givenNameHanja.flatMap((id,i)=>givenElements[i]&&balance.roles[givenElements[i]!]==='discouraged'
      ?[`${input.givenName[i]}(${findHanja(id!)!.character})`]:[]);
    const gradeText=grade==='well_matched'
      ?'이름 부분의 모든 한자가 확인된 허용 오행이며, 검토한 균형 목표를 포함해요.'
      :grade==='needs_supplement'
        ?`${adverse.join('·')}의 자원오행이 검토한 균형 보완 방향에서는 비권장으로 확인됐어요. 이름이 나쁘거나 개명이 필요하다는 뜻은 아니에요.`
        :grade==='partly_supplement'
          ?'이름 부분에 확인된 비권장은 없지만, 균형 목표가 없거나 확인된 중립 오행이 섞여 있어요.'
          :'이름 부분의 한자와 균형 역할을 모두 확인하지 못해 전체 등급을 보류했어요. 미확인 오행을 임의로 중립이나 비권장으로 판단하지 않아요.';
    explanations.push({title:'이름 부분의 어울림',text:`${gradeText} 성씨·발음·수리의 종합 점수나 실제 삶의 평가가 아니에요.`});
  }
  explanations.push({title:'추천 분석 범위',text:balance?balance.evidence.join(' '):amplify?'검토한 곡직 구조에 해당해 목의 특성을 강조하는 극대화형을 살펴볼 수 있어요. 이 원국의 균형형과 현재 이름 등급은 검토 범위 밖으로 보류했어요.':'입력한 원국은 현재 검토한 추천 구조군에 해당하지 않거나 시각을 확정하지 못했어요. 입력한 이름이 나쁘다는 의미는 아니에요.'});
  const withheld=(code='RULES_NOT_VERIFIED'):Recommendation=>({status:'withheld',candidates:[],reasonCodes:[code]});
  const surname=input.surnameHanja.map((id,index)=>id?findHanja(id)!.character:input.surname[index]).join('');
  const labels={WOOD:'목',FIRE:'화',EARTH:'토',METAL:'금',WATER:'수'};
  const publish=(type:'balance'|'amplify'):Recommendation=>selected[type].length?{status:'available',reasonCodes:[],candidates:selected[type].map(row=>{
    const numerology=suriExplanations(surnameStrokes,row.hanjaIds.map(originalStrokes));
    return {
    candidateId:candidateId(analysisId,type,row.key),hangul:row.hangul,hanja:surname+row.hanja,
    meanings:row.meanings,targetElement:labels[row.targetElement],evidence:row.evidence,
    ...(numerology.length?{optionalNumerology:numerology.map(item=>`${item.title}\n${item.text}`).join('\n\n')}:{})
  };})}:withheld((type==='balance'?balance:amplify)?'CANDIDATES_INSUFFICIENT':birth.inputAccuracy==='unknown'||birth.completeness!=='complete'?'TIME_UNCERTAIN':'STRUCTURE_UNSUPPORTED');
  const currentName:Analysis['currentName']={status:grade?'rated':'partial',grade,explanations,reasonCodes:grade?[]:['RULES_NOT_VERIFIED']};
  return {solarDate:birth.normalization.solarDate,currentName,recommendations:{balance:publish('balance'),amplify:publish('amplify')}};
}

export function analyze(input:Input,browserToken:string,now=new Date()):Analysis {
  const birth=calculateBirth(input);
  const versions=analysisVersions(input);
  const receipt=issueReceipt(input,versions,browserToken,ageBand(birth.normalization.solarDate,koreaNow(now).slice(0,10)),VISIBLE_COUNT,now.getTime());
  const {solarDate:_,...content}=analysisContent(input,receipt.analysisId,birth);
  return {schemaVersion:1,...receipt,computedAt:now.toISOString(),versions,inputSnapshot:input,...content};
}
