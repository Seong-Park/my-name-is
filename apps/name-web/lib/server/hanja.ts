import { createHash } from 'node:crypto';
import dictionary from '../../../../packages/database/data/hanja_dictionary.json';
import reviewed from '../../../../docs/research/2026-09-30-name-mvp-hanja-verification.json';
import expansion from '../../../../docs/research/2026-09-30-name-mvp-hanja-expansion.json';
import strokesAddition from '../../../../docs/research/2026-10-01-name-strokes-addition.json';
import type { Hanja } from '../contracts';
import { invalidInput } from './http';

// Server-only source data. Never import this module from a client component.
export const HANJA_VERSION = createHash('sha256').update(JSON.stringify([dictionary,reviewed,expansion,strokesAddition])).digest('hex').slice(0,16);
export type Element = 'WOOD'|'FIRE'|'EARTH'|'METAL'|'WATER';
export type RecommendationHanja = Hanja & {element:Element};
const isElement = (value:unknown):value is Element => typeof value==='string' && ['WOOD','FIRE','EARTH','METAL','WATER'].includes(value);
export const recommendationHanja:RecommendationHanja[]=[];
const key = (character: string, sound: string) => `${character}:${sound}`;
const rowsByPair = new Map<string,Hanja>();
const elementsById = new Map<string,Element>();
const strokesById = new Map<string,number>();
function row(character: string, sound: string, meaning: string | null, reviewStatus: string): Hanja {
  return {id:`h1-${[...character].map(c=>c.codePointAt(0)!.toString(16)).join('-')}-${sound.codePointAt(0)!.toString(16)}`,character,sound,meaning,reviewStatus};
}
for (const source of dictionary) {
  if (!/^[가-힣]$/.test(source.hangul_sound)) continue;
  rowsByPair.set(key(source.hanja_char,source.hangul_sound),row(source.hanja_char,source.hangul_sound,null,'기존 사전 독음 · 뜻·오행 미검토'));
}
for (const source of reviewed.rows) {
  const meaning = source.meaning.status === 'source_entry_checked' ? source.meaning.text : null;
  rowsByPair.set(key(source.character,source.reading),row(source.character,source.reading,meaning ?? null,meaning ? '독음 육안 대조·뜻 자료 확인 · 전문가 검증 아님' : '독음 육안 대조 · 뜻 미확인'));
  if(source.element.status==='reviewed_service_interpretation'&&isElement(source.element.value))
    elementsById.set(rowsByPair.get(key(source.character,source.reading))!.id,source.element.value);
  if(source.strokes.status==='source_entry_checked_under_adopted_policy'&&source.strokes.policy==='kangxi-tongwen-entry-v1')
    strokesById.set(rowsByPair.get(key(source.character,source.reading))!.id,source.strokes.original);
  if (source.recommendation_eligible && !source.remaining_gates.length && meaning && source.element.status==='reviewed_service_interpretation' && isElement(source.element.value))
    recommendationHanja.push({...rowsByPair.get(key(source.character,source.reading))!,element:source.element.value});
}
for (const source of expansion.rows) {
  const value=row(source.character,source.reading,source.meaning,'2024 허용표·뜻 자료 확인 · 전문가 검증 아님');
  rowsByPair.set(key(source.character,source.reading),value);
  if(source.element_status==='reviewed_service_interpretation'&&isElement(source.element)) elementsById.set(value.id,source.element);
  if(source.original_strokes_status==='kangxi_transcription_entry_checked'&&source.original_strokes_evidence.policy==='kangxi-tongwen-entry-v1')
    strokesById.set(value.id,source.original_strokes);
  if (source.recommendation_eligible && !source.remaining_gates.length && source.element_status==='reviewed_service_interpretation' && isElement(source.element))
    recommendationHanja.push({...value,element:source.element});
}
const rows = [...rowsByPair.values()].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
const byId = new Map(rows.map(r=>[r.id,r]));
if(strokesAddition.policy==='kangxi-tongwen-entry-v1'&&strokesAddition.status==='kangxi_transcription_entry_checked') {
  for(const source of strokesAddition.rows) for(const row of rows) if(row.character===source.character)
    strokesById.set(row.id,source.kangxi_total);
}
export const findHanja = (id: string) => byId.get(id);
export const reviewedElement = (id:string|null) => id===null?null:elementsById.get(id)??null;
export const originalStrokes = (id:string|null) => id===null?null:strokesById.get(id)??null;
export function hanjaExplanation(id:string):string {
  const row=findHanja(id);
  if(!row) throw invalidInput();
  const meaning=row.meaning?`${row.meaning} ${row.reviewStatus}.`:'선택한 자형과 독음은 확인했지만, 이 독음의 뜻은 아직 검토되지 않았어요.';
  const element=elementsById.get(id);
  const labels={WOOD:'목',FIRE:'화',EARTH:'토',METAL:'금',WATER:'수'};
  return meaning+(element?` 뜻을 바탕으로 채택한 자원오행은 ${labels[element]}입니다. 서비스 해석이며, 이 배속만으로 사주에 잘 맞는지나 이름 전체의 등급을 정하지 않아요.`:'');
}
export function searchHanja(input: Record<string, unknown>): {rows:Hanja[];nextCursor:string|null} {
  if (Object.keys(input).some(k=>k!=='sound'&&k!=='cursor') || typeof input.sound!=='string' || !/^[가-힣]$/.test(input.sound)) throw invalidInput();
  const matching = rows.filter(r=>r.sound===input.sound);
  let offset = 0;
  if (Object.hasOwn(input,'cursor')) {
    if (typeof input.cursor !== 'string' || input.cursor.length>256 || !/^[A-Za-z0-9_-]+$/.test(input.cursor)) throw invalidInput();
    try {
      const bytes=Buffer.from(input.cursor,'base64url');
      if (bytes.toString('base64url')!==input.cursor) throw invalidInput();
      const c: unknown=JSON.parse(bytes.toString('utf8'));
      if (!c || typeof c!=='object' || Array.isArray(c)) throw invalidInput();
      const p=c as Record<string,unknown>;
      if (Object.keys(p).sort().join(',')!=='o,s,v' || p.v!==HANJA_VERSION || p.s!==input.sound || typeof p.o!=='number' || !Number.isSafeInteger(p.o) || p.o<=0 || p.o%30!==0 || p.o>=matching.length) throw invalidInput();
      offset=p.o;
    } catch { throw invalidInput(); }
  }
  const next=offset+30;
  return {rows:matching.slice(offset,next),nextCursor:next<matching.length ? Buffer.from(JSON.stringify({v:HANJA_VERSION,s:input.sound,o:next})).toString('base64url') : null};
}
