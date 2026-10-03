"use client";
import { useEffect, useState } from "react";
import type { Hanja } from "../lib/contracts";
import type { Api } from "../lib/client/api";
import { Button, Dialog, Field, Notice } from "./ui";
import { Wheel } from "./Wheel";
export function HanjaPicker({
  sound,
  api,
  choose,
  close,
  initial,
}: {
  sound: string;
  api: Api;
  choose: (value: Hanja | null) => void;
  close: () => void;
  initial?: Hanja;
}) {
  const [rows, setRows] = useState<Hanja[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(initial?.id ?? null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api
      .hanja(sound, undefined, controller.signal)
      .then((v) => {
        setRows(initial && !v.rows.some((r) => r.id === initial.id) ? [initial, ...v.rows] : v.rows);
        setCursor(v.nextCursor);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [api, sound, reload, initial]);
  const filtered = rows.filter((r) =>
    `${r.sound}${r.character}${r.meaning ?? ""}`.includes(query),
  );
  const selectedRow = filtered.find((row) => row.id === selected) ?? filtered[0];
  async function more() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const v = await api.hanja(sound, cursor);
      setRows((previous) => [
        ...previous,
        ...v.rows.filter((row) => !previous.some((p) => p.id === row.id)),
      ]);
      setCursor(v.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "검색을 완료하지 못했어요.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <Dialog title={`한자 선택 · ${sound}`} onClose={close}>
      <p>
        해당 음절의 독음·자형·확인된 뜻으로 선택해 주세요. 한자를 모르셔도
        괜찮아요.
      </p>
      {search && (
        <Field
          id="hanja-query"
          label="독음 · 한자 검색"
          help="불러온 후보의 자형·독음·뜻을 검색해요."
        >
          <input
            id="hanja-query"
            aria-describedby="hanja-query-help"
            className="control"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Field>
      )}
      {loading && <p role="status">한자를 불러오고 있어요…</p>}
      {error && (
        <Notice kind="error" title="한자 검색을 완료하지 못했어요">
          <p>{error}</p>
          <Button variant="secondary" onClick={() => setReload((v) => v + 1)}>
            다시 검색하기
          </Button>
        </Notice>
      )}
      {!loading && !error && filtered.length === 0 && (
        <p role="status">
          확인할 수 있는 자료가 없어요. 한글만으로 계속할 수 있어요.
        </p>
      )}
      {filtered.length > 0 && (
        <>
          <Wheel label={sound + " 한자 후보"} value={selectedRow.id}
            options={filtered.map((row) => ({ value: row.id, label: row.character + " · " + row.sound + " · " + (row.meaning ?? "뜻 미확인") }))}
            onChange={setSelected} />
          <p className="caption">선택: {selectedRow.character} · {selectedRow.sound} · {selectedRow.meaning ?? "뜻 미확인"}<br />{selectedRow.reviewStatus}</p>
        </>
      )}
      {cursor && (
        <Button variant="secondary" busy={loading} onClick={more}>
          후보 더 불러오기
        </Button>
      )}
      <Button variant="secondary" onClick={() => {
        if (search) setQuery("");
        setSearch((v) => !v);
      }}>
        {search ? "검색 닫기" : "후보 검색하기"}
      </Button>
      {rows.length > 0 && (
        <Button
          disabled={!selectedRow || loading || !!error}
          onClick={() => choose(selectedRow ?? null)}
        >
          선택 완료
        </Button>
      )}
      <Button variant="quiet" onClick={() => choose(null)}>
        한글만으로 계속
      </Button>
    </Dialog>
  );
}
