export interface BirthLocation {
  cityId: string;
  cityName: string;
  regionId: string;
  regionName: string;
  districtName: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezoneId: string;
  locationDataVersion: string;
}

export interface BirthProfileInput {
  birthDate: string;
  birthTime: string | null;
  timeAccuracy: 'exact' | 'approximate' | 'unknown';
  calendarType: 'solar' | 'lunar';
  isLeapMonth: boolean;
  birthCityId: string;
  sexForBazi: 'male' | 'female';
}

export interface BirthProfile extends BirthProfileInput {
  id: string;
  birthLocation: BirthLocation;
  calendarValidationVersion: string;
  createdAt: string;
  updatedAt: string;
}
