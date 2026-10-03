"use client";
import { useState } from "react";
import {
  validateInput,
  type Config,
  type Errors,
  type Input,
} from "../lib/contracts";
import { Button, Choices, Field, fieldA11y, Notice, Progress } from "./ui";
import { DatePicker, RegionPicker } from "./BirthPicker";
export function BirthForm({
  input,
  update,
  config,
  configError,
  reload,
  next,
}: {
  input: Input;
  update: (v: Input) => void;
  config: Config | null;
  configError: string;
  reload: () => void;
  next: () => void;
}) {
  const [errors, setErrors] = useState<Errors>({});
  const [picker, setPicker] = useState<"date" | "region" | null>(null);
  const city = config?.cities.find((c) => c.id === input.birthCityId);
  const regionName = config?.regions.find((r) => r.id === city?.regionId)?.name;
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const all = validateInput(input);
    const v: Errors = {
      birthDate: all.birthDate,
      birthTime: all.birthTime,
      birthCityId: all.birthCityId,
    };
    if (!config?.cities.some((c) => c.id === input.birthCityId))
      v.birthCityId = "출생지역을 목록에서 선택해 주세요.";
    setErrors(v);
    const first = Object.keys(v).find((k) => v[k as keyof Errors]);
    if (first)
      requestAnimationFrame(() => document.getElementById(first)?.focus());
    else next();
  }
  return (
    <>
    <form className="stack" noValidate onSubmit={submit}>
      <Progress step={1} />
      <Choices
        name="calendar"
        label="역법"
        options={{ solar: "양력", lunar: "음력" }}
        value={input.calendarType}
        onChange={(calendarType) =>
          update({ ...input, calendarType, isLeapMonth: false })
        }
      />
      {input.calendarType === "lunar" && (
        <label className="check">
          <input
            type="checkbox"
            checked={input.isLeapMonth}
            onChange={(e) =>
              update({ ...input, isLeapMonth: e.target.checked })
            }
          />
          윤달
        </label>
      )}
      <Field
        id="birthDate"
        label="출생일"
        error={errors.birthDate}
        help={
          input.calendarType === "lunar"
            ? "음력 원본 날짜를 입력해 주세요. 양력 환산 1900년부터 한국시간 오늘까지 확인해요."
            : "1900년부터 한국시간 오늘까지"
        }
      >
        <button type="button" {...fieldA11y("birthDate", errors.birthDate)}
          className="control picker-trigger" aria-haspopup="dialog"
          disabled={!config} onClick={() => setPicker("date")}>
          {input.birthDate || "연 · 월 · 일 선택"}<span aria-hidden="true">⌄</span>
        </button>
      </Field>
      <label className="check">
        <input
          type="checkbox"
          checked={input.timeAccuracy === "unknown"}
          onChange={(e) =>
            update({
              ...input,
              timeAccuracy: e.target.checked ? "unknown" : "exact",
              birthTime: e.target.checked ? null : "",
            })
          }
        />
        출생시간을 몰라요
      </label>
      <p>시간을 몰라도 계속할 수 있어요. 정오로 대신 입력하지 않아요.</p>
      <Field
        id="birthTime"
        label="시 · 분"
        error={errors.birthTime}
        help={
          input.timeAccuracy === "unknown"
            ? "정확한 시간을 모르셔도 괜찮아요."
            : "정확한 시와 분을 입력해 주세요."
        }
      >
        <input
          {...fieldA11y("birthTime", errors.birthTime)}
          className="control"
          type={input.timeAccuracy === "unknown" ? "text" : "time"}
          disabled={input.timeAccuracy === "unknown"}
          value={
            input.timeAccuracy === "unknown"
              ? "시간 모름"
              : (input.birthTime ?? "")
          }
          onChange={(e) => update({ ...input, birthTime: e.target.value })}
        />
      </Field>
      {configError && (
        <Notice kind="error" title="지역 목록을 불러오지 못했어요">
          <p>{configError}</p>
          <Button variant="secondary" onClick={reload}>
            다시 불러오기
          </Button>
        </Notice>
      )}
      <Field id="birthCityId" label="출생지역" error={errors.birthCityId}
        help="국내 시·도와 시군구를 선택해 주세요. 상세 주소는 받지 않아요.">
        <button type="button" {...fieldA11y("birthCityId", errors.birthCityId)}
          className="control picker-trigger" aria-haspopup="dialog"
          disabled={!config} onClick={() => setPicker("region")}>
          {city ? regionName + " " + city.name : config ? "시·도 · 시군구 선택" : "지역 목록 불러오는 중…"}
          <span aria-hidden="true">⌄</span>
        </button>
      </Field>
      <Button type="submit" disabled={!config}>
        다음
      </Button>
    </form>
    {config && picker === "date" && <DatePicker input={input} config={config}
      close={() => setPicker(null)} choose={(birthDate) => {
        update({ ...input, birthDate }); setErrors({ ...errors, birthDate: undefined }); setPicker(null);
      }} />}
    {config && picker === "region" && <RegionPicker input={input} config={config}
      close={() => setPicker(null)} choose={(birthCityId) => {
        update({ ...input, birthCityId }); setErrors({ ...errors, birthCityId: undefined }); setPicker(null);
      }} />}
    </>
  );
}
