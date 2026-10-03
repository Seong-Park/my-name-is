import KoreanLunarCalendar from 'korean-lunar-calendar';
import { calculateFourPillars,createCalendarContext } from '../packages/bazi-engine/src/index.ts';
import { writeFileSync } from 'node:fs';
const expected=['壬寅','癸卯','甲子','戊辰'];
const context=createCalendarContext(new KoreanLunarCalendar());
const matches=[];
// The source chart was selected before the search; no recommendation output selects a date.
for(let day=1;day<=31;day++) {
  const birthDate=`1962-03-${String(day).padStart(2,'0')}`;
  const result=calculateFourPillars({birthDate,birthTime:'08:00',timeAccuracy:'exact',calendarType:'solar',isLeapMonth:false,timezoneId:'Asia/Seoul',longitude:126.978,latitude:37.5665,cityId:'seoul'},context);
  const pillars=(['year','month','day','hour'] as const).map(key=>result.pillars[key].status==='confirmed'?result.pillars[key].value.stem+result.pillars[key].value.branch:null);
  if(pillars.every((p,i)=>p===expected[i])) matches.push({birthDate,birthTime:'08:00',pillars,normalization:result.normalization});
}
writeFileSync('docs/research/2026-10-01-quzhi-calendar.json',JSON.stringify({source:'神峰通考 楠曰 曲直仁寿格 oldid=1378606',expected,matches,versions:context.versions,limitation:'Calendar equivalent only, not the historical person’s birth data or a validation of predicted life events.'},null,2)+'\n');
console.log(JSON.stringify(matches.map(({birthDate,birthTime,pillars})=>({birthDate,birthTime,pillars}))));
if(matches.length!==1) process.exitCode=1;
