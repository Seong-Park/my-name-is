import { writeFileSync } from 'node:fs';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import { calculateFourPillars, createCalendarContext } from '../packages/bazi-engine/src/index.ts';

// Selected from the source before running this search, not from engine successes.
// These are calendar equivalents in Seoul, not the historical person's birth data.
const cases = [
  { id: 'DTSCW-four-knowledge-wood', expected: ['壬辰','壬寅','甲寅','庚午'], year: 2012, month: 2, days: 29, time: '12:00' },
  { id: 'DTSCW-strength-excess-wood', expected: ['甲辰','丁卯','甲子','戊辰'], year: 1964, month: 3, days: 31, time: '08:00' },
];
const context = createCalendarContext(new KoreanLunarCalendar());
const results = cases.map(item => {
  const matches = [];
  for (let day = 1; day <= item.days; day++) {
    const birthDate = `${item.year}-${String(item.month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const result = calculateFourPillars({birthDate,birthTime:item.time,timeAccuracy:'exact',calendarType:'solar',isLeapMonth:false,
      timezoneId:'Asia/Seoul',longitude:126.978,latitude:37.5665,cityId:'seoul'}, context);
    const pillars = ['year','month','day','hour'].map(key => {
      const pillar = result.pillars[key as keyof typeof result.pillars];
      return pillar.status === 'confirmed' ? pillar.value.stem + pillar.value.branch : null;
    });
    if (pillars.every((pillar,index) => pillar === item.expected[index]))
      matches.push({birthDate,birthTime:item.time,pillars,completeness:result.completeness,normalization:result.normalization});
  }
  return {...item,matches,status:matches.length ? 'calendar_equivalent_found' : 'no_match_in_preselected_window'};
});
writeFileSync('docs/research/2026-10-01-name-mvp-literature-calendar.json', JSON.stringify({
  status:'calendar_link_only_not_interpretation_validation',
  sourceReview:'2026-10-01-name-mvp-independent-cases.md',
  versions:context.versions, timezone:'Asia/Seoul',longitude:126.978,latitude:37.5665,
  results, limitations:[...context.limitations,'No claim about historical birth dates, expert review, four-method agreement or recommendation eligibility.'],
},null,2)+'\n');
const summary = results.map(({id,status,matches}) => ({
  id,status,matches:matches.map(({birthDate,birthTime,pillars})=>({birthDate,birthTime,pillars})),
}));
console.log(JSON.stringify(summary));
