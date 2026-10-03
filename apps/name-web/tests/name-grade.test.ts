import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nameGrade } from '../lib/server/interpretation.ts';

// §3.3 contract example, not a researched person's chart or a new demo profile.
const direction={target:'WATER' as const,roles:{WATER:'allowed',METAL:'allowed',FIRE:'discouraged',WOOD:'neutral',EARTH:'neutral'} as const};
test('현재 이름 등급은 미확정 우선·비권장·목표/허용·중립 순서로 판단한다',()=>{
 assert.equal(nameGrade(['WATER','WATER'],direction),'well_matched');
 assert.equal(nameGrade(['WOOD','WATER'],direction),'partly_supplement');
 assert.equal(nameGrade(['METAL'],direction),'partly_supplement');
 assert.equal(nameGrade(['FIRE','WATER'],direction),'needs_supplement');
 assert.equal(nameGrade(['FIRE',null],direction),null);
 assert.equal(nameGrade(['WOOD'],{target:'FIRE',roles:{FIRE:'allowed'}}),null);
 assert.equal(nameGrade(['WATER'],null),null);
 assert.equal(nameGrade([],direction),null);
 for(let n=1;n<=5;n++) assert.equal(nameGrade(Array(n).fill('WATER'),direction),'well_matched');
});
