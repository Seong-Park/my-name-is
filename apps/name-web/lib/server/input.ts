import type { NatalBirthInput } from '../../../../packages/bazi-domain/src/birth/input';
import { findLocation } from '../../../../packages/bazi-application/src/reference/locations';
import { isInput, normalizeName, validateInput, type Input } from '../contracts';
import { findHanja } from './hanja';
import { invalidInput } from './http';

export function parseAnalysisInput(body: Record<string, unknown>, now = new Date()): Input {
  const input = {
    ...body,
    mood: Object.hasOwn(body, 'mood') ? body.mood : 'any',
    surname: typeof body.surname === 'string' ? normalizeName(body.surname) : body.surname,
    givenName: typeof body.givenName === 'string' ? normalizeName(body.givenName) : body.givenName,
  };
  if (Object.keys(validateInput(input, now)).length || !isInput(input) || !findLocation(input.birthCityId)) throw invalidInput();
  for (const key of ['surname', 'givenName'] as const) {
    for (const [index, id] of input[`${key}Hanja`].entries()) {
      if (id !== null && findHanja(id)?.sound !== input[key][index]) throw invalidInput();
    }
  }
  return input;
}

export function toNatalInput(input: Input): NatalBirthInput {
  const location = findLocation(input.birthCityId);
  if (!location) throw invalidInput();
  return {
    birthDate: input.birthDate,
    calendarType: input.calendarType,
    isLeapMonth: input.isLeapMonth,
    cityId: location.cityId,
    timezoneId: location.timezoneId,
    latitude: location.latitude,
    longitude: location.longitude,
    ...(input.timeAccuracy === 'unknown'
      ? {timeAccuracy: 'unknown', birthTime: null}
      : {timeAccuracy: 'exact', birthTime: input.birthTime!}),
  };
}
