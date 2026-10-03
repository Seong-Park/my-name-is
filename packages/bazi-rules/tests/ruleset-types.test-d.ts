import type { ReferenceJie } from '@mylife/bazi-domain';
import { MYLIFE_STANDARD_V1 } from '../src/index';

const version: 'mylife-standard-v1' = MYLIFE_STANDARD_V1.version;
const terms: readonly ReferenceJie[] = MYLIFE_STANDARD_V1.referenceJie;
void version;
void terms;

// @ts-expect-error 승인된 버전은 소비자가 변경하지 않는다.
MYLIFE_STANDARD_V1.version = 'other';
// @ts-expect-error 일계는 readonly이다.
MYLIFE_STANDARD_V1.dayBoundary = '23:00';
// @ts-expect-error 12절 목록은 readonly이다.
MYLIFE_STANDARD_V1.referenceJie.push('입춘');
// @ts-expect-error 미승인 강약 가중치는 공개하지 않는다.
MYLIFE_STANDARD_V1.strengthWeights;
