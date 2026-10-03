import type { CalendarContext, JieInstant } from '../time/providers';
import { CalendarProviderError } from '../time/provider-errors';
import { MYLIFE_STANDARD_V1 } from '@mylife/bazi-rules';

/** 공급자가 반환한 절 중 출생 instant 이하의 가장 최근 경계. */
export function activeJie(instantUtcMs: number, context: CalendarContext): JieInstant {
  if (!Number.isFinite(instantUtcMs) || !Number.isFinite(new Date(instantUtcMs).getTime())) {
    throw new CalendarProviderError('INVALID_INPUT', 'Expected a valid UTC instant');
  }
  let terms: readonly JieInstant[];
  try {
    terms = context.astronomy.jieInstants(instantUtcMs, instantUtcMs);
  } catch (error) {
    if (error instanceof CalendarProviderError) throw error;
    throw new CalendarProviderError('PROVIDER_FAILURE', 'Jie provider failed', { cause: error });
  }
  if (terms.some(term => !Number.isFinite(term.instantUtcMs)
    || !Number.isFinite(new Date(term.instantUtcMs).getTime())
    || !MYLIFE_STANDARD_V1.referenceJie.includes(term.code))) {
    throw new CalendarProviderError('PROVIDER_FAILURE', 'Invalid jie boundary');
  }
  const active = terms.filter(term => term.instantUtcMs <= instantUtcMs)
    .reduce<JieInstant | undefined>((latest, term) => !latest || term.instantUtcMs > latest.instantUtcMs ? term : latest, undefined);
  if (!active || !terms.some(term => term.instantUtcMs >= instantUtcMs)) {
    throw new CalendarProviderError('PROVIDER_FAILURE', 'Jie boundaries do not bracket the instant');
  }
  return active;
}
