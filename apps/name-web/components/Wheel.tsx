"use client";
import { useId, useLayoutEffect, useRef } from "react";
import { wheelIndex } from "../lib/client/wheel";

export function Wheel({ label, options, value, onChange }: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  // Five visible rows; padding lets the first and last option reach the center.
  useLayoutEffect(() => {
    // The parent dialog opens after mount; measure after it becomes visible.
    const frame = requestAnimationFrame(() => {
      const element = ref.current!;
      const height = element.clientHeight / 5;
      if (height && Math.round(element.scrollTop / height) !== index)
        element.scrollTop = index * height;
    });
    return () => cancelAnimationFrame(frame);
  }, [index, options.length]);
  return (
    <div className="wheel-column">
      <p className="label" id={`${id}-label`}>{label}</p>
      <div className="wheel-frame">
        <div ref={ref} className="wheel" role="listbox" tabIndex={0}
          aria-labelledby={`${id}-label`} aria-orientation="vertical"
          aria-activedescendant={`${id}-${index}`}
          onScroll={(event) => {
            const element = event.currentTarget;
            const next = Math.max(0, Math.min(options.length - 1,
              Math.round(element.scrollTop / (element.clientHeight / 5))));
            if (options[next] && options[next].value !== value) onChange(options[next].value);
          }}
          onKeyDown={(event) => {
            const next = wheelIndex(event.key, index, options.length);
            if (next !== null || event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              if (options[next ?? index]) onChange(options[next ?? index].value);
            }
          }}>
          {options.map((option, i) => (
            <div role="option" id={`${id}-${i}`} key={option.value}
              aria-selected={i === index} className="wheel-option"
              title={option.label}
              onClick={() => {
                onChange(option.value);
                ref.current?.focus({ preventScroll: true });
                if (ref.current) ref.current.scrollTop = i * (ref.current.clientHeight / 5);
              }}>{option.label}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
