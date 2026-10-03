import type { Ganzhi } from '../ganzhi/types';

export type PillarPosition = 'year' | 'month' | 'day' | 'hour';

/** 연·월·일이 확정된 원국. 불확실한 기둥은 별도 결과 모델에서 표현한다. */
export interface FourPillars {
  year: Ganzhi;
  month: Ganzhi;
  day: Ganzhi;
  hour: Ganzhi | null;
}
