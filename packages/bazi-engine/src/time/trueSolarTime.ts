import type { EvidenceItem } from '@mylife/bazi-domain';
import type { CalendarContext } from './providers';
import { CalendarProviderError } from './provider-errors';

export interface SolarDateTime {
  readonly date: string;
  /** [0, 86400), 소수 초를 보존한다. timezone 없는 태양시 좌표다. */
  readonly secondOfDay: number;
}

export interface TrueSolarTime extends SolarDateTime {
  readonly longitudeSeconds: number;
  readonly equationOfTimeSeconds: number;
  readonly evidence: readonly EvidenceItem[];
  readonly uncertainty: {
    readonly seconds: number;
    readonly basis: CalendarContext['uncertainty']['basis'];
    readonly earliest: SolarDateTime;
    readonly latest: SolarDateTime;
  };
  readonly limitations: readonly string[];
}

function solarCoordinate(coordinateMs: number): SolarDateTime {
  const dayStartMs = Math.floor(coordinateMs / 86400000) * 86400000;
  const day = new Date(dayStartMs);
  if (!Number.isFinite(day.getTime()) || day.getUTCFullYear() < 1 || day.getUTCFullYear() > 9999) {
    throw new CalendarProviderError('PROVIDER_FAILURE', 'Solar correction produced an unsupported date');
  }
  return {
    date: day.toISOString().slice(0, 10),
    secondOfDay: (coordinateMs - dayStartMs) / 1000,
  };
}

/** UTC instant는 Task 12에서 이미 offset/DST를 적용했다. */
export function toTrueSolarTime(instantUtcMs: number, longitude: number, context: CalendarContext): TrueSolarTime {
  if (!Number.isFinite(instantUtcMs) || !Number.isFinite(new Date(instantUtcMs).getTime())
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new CalendarProviderError('INVALID_INPUT', 'Expected a valid UTC instant and longitude in [-180, 180]');
  }
  const longitudeSeconds = longitude * 240;
  let equationOfTimeSeconds: number;
  try {
    equationOfTimeSeconds = context.astronomy.equationOfTimeSeconds(instantUtcMs);
  } catch (error) {
    if (error instanceof CalendarProviderError) throw error;
    throw new CalendarProviderError('PROVIDER_FAILURE', 'Equation-of-time provider failed', { cause: error });
  }
  const coordinateMs = instantUtcMs + longitudeSeconds * 1000 + equationOfTimeSeconds * 1000;
  const uncertaintySeconds = context.uncertainty.equationOfTimeSeconds;
  if (!Number.isFinite(equationOfTimeSeconds) || !Number.isFinite(uncertaintySeconds) || uncertaintySeconds < 0) {
    throw new CalendarProviderError('PROVIDER_FAILURE', 'Invalid equation of time or uncertainty budget');
  }
  return {
    ...solarCoordinate(coordinateMs),
    longitudeSeconds,
    equationOfTimeSeconds,
    uncertainty: {
      seconds: uncertaintySeconds,
      basis: context.uncertainty.basis,
      earliest: solarCoordinate(coordinateMs - uncertaintySeconds * 1000),
      latest: solarCoordinate(coordinateMs + uncertaintySeconds * 1000),
    },
    limitations: [...context.limitations],
    evidence: [{
      ruleCode: 'TRUE_SOLAR_TIME_UTC_LONGITUDE_EOT_V1',
      rulesetVersion: context.versions.rulesetVersion,
      references: [{ kind: 'input', field: 'longitude' }],
    }],
  };
}
