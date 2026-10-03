"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { StoredRecord } from "../contracts";
import { readRecord, writeRecord } from "./record";
export function useRecord(key: string, failWrites = false) {
  const [record, setRecord] = useState<StoredRecord | null>(null);
  const current = useRef<StoredRecord | null>(null);
  const [status, setStatus] = useState("loading");
  const [saveError, setSaveError] = useState("");
  const [externalChange, setExternalChange] = useState(0);
  const raw = useRef<string | null>(null);
  const epoch = useRef(0);
  const controllers = useRef(new Set<AbortController>());
  const corrupt = useRef(false);
  const writes = useRef(Promise.resolve(false));
  const invalidate = useCallback(() => {
    epoch.current++;
    controllers.current.forEach((c) => c.abort());
    controllers.current.clear();
    return epoch.current;
  }, []);
  const put = useCallback((v: StoredRecord | null) => {
    current.current = v;
    setRecord(v);
  }, []);
  const reload = useCallback(() => {
    try {
      const result = readRecord(localStorage, key);
      raw.current = result.raw;
      corrupt.current = result.status === "corrupt";
      put(result.record);
      setStatus(result.status);
    } catch {
      setStatus("unavailable");
    }
  }, [key, put]);
  useEffect(() => {
    reload();
    const listener = (e: StorageEvent) => {
      if (e.key === key || e.key === null) {
        invalidate();
        reload();
        setSaveError("");
        setExternalChange((n) => n + 1);
      }
    };
    window.addEventListener("storage", listener);
    return () => {
      invalidate();
      window.removeEventListener("storage", listener);
    };
  }, [key, reload, invalidate]);
  function persist(value: StoredRecord | null, generation: number) {
    const next = writes.current.then(() => persistNow(value, generation));
    writes.current = next.catch(() => false);
    return next;
  }
  async function persistNow(value: StoredRecord | null, generation: number) {
    if (generation !== epoch.current) return false;
    if (value && corrupt.current) {
      setSaveError(
        "확인할 수 없는 기존 기록은 덮어쓰지 않았어요. 기록 관리에서 직접 삭제한 뒤 저장할 수 있어요.",
      );
      return false;
    }
    let result: Awaited<ReturnType<typeof writeRecord>> = "failed";
    try {
      if (!failWrites)
        result = await writeRecord(
          localStorage,
          navigator.locks,
          key,
          raw.current,
          value,
          () => generation === epoch.current,
        );
    } catch {
      /* Preserve the in-memory result when browser storage is blocked. */
    }
    if (generation !== epoch.current) return false;
    if (result === "changed") {
      invalidate();
      reload();
      setExternalChange((n) => n + 1);
      return false;
    }
    if (typeof result === "string") {
      setSaveError(
        result === "unavailable"
          ? "이 브라우저에서는 안전한 기록 잠금을 사용할 수 없어 현재 탭에서만 결과를 보여드려요."
          : "이 브라우저에 저장하지 못했어요. 현재 결과는 계속 볼 수 있지만, 화면을 닫으면 다시 불러오지 못할 수 있어요.",
      );
      return false;
    }
    raw.current = result.raw;
    corrupt.current = false;
    setStatus(value ? "ready" : "empty");
    setSaveError("");
    return true;
  }
  return {
    record,
    current,
    put,
    status,
    saveError,
    externalChange,
    epoch,
    controllers,
    invalidate,
    persist,
  };
}
