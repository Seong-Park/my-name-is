/** 원본 시간 정확도. 형식·범위 검증은 계산 입력 검증 단계에서 수행한다. */
export type BirthTimeInput =
  | { timeAccuracy: 'unknown'; birthTime: null }
  | { timeAccuracy: 'exact' | 'approximate'; birthTime: string };

/** 저장 식별자·소유권을 제외한 원국 계산용 입력 snapshot. */
export type NatalBirthInput = BirthTimeInput & {
  /** 원본 역법의 YYYY-MM-DD. 음력도 변환 전 날짜를 보존한다. */
  birthDate: string;
  calendarType: 'solar' | 'lunar';
  isLeapMonth: boolean;
  cityId: string;
  timezoneId: string;
  latitude: number;
  longitude: number;
  /** 사용자가 아는 UTC offset. 동쪽이 양수이며 역사적 초 단위를 보존한다. */
  utcOffsetSeconds?: number;
  sexForBazi?: 'male' | 'female';
};

/** 대운 계산은 명시적 계산용 성별이 필요하다. */
export type LuckBirthInput = NatalBirthInput & {
  sexForBazi: 'male' | 'female';
};
