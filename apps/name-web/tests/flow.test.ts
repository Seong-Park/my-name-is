import { test } from "node:test";
import assert from "node:assert/strict";
import { createMock, type Scenario } from "../lib/dev/mock.ts";
import { emptyInput, isAnalysis, isRecord } from "../lib/contracts.ts";
test("개발 시연의 완료·보류·회상문은 공개 응답과 보관 계약을 통과한다", async () => {
  const scenario: Scenario = {
    analysis: "success",
    story: "success",
    hanja: "rows",
    count: 3,
  };
  const { api } = createMock(() => scenario);
  const input = {
    ...emptyInput,
    birthDate: "1990-05-21",
    birthCityId: "KR-1111000000",
    surname: "김",
    givenName: "연우",
    surnameHanja: [null],
    givenNameHanja: [null, null],
  };
  for (const state of [
    "success",
    "time",
    "balance",
    "both",
    "shortage",
  ] as const) {
    scenario.analysis = state;
    const analysis = await api.analyze(input);
    assert.equal(isAnalysis(analysis), true);
    const candidate = analysis.recommendations.balance.candidates[0];
    const story = candidate
      ? await api.story(
          input,
          analysis,
          candidate.candidateId,
          0,
          crypto.randomUUID(),
        )
      : null;
    const record = {
      schemaVersion: 1,
      revision: "test",
      completedAt: analysis.computedAt,
      input,
      analysis,
      stories: story ? { [story.candidateId]: story } : {},
    };
    assert.equal(isRecord(record), true);
    assert.equal(
      isRecord({ ...record, hanjaLabels: { id: { character: 42 } } }),
      false,
    );
  }
});
