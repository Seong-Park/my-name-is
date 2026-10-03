import type { NatalBirthInput, BirthInstantResolution } from '@mylife/bazi-domain';
import type { CalendarContext } from './providers';
import { resolveSolarDate } from './calendar';
import { CalendarProviderError } from './provider-errors';
import { resolveCivilDateIntervals } from './candidateIntervals';

/** 원본 입력의 실제 UTC 후보 또는 미상 날짜 구간. 진태양시·일계는 아직 적용하지 않는다. */
export function resolveBirthInstants(input: NatalBirthInput, context: CalendarContext): BirthInstantResolution {
  const solarDate = resolveSolarDate(input, context);
  if (input.utcOffsetSeconds !== undefined
    && (!Number.isInteger(input.utcOffsetSeconds) || Math.abs(input.utcOffsetSeconds) >= 86400)) {
    throw new CalendarProviderError('INVALID_INPUT', 'Expected a finite integer offset in seconds smaller than one day');
  }
  if (input.timeAccuracy === 'unknown') return { kind: 'interval', intervals: resolveCivilDateIntervals(input, solarDate, context) };
  if (!['exact', 'approximate'].includes(input.timeAccuracy) || typeof input.birthTime !== 'string'
    || !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{3})?)?$/.test(input.birthTime)) {
    throw new CalendarProviderError('INVALID_INPUT', 'Expected a valid known civil time');
  }
  const local = `${solarDate}T${input.birthTime}`;
  const coordinate = Date.parse(`${local}Z`);
  try {
    const instants = context.timezone.possibleInstants(local, input.timezoneId);
    if (instants.length === 0) throw new CalendarProviderError('DST_GAP', 'The civil time does not exist in this timezone');
    const candidates = [...new Set(instants)].sort((a, b) => a - b).map(instantUtcMs => {
      if (!Number.isFinite(instantUtcMs)) throw new CalendarProviderError('PROVIDER_FAILURE', 'Timezone returned a non-finite instant');
      const offsetSeconds = context.timezone.offsetSeconds(instantUtcMs, input.timezoneId);
      if (!Number.isInteger(offsetSeconds) || Math.abs(offsetSeconds) >= 86400
        || instantUtcMs + offsetSeconds * 1000 !== coordinate) {
        throw new CalendarProviderError('PROVIDER_FAILURE', 'Timezone candidate does not match the civil coordinate');
      }
      return { instantUtcMs, offsetSeconds };
    }).filter(candidate => input.utcOffsetSeconds === undefined || candidate.offsetSeconds === input.utcOffsetSeconds);
    const [first, ...rest] = candidates;
    if (!first) throw new CalendarProviderError('OFFSET_MISMATCH', 'The supplied offset matches no timezone candidate');
    return { kind: 'instant', candidates: [first, ...rest] };
  } catch (error) {
    if (error instanceof CalendarProviderError) throw error;
    throw new CalendarProviderError('PROVIDER_FAILURE', 'Timezone provider failed', { cause: error });
  }
}
