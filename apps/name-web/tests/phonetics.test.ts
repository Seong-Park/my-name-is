import { test } from 'node:test';
import assert from 'node:assert/strict';
import { phonetics } from '../lib/server/phonetics.ts';

test('확정 초성표 19개와 받침 무관·이웃 관계를 적용한다', () => {
  assert.deepEqual([...'가까나다따라마바빠사싸아자짜차카타파하'].map(c=>phonetics(c).syllables[0].element),
    ['목','목','화','화','화','화','수','수','수','금','금','토','금','금','금','목','화','수','토']);
  assert.equal(phonetics('김').syllables[0].element, '목');
  assert.deepEqual(phonetics('김하늘').pairs.map(p=>p.relation), ['상극','상생']);
  assert.deepEqual(phonetics('늘하김').pairs.map(p=>p.relation), ['상생','상극']);
  assert.equal(phonetics('남궁가나다라마').pairs.length, 6);
  assert.deepEqual(phonetics('가카').pairs.map(p=>p.relation), ['동일 오행']);
  assert.equal(phonetics('김하늘').conflicts, 1);
  for (const invalid of ['', 'ㄱ', '가 나', 'ABC']) assert.throws(()=>phonetics(invalid));
});
