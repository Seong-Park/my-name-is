import { test } from "node:test";
import assert from "node:assert/strict";
import { dateWheelDays, wheelIndex } from "../lib/client/wheel.ts";

test("휠은 양력 윤년과 음력 실제 월 길이를 유지한다", () => {
  assert.equal(dateWheelDays(2000, 2, "solar", false), 29);
  assert.equal(dateWheelDays(1900, 2, "solar", false), 28);
  assert.equal(dateWheelDays(2025, 6, "lunar", true), 29);
  assert.equal(dateWheelDays(2025, 6, "lunar", false), 30);
  assert.equal(dateWheelDays(2025, 5, "lunar", true), 0);
});

test("휠 키보드는 끝에서 멈추고 Home/End 및 Page 이동을 지원한다", () => {
  assert.equal(wheelIndex("ArrowUp", 0, 12), 0);
  assert.equal(wheelIndex("ArrowDown", 11, 12), 11);
  assert.equal(wheelIndex("Home", 8, 12), 0);
  assert.equal(wheelIndex("End", 3, 12), 11);
  assert.equal(wheelIndex("PageDown", 3, 12), 8);
  assert.equal(wheelIndex("PageUp", 3, 12), 0);
  assert.equal(wheelIndex("Tab", 3, 12), null);
});
