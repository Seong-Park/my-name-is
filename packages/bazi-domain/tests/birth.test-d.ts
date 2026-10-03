import type {
  BirthLocation,
  BirthProfile,
  BirthProfileInput,
  BirthTimeInput,
  LuckBirthInput,
  NatalBirthInput,
} from '../src/index';

// 저장 API 소비자가 사용하는 기존 원본 입력 계약.
const storedInput: BirthProfileInput = {
  birthDate: '1995-01-01',
  birthTime: null,
  timeAccuracy: 'unknown',
  calendarType: 'lunar',
  isLeapMonth: false,
  birthCityId: 'test-city',
  sexForBazi: 'male',
};
const location: BirthLocation = {
  cityId: 'test-city', cityName: '테스트 도시',
  regionId: 'test-region', regionName: '테스트 지역', districtName: '테스트 구',
  countryCode: 'KR', latitude: 37.5, longitude: 127,
  timezoneId: 'Asia/Seoul', locationDataVersion: 'test-v1',
};
const storedProfile: BirthProfile = {
  ...storedInput, id: 'test-profile', birthLocation: location,
  calendarValidationVersion: 'test-v1',
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};
const { sexForBazi: storedSex, ...withoutSex } = storedInput;
// @ts-expect-error 저장용 입력의 성별 필수 계약은 유지한다.
const invalidStoredInput: BirthProfileInput = withoutSex;

const unknownTime: BirthTimeInput = { timeAccuracy: 'unknown', birthTime: null };
const exactTime: BirthTimeInput = { timeAccuracy: 'exact', birthTime: '12:30' };
const approximateTime: BirthTimeInput = { timeAccuracy: 'approximate', birthTime: '12:30:15' };
// @ts-expect-error 시간 미상에 임의 대표시각을 넣을 수 없다.
const inventedTime: BirthTimeInput = { timeAccuracy: 'unknown', birthTime: '12:00' };
// @ts-expect-error exact는 시각이 필요하다.
const missingExactTime: BirthTimeInput = { timeAccuracy: 'exact', birthTime: null };
// @ts-expect-error approximate도 대표시각이 필요하다.
const missingApproximateTime: BirthTimeInput = { timeAccuracy: 'approximate', birthTime: null };

// 원국 계산은 저장 ID·소유권·계산용 성별 없이 가능하다.
const natalWithoutSex: NatalBirthInput = {
  ...unknownTime,
  birthDate: '1995-01-01', calendarType: 'solar', isLeapMonth: false,
  cityId: location.cityId, timezoneId: location.timezoneId,
  latitude: location.latitude, longitude: location.longitude,
};
const natalWithOffset: NatalBirthInput = {
  ...natalWithoutSex, ...exactTime, utcOffsetSeconds: 30472, sexForBazi: 'female',
};
// @ts-expect-error 대운 계산에서는 성별이 필수다.
const luckWithoutSex: LuckBirthInput = natalWithoutSex;
const luckMale: LuckBirthInput = { ...natalWithoutSex, sexForBazi: 'male' };
const luckFemale: LuckBirthInput = { ...natalWithoutSex, sexForBazi: 'female' };
// @ts-expect-error 계정 성별을 추정값으로 넣지 않는다.
const invalidLuckSex: LuckBirthInput = { ...natalWithoutSex, sexForBazi: 'unknown' };
// @ts-expect-error 원국 계산에서도 시간 미상+문자열은 거절한다.
const invalidNatalTime: NatalBirthInput = { ...natalWithoutSex, timeAccuracy: 'unknown', birthTime: '12:00' };
// @ts-expect-error offset은 초 단위 숫자이며 표시 문자열이 아니다.
const invalidOffset: NatalBirthInput = { ...natalWithoutSex, utcOffsetSeconds: '+09:00' };

function narrowBirthTime(input: BirthTimeInput): string | null {
  if (input.timeAccuracy === 'unknown') {
    const absent: null = input.birthTime;
    return absent;
  }
  const present: string = input.birthTime;
  return present;
}

void [storedProfile, storedSex, invalidStoredInput, exactTime, approximateTime,
  inventedTime, missingExactTime, missingApproximateTime, natalWithOffset,
  luckWithoutSex, luckMale, luckFemale, invalidLuckSex, invalidNatalTime, invalidOffset,
  narrowBirthTime];
