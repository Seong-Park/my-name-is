"use client";
import { useState } from "react";
import {
  moods,
  normalizeName,
  validateInput,
  type Errors,
  type Hanja,
  type Input,
} from "../lib/contracts";
import type { Api } from "../lib/client/api";
import { Button, Choices, Field, fieldA11y, Progress } from "./ui";
import { HanjaPicker } from "./HanjaPicker";
export function NameForm({
  input,
  update,
  api,
  next,
  labels,
  setLabels,
}: {
  input: Input;
  update: (v: Input) => void;
  api: Api;
  next: () => void;
  labels: Record<string, Hanja>;
  setLabels: (v: Record<string, Hanja>) => void;
}) {
  const [errors, setErrors] = useState<Errors>({});
  const [picker, setPicker] = useState<{
    field: "surname" | "givenName";
    index: number;
    sound: string;
  } | null>(null);
  function change(field: "surname" | "givenName", value: string) {
    update({
      ...input,
      [field]: value,
      [`${field}Hanja`]: [...normalizeName(value)].map(() => null),
    });
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = {
      ...input,
      surname: normalizeName(input.surname),
      givenName: normalizeName(input.givenName),
    };
    const all = validateInput(clean);
    const errors = {
      surname: all.surname,
      givenName: all.givenName,
      mood: all.mood,
    };
    setErrors(errors);
    const first = Object.keys(errors).find(
      (k) => errors[k as keyof typeof errors],
    );
    if (first)
      requestAnimationFrame(() => document.getElementById(first)?.focus());
    else {
      update(clean);
      next();
    }
  }
  return (
    <>
      <form className="stack" noValidate onSubmit={submit}>
        <Progress step={2} />
        {(["surname", "givenName"] as const).map((field) => (
          <Field
            key={field}
            id={field}
            label={field === "surname" ? "성씨" : "이름"}
            error={errors[field]}
            help={
              field === "surname"
                ? "한글 1~2음절"
                : "한글 1~5음절 · 성씨와 분리"
            }
          >
            <input
              {...fieldA11y(field, errors[field])}
              autoComplete="off"
              className="control"
              value={input[field]}
              onChange={(e) => change(field, e.target.value)}
              onCompositionEnd={(e) => change(field, e.currentTarget.value)}
            />
          </Field>
        ))}
        <div className="slots">
          {(["surname", "givenName"] as const).flatMap((field) =>
            [...normalizeName(input[field])]
              .filter((c) => /^[가-힣]$/.test(c))
              .map((sound, index) => {
                const rowId = input[`${field}Hanja`][index];
                return (
                  <button
                    type="button"
                    key={`${field}-${index}`}
                    className={`slot ${rowId ? "selected" : ""}`}
                    onClick={() => setPicker({ field, index, sound })}
                    aria-label={`${field === "surname" ? "성씨" : "이름"} ${sound} 한자 선택`}
                  >
                    <span className="caption">
                      {field === "surname" ? "성씨" : "이름"} · {sound}
                    </span>
                    <strong>
                      {rowId ? (labels[rowId]?.character ?? "선택됨") : "—"}
                    </strong>
                    <span className="label">한자 선택</span>
                  </button>
                );
              }),
          )}
        </div>
        <p>한자는 선택이에요. 모르거나 일부만 알아도 계속할 수 있어요.</p>
        <Choices
          name="mood"
          label="이름 분위기"
          options={moods}
          value={input.mood}
          onChange={(mood) => update({ ...input, mood })}
        />
        <p>분위기는 이름의 인상이며 실제 성별을 뜻하지 않아요.</p>
        <Button type="submit">입력 확인하기</Button>
      </form>
      {picker && (
        <HanjaPicker
          sound={picker.sound}
          initial={labels[input[`${picker.field}Hanja`][picker.index] ?? ""]}
          api={api}
          close={() => setPicker(null)}
          choose={(row) => {
            const key = `${picker.field}Hanja` as const;
            const slots = [...input[key]];
            slots[picker.index] = row?.id ?? null;
            if (row) setLabels({ ...labels, [row.id]: row });
            update({ ...input, [key]: slots });
            setPicker(null);
          }}
        />
      )}
    </>
  );
}
