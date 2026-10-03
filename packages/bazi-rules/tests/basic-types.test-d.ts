import { STEMS, BRANCHES, GANZHI_CYCLE, HIDDEN_STEMS, TEN_GODS } from '../src/index';
import type { HiddenStemRule } from '../src/index';

// @ts-expect-error 천간 표는 읽기 전용이다.
STEMS[0].stem = '乙';
// @ts-expect-error 지지 속성도 읽기 전용이다.
BRANCHES[0].element = 'fire';
// @ts-expect-error 간지 목록을 외부에서 늘릴 수 없다.
GANZHI_CYCLE.push(GANZHI_CYCLE[0]);
// @ts-expect-error 지장간 기준은 천간이 아닌 지지다.
const invalidBranch = HIDDEN_STEMS['甲'];
// @ts-expect-error 십성 대상은 지지가 아닌 천간이다.
const invalidStem = TEN_GODS['甲']['子'];
// @ts-expect-error P1은 임의 가중치 입력을 허용하지 않는다.
const inventedWeight: HiddenStemRule = { ...HIDDEN_STEMS.子[0], weight: 30 };
// @ts-expect-error 역할에 임의 라벨을 쓸 수 없다.
const inventedRole: HiddenStemRule = { ...HIDDEN_STEMS.子[0], role: 'dominant' };
void [invalidBranch, invalidStem, inventedWeight, inventedRole];
