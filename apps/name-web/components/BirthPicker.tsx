"use client";
import { useState } from "react";
import { validateInput, type Input, type Config } from "../lib/contracts";
import { dateWheelDays } from "../lib/client/wheel";
import { Button, Dialog } from "./ui";
import { Wheel } from "./Wheel";

const numbers = (from: number, to: number, suffix: string) =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ value: String(from + i), label: `${from + i}${suffix}` }));

export function DatePicker({ input, config, choose, close }: {
  input: Input; config: Config; choose: (date: string) => void; close: () => void;
}) {
  const minYear = input.calendarType === "lunar" ? 1899 : Number(config.minDate.slice(0, 4));
  const maxYear = Number(config.maxDate.slice(0, 4));
  const [parts, setParts] = useState(() => {
    const [y, m, d] = (input.birthDate || config.maxDate).split("-").map(Number);
    const year = Math.max(minYear, Math.min(maxYear, y));
    return [year, m, Math.min(d, dateWheelDays(year, m, input.calendarType, input.isLeapMonth) || 30)];
  });
  const [error, setError] = useState("");
  const [year, month, day] = parts;
  const days = dateWheelDays(year, month, input.calendarType, input.isLeapMonth);
  const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  function change(index: number, value: string) {
    const next = [...parts];
    next[index] = Number(value);
    next[2] = Math.min(next[2], dateWheelDays(next[0], next[1], input.calendarType, input.isLeapMonth) || 30);
    setParts(next);
    setError("");
  }
  return <Dialog title="출생일 선택" onClose={close}>
    <p>{input.calendarType === "solar" ? "양력" : `음력 · ${input.isLeapMonth ? "윤달" : "평달"}`} 날짜를 위아래로 움직여 선택해 주세요.</p>
    <div className="wheel-columns date-wheels">
      <Wheel label="연도" value={String(year)} options={numbers(minYear, maxYear, "년")} onChange={(v) => change(0, v)} />
      <Wheel label="월" value={String(month)} options={numbers(1, 12, "월")} onChange={(v) => change(1, v)} />
      <Wheel label="일" value={String(day)} options={numbers(1, days || 30, "일")} onChange={(v) => change(2, v)} />
    </div>
    <p className="caption">선택 날짜: {date} · 방향키로 이동할 수 있어요.</p>
    {!days && <p role="alert" className="field-error">해당 연도에는 이 윤달이 없어요. 월을 다시 선택하거나 닫은 뒤 윤달 설정을 확인해 주세요.</p>}
    {error && <p role="alert" className="field-error">{error}</p>}
    <Button disabled={!days} onClick={() => {
      const problem = validateInput({ ...input, birthDate: date }).birthDate;
      if (problem) setError(problem);
      else choose(date);
    }}>선택 완료</Button>
    <Button variant="quiet" onClick={close}>취소</Button>
  </Dialog>;
}

export function RegionPicker({ input, config, choose, close }: {
  input: Input; config: Config; choose: (city: string) => void; close: () => void;
}) {
  const [region, setRegion] = useState(() => config.cities.find((c) => c.id === input.birthCityId)?.regionId ?? config.regions[0]?.id ?? "");
  const cities = config.cities.filter((c) => c.regionId === region);
  const [city, setCity] = useState(input.birthCityId);
  const selectedCity = cities.find((c) => c.id === city) ?? cities[0];
  return <Dialog title="출생지역 선택" onClose={close}>
    <p>시·도와 시군구를 위아래로 움직여 선택해 주세요.</p>
    <div className="wheel-columns region-wheels">
      <Wheel label="시·도" value={region} options={config.regions.map((r) => ({ value: r.id, label: r.name }))} onChange={(v) => { setRegion(v); setCity(""); }} />
      {selectedCity && <Wheel label="시군구" value={selectedCity.id} options={cities.map((c) => ({ value: c.id, label: c.name }))} onChange={setCity} />}
    </div>
    <p className="caption">선택 지역: {config.regions.find((r) => r.id === region)?.name} {selectedCity?.name ?? "선택 가능한 지역 없음"}</p>
    <Button disabled={!selectedCity} onClick={() => selectedCity && choose(selectedCity.id)}>선택 완료</Button>
    <Button variant="quiet" onClick={close}>취소</Button>
  </Dialog>;
}
