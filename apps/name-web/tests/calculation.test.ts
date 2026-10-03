import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyInput } from '../lib/contracts.ts';
import { parseAnalysisInput } from '../lib/server/input.ts';
import { calculateBirth, ageBand } from '../lib/server/calculation.ts';

test('실제 역법 공급자를 사용하고 시간 미상을 임의 시각으로 대체하지 않는다', () => {
  const input = parseAnalysisInput({...emptyInput,birthDate:'1990-05-21',birthCityId:'KR-1111000000',surname:'김',givenName:'연우',surnameHanja:[null],givenNameHanja:[null,null]});
  const unknown = calculateBirth(input);
  assert.equal(unknown.normalization.solarDate,'1990-05-21');
  assert.equal(unknown.normalization.kind,'interval');
  assert.equal(unknown.pillars.hour.status,'unavailable');
  assert.equal(unknown.inputAccuracy,'unknown');
  const exact = calculateBirth({...input,timeAccuracy:'exact',birthTime:'12:00'});
  assert.equal(exact.normalization.kind,'instant');
  assert.equal(exact.pillars.hour.status,'confirmed');
  assert.ok(exact.versions.calendarVersion.includes('astronomy-engine'));
  assert.ok(exact.evidence.length>0);
  assert.deepEqual(calculateBirth({...input,timeAccuracy:'exact',birthTime:'12:00'}),exact);
  assert.equal(ageBand('2020-10-02','2026-10-01'),'0–5');
  assert.equal(ageBand('2020-10-01','2026-10-01'),'6–12');
  assert.equal(ageBand('2013-10-01','2026-10-01'),'13–18');
  assert.equal(ageBand('2007-10-01','2026-10-01'),'19+');
});
