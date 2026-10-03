import { locationData, regionData } from './locations-data';

/** A dated representative point, never an exact address or historical boundary. */
export interface Location {
  readonly cityId: string;
  readonly cityName: string;
  readonly regionId: string;
  readonly regionName: string;
  readonly districtName: string;
  readonly countryCode: 'KR';
  readonly latitude: number;
  readonly longitude: number;
  readonly timezoneId: 'Asia/Seoul';
  readonly locationDataVersion: string;
}

export const regions: readonly Readonly<{ id: string; name: string }>[] = Object.freeze(
  regionData.map(([code, name]) => Object.freeze({ id: `KR-${code}`, name })),
);

export const locations: readonly Location[] = Object.freeze(locationData.map(
  ([code, regionCode, districtName, latitude, longitude]): Location => {
    const region = regions.find(candidate => candidate.id === `KR-${regionCode}`)!;
    return Object.freeze({
      cityId: `KR-${code}`,
      cityName: region.name === districtName ? region.name : `${region.name} ${districtName}`,
      regionId: region.id, regionName: region.name, districtName,
      countryCode: 'KR', latitude, longitude, timezoneId: 'Asia/Seoul',
      locationDataVersion: 'kma-2026-07-01-v1',
    });
  },
));

export function findLocation(cityId: string): Location | undefined {
  return locations.find(location => location.cityId === cityId);
}
