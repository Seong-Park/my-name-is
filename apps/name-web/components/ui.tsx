"use client";
import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
export function Button({
  variant = "primary",
  busy,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet" | "danger";
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      {...props}
      disabled={busy || props.disabled}
      aria-busy={busy || undefined}
      className={`button ${variant} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}
export function IconButton({
  icon,
  label,
  onClick,
}: {
  icon: "back" | "close";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={label}
      onClick={onClick}
    >
      <img src={`/icons/${icon}.svg`} width="24" height="24" alt="" />
    </button>
  );
}
export function Field({
  id,
  label,
  help,
  error,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {help && (
        <p className="muted" id={`${id}-help`}>
          {help}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export function fieldA11y(id: string, error?: string) {
  return {
    id,
    "aria-invalid": !!error,
    "aria-describedby": `${id}-help${error ? ` ${id}-error` : ""}`,
  };
}
export function Progress({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="progress" aria-label={`입력 ${step}/3단계`}>
      <p>
        {step} / 3　{["출생정보", "이름 정보", "입력 확인"][step - 1]}
      </p>
      <div className="tracks" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className={n <= step ? "complete" : ""} />
        ))}
      </div>
    </div>
  );
}
export function Choices<T extends string>({
  name,
  label,
  value,
  options,
  onChange,
}: {
  name: string;
  label: string;
  value: T;
  options: Record<T, string>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className={name === "calendar" ? "sr-only" : ""}>{label}</legend>
      <div className="choices">
        {Object.entries<string>(options).map(([key, title]) => (
          <label key={key} className="choice">
            <input
              type="radio"
              name={name}
              value={key}
              checked={value === key}
              onChange={() => onChange(key as T)}
            />
            {title}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
export function Notice({
  title,
  children,
  kind = "info",
}: {
  title: string;
  children?: ReactNode;
  kind?: "info" | "hold" | "error";
}) {
  return (
    <section
      className={`notice ${kind}`}
      role={kind === "error" ? "alert" : "status"}
    >
      <h2>{title}</h2>
      {children}
    </section>
  );
}
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="dialog-body">
        <div className="dialog-header">
          <h2 id={id}>{title}</h2>
          <IconButton icon="close" label="닫기" onClick={onClose} />
        </div>
        {children}
      </div>
    </dialog>
  );
}
