import fs from 'node:fs';
import path from 'node:path';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import { HIDDEN_STEMS } from '../packages/bazi-rules/src/hidden-stems.ts';
import { calculateFourPillars, createCalendarContext } from '../packages/bazi-engine/src/index.ts';

const context = createCalendarContext(new KoreanLunarCalendar());
const stemElements: Record<string, string> = { 甲: '木', 乙: '木', 丙: '火', 丁: '火' };
const expectedHidden: Record<string, string[]> = { 寅: ['甲:main', '丙:middle', '戊:residual'], 卯: ['乙:main'] };
const dates = [1914, 1974].flatMap(year => Array.from({ length: 31 }, (_, i) => `${year}-03-${String(i + 1).padStart(2, '0')}`));
const times = ['00:00', '04:00', '06:00', '08:00', '12:00', '18:00'];
const records: any[] = [];

for (const birthDate of dates) for (const birthTime of times) {
  const result = calculateFourPillars({ birthDate, birthTime, timeAccuracy: 'exact', calendarType: 'solar', isLeapMonth: false,
    timezoneId: 'Asia/Seoul', longitude: 126.978, latitude: 37.5665, cityId: 'seoul' }, context);
  const fields = result.pillars;
  const complete = result.completeness === 'complete' && Object.values(fields).every((p: any) => p.status === 'confirmed');
  const p = Object.fromEntries(Object.entries(fields).map(([key, value]: [string, any]) => [key, value.status === 'confirmed' ? value.value : null]));
  const pillars = [p.year, p.month, p.day, p.hour];
  const stems = pillars.map(x => x?.stem);
  const branches = pillars.map(x => x?.branch);
  const hidden = branches.flatMap((branch, position) => (branch && HIDDEN_STEMS[branch as keyof typeof HIDDEN_STEMS] || []).map(({ stem, role }) => ({ position, branch, stem, role })));
  const d6 = complete && branches.every((branch, position) => {
    const expected = expectedHidden[branch];
    const actual = hidden.filter(row => row.position === position).map(row => `${row.stem}:${row.role}`);
    return !!expected && actual.length === expected.length && actual.every((entry, i) => entry === expected[i]);
  });
  const D = {
    D0: complete,
    D1: complete && p.day.stem === '甲' && p.month.branch === '卯',
    D2: complete && branches.every(branch => ['寅', '卯'].includes(branch)),
    D3: complete && stems.every(stem => ['甲', '乙', '丙', '丁'].includes(stem)),
    D4: complete && stems.includes('丁') && stems.filter(stem => stemElements[stem] === '木').length >= 2
      && stems.filter(stem => stemElements[stem] === '火').length <= 2,
    D5: complete && branches.includes('寅'),
    D6: d6,
  };
  records.push({ birthDate, birthTime, completeness: result.completeness, pillars, hiddenStems: hidden, predicates: D,
    insideCandidateDomain: Object.values(D).every(Boolean) });
}

const positives = records.filter(row => row.insideCandidateDomain);
const controls = records.filter(row => !row.insideCandidateDomain);
if (positives.some(row => !['04:00', '06:00'].includes(row.birthTime))) throw new Error('Unexpected positive outside 04:00/06:00 target times.');
const output = {
  status: 'calendar_engine_predicate_check_only',
  scope: 'M3 calculateFourPillars, 1974-03 Seoul civil time; no strength or interpretation validation',
  engine: 'packages/bazi-engine calculateFourPillars + packages/bazi-rules HIDDEN_STEMS P1',
  contextVersions: context.versions,
  search: { years: [1914, 1974], dates, timezoneId: 'Asia/Seoul', longitude: 126.978, latitude: 37.5665, times,
    targetPositiveTimes: ['04:00', '06:00'], positiveCount: positives.length,
    positiveDateTimes: positives.map(({ birthDate, birthTime }) => ({ birthDate, birthTime })),
    controlsChecked: controls.length, positiveRecords: positives, controlSamples: controls.slice(0, 8) },
  limitations: [...context.limitations, 'A positive only establishes actual calendar-connected D0-D6 membership under this engine and P1 table; it is not independent bazi validation.'],
};
fs.writeFileSync(path.resolve('docs/research/2026-09-30-name-mvp-support-calendar-check.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(`OK: ${positives.length} D0-D6 positives; ${controls.length} negative date/time controls`);
