import { expect, it } from 'vitest';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import type { NatalBirthInput } from '@mylife/bazi-domain';
import { calculateFourPillarsWithCandidates, createCalendarContext } from '../src/index';
const context=createCalendarContext(new KoreanLunarCalendar());
const zero={...context,uncertainty:{...context.uncertainty,jieSeconds:0,equationOfTimeSeconds:0},astronomy:{...context.astronomy,equationOfTimeSeconds:()=>0,jieInstants:(a:number,b:number)=>context.astronomy.jieInstants(a,b).map(j=>({...j,uncertaintySeconds:0}))}};
const input:NatalBirthInput={birthDate:'2026-01-02',birthTime:null,timeAccuracy:'unknown',calendarType:'solar',isLeapMonth:false,cityId:'test',timezoneId:'Etc/UTC',latitude:0,longitude:0};
it('미상의 13개 연동 원국은 일계 전 12시진과 다음 일주의 자시만 포함한다',()=>{
 const r=calculateFourPillarsWithCandidates(input,zero);
 expect(r.pillars.hour.status).toBe('unavailable');
 expect(r.completeness).toBe('partial');
 expect(r.possiblePillars).toHaveLength(13);
 expect(r.possiblePillars.map(p=>[p[2].index,p[3].index])).toEqual([...Array.from({length:12},(_,i)=>[12,24+i]),[13,36]]);
});
it('정확한 일계 오차에서도 이전 날의 새 자시 같은 불가능한 조합은 만들지 않는다',()=>{
 const r=calculateFourPillarsWithCandidates({...input,birthTime:'22:59:55',timeAccuracy:'exact'},{...zero,uncertainty:{...zero.uncertainty,equationOfTimeSeconds:10}});
 expect(r.possiblePillars.map(p=>[p[2].index,p[3].index])).toEqual([[12,35],[13,36]]);
});
it('미상 날짜 제외 끝점의 새 일주는 후보가 아니다',()=>{
 const r=calculateFourPillarsWithCandidates({...input,longitude:-15},zero);
 expect(new Set(r.possiblePillars.map(p=>p[2].index))).toEqual(new Set([12]));
});
it('입춘의 연월은 전후 두 쌍만 존재하며 연도와 월을 독립 조합하지 않는다',()=>{
 const r=calculateFourPillarsWithCandidates({...input,birthDate:'2026-02-03'},zero);
 expect(new Set(r.possiblePillars.map(p=>`${p[0].index}/${p[1].index}`))).toEqual(new Set(['41/25','42/26']));
});

it.each([120,20])('절입과 일계 %s초 간격의 독립 오차는 같은 실제 시각에서 겹칠 때만 결합한다',gap=>{
 const jie=zero.astronomy.jieInstants(Date.parse('2026-02-01T00:00:00Z'),Date.parse('2026-02-05T00:00:00Z')).find(j=>j.code==='입춘')!;
 const date=new Date(jie.instantUtcMs).toISOString().slice(0,10);
 const midnight=Date.parse(`${date}T00:00:00Z`);
 const longitude=(midnight+23*3600000-jie.instantUtcMs-gap*1000)/240000;
 const start=jie.instantUtcMs-60000,end=jie.instantUtcMs+180000;
 const narrow={...zero,uncertainty:{...zero.uncertainty,jieSeconds:30,equationOfTimeSeconds:10},timezone:{...zero.timezone,civilDateIntervals:()=>[{startUtcMs:start,endUtcMs:end,offsetSeconds:0,startInclusive:true as const,endInclusive:false as const}]}};
 const r=calculateFourPillarsWithCandidates({...input,birthDate:date,longitude},narrow);
 const actual=new Set(r.possiblePillars.map(p=>`${p[0].index}/${p[1].index}/${p[3].branch}`));
 const expected=['41/25/亥','42/26/亥','42/26/子'];
 if(gap===20) expected.push('41/25/子');
 expect(actual).toEqual(new Set(expected));
});

it.each(['1988-05-08','1988-10-09'])('한국 서머타임 %s의 유효한 정확 시각 후보를 미상 집합에서 잃지 않는다',birthDate=>{
 const birth={...input,birthDate,timezoneId:'Asia/Seoul',longitude:126.978};
 const unknown=calculateFourPillarsWithCandidates(birth,context);
 const keys=new Set(unknown.possiblePillars.map(p=>p.map(v=>v.index).join('/')));
 expect(unknown.inputAccuracy).toBe('unknown');
 expect(unknown.pillars.hour.status).toBe('unavailable');
 for(const birthTime of ['00:00','01:30','03:00','12:00','23:59']) {
  const exact=calculateFourPillarsWithCandidates({...birth,birthTime,timeAccuracy:'exact'},context);
  for(const p of exact.possiblePillars) expect(keys.has(p.map(v=>v.index).join('/'))).toBe(true);
 }
});

it('제외 끝점 직전 0.5ms의 일계 후보도 보존한다',()=>{
 const start=Date.parse('2026-01-02T22:59:59.998Z');
 const tiny={...zero,astronomy:{...zero.astronomy,equationOfTimeSeconds:()=>0.0005},timezone:{...zero.timezone,civilDateIntervals:()=>[{startUtcMs:start,endUtcMs:start+2,offsetSeconds:0,startInclusive:true as const,endInclusive:false as const}]}};
 const r=calculateFourPillarsWithCandidates(input,tiny);
 expect(r.possiblePillars.map(p=>[p[2].index,p[3].index])).toEqual([[12,35],[13,36]]);
});

it('한 부동소수점 간격의 마지막 구간에서도 중간점 반올림으로 제외 끝점을 포함하지 않는다',()=>{
 const end=Date.parse('2026-01-02T23:00:00Z');
 const view=new DataView(new ArrayBuffer(8)); view.setFloat64(0,end); view.setBigUint64(0,view.getBigUint64(0)-1n);
 const start=view.getFloat64(0);
 const tiny={...zero,timezone:{...zero.timezone,civilDateIntervals:()=>[{startUtcMs:start,endUtcMs:end,offsetSeconds:0,startInclusive:true as const,endInclusive:false as const}]}};
 expect(calculateFourPillarsWithCandidates(input,tiny).possiblePillars.map(p=>[p[2].index,p[3].index])).toEqual([[12,35]]);
});
