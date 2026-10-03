import { expect, it, vi } from 'vitest';
import { SearchSunLongitude } from 'astronomy-engine';
import { createAstronomyProvider } from '../src/time/providers';

// 외부 천문 공급자의 실패를 공개 어댑터 경계에서 재현한다.
vi.mock('astronomy-engine', async importOriginal => {
  const actual = await importOriginal<typeof import('astronomy-engine')>();
  return { ...actual, SearchSunLongitude: vi.fn(() => null) };
});

it('천문 공급자가 해를 찾지 못하면 빈 성공 결과로 위장하지 않는다', () => {
  expect(() => createAstronomyProvider().jieInstants(Date.UTC(2026, 0, 1), Date.UTC(2026, 1, 1)))
    .toThrowError(expect.objectContaining({ code: 'PROVIDER_FAILURE' }));
});

it('천문 공급자 예외도 안정적인 오류 코드로 감싼다', () => {
  vi.mocked(SearchSunLongitude).mockImplementationOnce(() => { throw new Error('ephemeris failed'); });
  expect(() => createAstronomyProvider().jieInstants(Date.UTC(2026, 0, 1), Date.UTC(2026, 1, 1)))
    .toThrowError(expect.objectContaining({ code: 'PROVIDER_FAILURE' }));
});
