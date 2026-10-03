import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suriValues,suriReference } from '../lib/server/suri.ts';
import { searchHanja,originalStrokes } from '../lib/server/hanja.ts';

test('채택 원전의 네 이름 형태와 가획을 계산하며 미확인·81 초과는 환산하지 않는다',()=>{
  // Published arithmetic examples, not additional birth-profile mocks.
  assert.deepEqual(suriValues([10],[13]),{won:14,hyeong:23,i:2,jeong:23});
  assert.deepEqual(suriValues([8,4],[23]),{won:24,hyeong:27,i:9,jeong:35});
  assert.deepEqual(suriValues([8],[14,4]),{won:18,hyeong:22,i:5,jeong:26});
  assert.deepEqual(suriValues([7,12],[6,12]),{won:18,hyeong:18,i:19,jeong:37});
  for(const values of [[],[null],[0],[-1],[1.2],[NaN],[Infinity],[1,2,3]]) {
    assert.equal(suriValues(values,[8]),null);
    assert.equal(suriValues([8],values),null);
  }
  assert.equal(suriValues([40],[41])?.jeong,81);
  assert.equal(suriValues([41],[41])?.jeong,null);
  assert.equal(suriValues([41],[41])?.i,2,'Only out-of-range grids are withheld');
  const kim=searchHanja({sound:'김'}).rows.find(r=>r.character==='金')!;
  assert.equal(originalStrokes(kim.id),8,'Stroke review is independent from reading-specific meaning review');
  assert.equal(originalStrokes('unverified-id'),null);
  const find=(sound:string,character:string)=>{
    let page=searchHanja({sound});
    while(!page.rows.some(r=>r.character===character)&&page.nextCursor) page=searchHanja({sound,cursor:page.nextCursor});
    return page.rows.find(r=>r.character===character)!;
  };
  const pity=find('연','憐');
  const roof=find('우','宇');
  assert.equal(originalStrokes(pity.id),16);
  assert.equal(originalStrokes(roof.id),6);
  assert.deepEqual(suriValues([originalStrokes(kim.id)],[originalStrokes(pity.id),originalStrokes(roof.id)]),{won:22,hyeong:24,i:7,jeong:30});
  for(let n=1;n<=81;n++) assert.ok(suriReference(n)?.length);
  for(const n of [0,82,-1,1.5,NaN]) assert.equal(suriReference(n),null);
  assert.match(suriReference(30)!,/반대되는 가능성/);
  assert.match(suriReference(51)!,/교대/);
  assert.match(suriReference(58)!,/다시 일어서/);
  assert.match(suriReference(81)!,/독립된 81/);
});
