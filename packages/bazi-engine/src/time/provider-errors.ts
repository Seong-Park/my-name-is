import type { CalculationError } from '@mylife/bazi-domain';

export class CalendarProviderError extends Error implements CalculationError {
  constructor(public readonly code: CalculationError['code'], message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CalendarProviderError';
  }
}

export function assertInstant(instant: number, from: number, toExclusive: number): void {
  if (!Number.isFinite(instant)) throw new CalendarProviderError('INVALID_INPUT', 'A finite UTC instant is required');
  if (instant < from || instant >= toExclusive) throw new CalendarProviderError('UNSUPPORTED_DATE', 'Outside the versioned provider range');
}
