import KoreanLunarCalendar from 'korean-lunar-calendar';
import { calculateFourPillars,createCalendarContext } from '../packages/bazi-engine/src/index.ts';
import { writeFileSync } from 'node:fs';
const context=createCalendarContext(new KoreanLunarCalendar());
const cases=[{kind:'source_example',expected:['庚寅','戊子','甲寅','丙寅'],years:[1950,2010]},
  {kind:'source_based_service_inference',expected:['戊寅','甲子','甲寅','丙寅'],years:[1938,1998]}];
const results=cases.map(item=>{
  const matches=[];
  // Fixed literature structures precede this search. No person or API/LLM call.
  for(const year of item.years) for(let offset=0;offset<32;offset++) {
    const birthDate=new Date(Date.UTC(year,11,6+offset)).toISOString().slice(0,10);
    const result=calculateFourPillars({birthDate,birthTime:'04:00',timeAccuracy:'exact',calendarType:'solar',isLeapMonth:false,timezoneId:'Asia/Seoul',longitude:126.978,latitude:37.5665,cityId:'seoul'},context);
    const pillars=(['year','month','day','hour'] as const).map(key=>result.pillars[key].status==='confirmed'?result.pillars[key].value.stem+result.pillars[key].value.branch:null);
    if(pillars.every((p,i)=>p===item.expected[i])) matches.push({birthDate,birthTime:'04:00',pillars});
  }
  return {...item,matches};
});
writeFileSync('docs/research/2026-10-03-winter-wood-calendar.json',JSON.stringify({source:'2026-10-03-winter-wood-boundary.md',results,versions:context.versions,limitation:'Calendar regression data only, not historical birth data, a browser demo profile, or evidence of life outcomes.'},null,2)+'\n');
console.log(JSON.stringify(results));
if(results.some(item=>!item.matches.length)) process.exitCode=1;
