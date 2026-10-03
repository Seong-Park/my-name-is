import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeName,
  validateInput,
  sameInput,
  emptyInput,
} from "../lib/contracts.ts";

test("API 입력 일치는 JSON 속성 순서에 영향받지 않는다", () => {
  const input = {
    ...emptyInput,
    surname: "김",
    givenName: "연우",
    surnameHanja: [null],
    givenNameHanja: [null, null],
  };
  const reordered = { ...input, surname: "김" };
  delete (reordered as Partial<typeof input>).surname;
  reordered.surname = "김";
  assert.equal(sameInput(input, reordered), true);
  assert.equal(sameInput(input, { ...input, givenName: "가나" }), false);
});

test("입력은 성씨와 이름을 분리하고 시간 모름을 null로 유지한다", () => {
  assert.equal(normalizeName(" 가 "), "가");
  const input = {
    schemaVersion: 1,
    birthDate: "1990-05-21",
    calendarType: "solar",
    isLeapMonth: false,
    timeAccuracy: "unknown",
    birthTime: null,
    birthCityId: "KR-11110",
    surname: "박",
    givenName: "가나",
    surnameHanja: [null],
    givenNameHanja: [null, null],
    mood: "any",
  };
  assert.deepEqual(validateInput(input), {});
  assert.ok(validateInput({ ...input, birthDate: "1990-02-30" }).birthDate);
  assert.ok(validateInput({ ...input, givenName: "가 나" }).givenName);
  assert.ok(validateInput({ ...input, birthTime: "12:00" }).birthTime);
  assert.ok(validateInput({ ...input, isLeapMonth: true }).birthDate);
});
