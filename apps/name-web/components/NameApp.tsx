"use client";
import { useEffect, useRef, useState } from "react";
import {
  emptyInput,
  moods,
  validateInput,
  type Config,
  type Hanja,
  type Input,
  type StoredRecord,
} from "../lib/contracts";
import {
  api as realApi,
  ApiError,
  retryAttempt,
  type Api,
} from "../lib/client/api";
import { RECORD_KEY } from "../lib/client/record";
import { useRecord } from "../lib/client/useRecord";
import { BirthForm } from "./BirthForm";
import { NameForm } from "./NameForm";
import {
  CurrentName,
  Hold,
  NameCard,
  StoryCard,
  type StoryState,
} from "./Results";
import { ShareDialog } from "./ShareDialog";
import { Button, Dialog, IconButton, Notice, Progress } from "./ui";

type Screen =
  | "start"
  | "birth"
  | "name"
  | "review"
  | "current"
  | "result"
  | "story"
  | "record"
  | "deleted"
  | "error";
export function NameApp({
  api = realApi,
  dev = false,
  failStorage = false,
  failCopy = false,
}: {
  api?: Api;
  dev?: boolean;
  failStorage?: boolean;
  failCopy?: boolean;
}) {
  const store = useRecord(
    dev ? `${RECORD_KEY}:development` : RECORD_KEY,
    failStorage,
  );
  const [screen, setScreen] = useState<Screen>("start");
  const [input, setInput] = useState<Input>(emptyInput);
  const [labels, setLabels] = useState<Record<string, Hanja>>({});
  const [config, setConfig] = useState<Config | null>(null);
  const [configError, setConfigError] = useState("");
  const [configReload, setConfigReload] = useState(0);
  const [type, setType] = useState<"balance" | "amplify">("balance");
  const [index, setIndex] = useState(0);
  const [storyStates, setStoryStates] = useState<Record<string, StoryState>>(
    {},
  );
  const pending = useRef(new Set<string>());
  const [busy, setBusy] = useState(false);
  const analyzeBusy = useRef(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [dialog, setDialog] = useState<"share" | "delete" | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const h1 = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    setConfigError("");
    api
      .config(controller.signal)
      .then(setConfig)
      .catch((e) => {
        if (!controller.signal.aborted) setConfigError(e.message);
      });
    return () => controller.abort();
  }, [api, configReload]);
  useEffect(() => {
    h1.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [screen]);
  useEffect(() => {
    if (store.externalChange) {
      setScreen("start");
      setInput(emptyInput);
      setLabels({});
      setStoryStates({});
      setBusy(false);
      analyzeBusy.current = false;
      pending.current.clear();
      setDialog(null);
    }
  }, [store.externalChange]);
  const result = store.record;
  const recommendation = result?.analysis.recommendations[type];
  const candidate = recommendation?.candidates[index];
  useEffect(() => {
    if (result?.hanjaLabels) setLabels(result.hanjaLabels);
  }, [result?.analysis.analysisId]);
  function go(value: Screen) {
    setScreen(value);
  }
  function begin() {
    store.invalidate();
    pending.current.clear();
    analyzeBusy.current = false;
    setBusy(false);
    setInput({ ...emptyInput });
    setLabels({});
    setError(null);
    setStoryStates({});
    go("birth");
  }
  function review() {
    if (result) setInput(result.input);
    go("review");
  }
  function back() {
    const map: Record<Screen, Screen> = {
      start: "start",
      birth: "start",
      name: "birth",
      review: "name",
      current: "review",
      result: "current",
      story: "result",
      record: "start",
      deleted: "start",
      error: "review",
    };
    go(map[screen]);
  }
  function switchType() {
    setType(type === "balance" ? "amplify" : "balance");
    setIndex(0);
    go("result");
  }
  async function analyze() {
    if (analyzeBusy.current) return;
    const errors = validateInput(input);
    if (Object.values(errors).some(Boolean)) {
      go(
        errors.birthDate || errors.birthTime || errors.birthCityId
          ? "birth"
          : "name",
      );
      return;
    }
    const generation = store.invalidate();
    pending.current.clear();
    setStoryStates({});
    analyzeBusy.current = true;
    setBusy(true);
    setError(null);
    const controller = new AbortController();
    store.controllers.current.add(controller);
    try {
      const analysis = await api.analyze(input, controller.signal);
      if (generation !== store.epoch.current) return;
      const selectedIds = [...input.surnameHanja, ...input.givenNameHanja];
      const value: StoredRecord = {
        schemaVersion: 1,
        revision: crypto.randomUUID(),
        completedAt: analysis.computedAt,
        input: analysis.inputSnapshot,
        analysis,
        stories: {},
        hanjaLabels: Object.fromEntries(
          Object.entries(labels).filter(([id]) => selectedIds.includes(id)),
        ),
      };
      store.put(value);
      setType("balance");
      setIndex(0);
      go("current");
      await store.persist(value, generation);
    } catch (e) {
      if (generation === store.epoch.current) {
        setError(
          e instanceof ApiError
            ? e
            : new ApiError(
                "REQUEST_FAILED",
                "결과를 불러오지 못했어요. 이전 기록은 그대로 있어요.",
              ),
        );
        go("error");
      }
    } finally {
      store.controllers.current.delete(controller);
      if (generation === store.epoch.current) {
        setBusy(false);
        analyzeBusy.current = false;
      }
    }
  }
  async function story(attempt: 0 | 1) {
    if (!candidate || !result || pending.current.has(candidate.candidateId))
      return;
    go("story");
    if (result.stories[candidate.candidateId]) return;
    const id = candidate.candidateId;
    const generation = store.epoch.current;
    const analysisId = result.analysis.analysisId;
    const existing = storyStates[id];
    if (
      existing
        ? retryAttempt(existing.error, existing.attempt) !== attempt
        : attempt !== 0
    )
      return;
    pending.current.add(id);
    const key = existing?.attempt === attempt && existing.key ? existing.key : crypto.randomUUID();
    setStoryStates((s) => ({ ...s, [id]: { status: "loading", attempt, key } }));
    const controller = new AbortController();
    store.controllers.current.add(controller);
    try {
      const response = await api.story(
        result.input,
        result.analysis,
        id,
        attempt,
        key,
        controller.signal,
      );
      const current = store.current.current;
      if (
        generation !== store.epoch.current ||
        current?.analysis.analysisId !== analysisId
      )
        return;
      const value = {
        ...current,
        revision: crypto.randomUUID(),
        stories: { ...current.stories, [id]: response },
      };
      store.put(value);
      await store.persist(value, generation);
    } catch (e) {
      if (
        generation === store.epoch.current &&
        store.current.current?.analysis.analysisId === analysisId
      )
        setStoryStates((s) => ({
          ...s,
          [id]: {
            status: "error",
            attempt,
            key,
            error:
              e instanceof ApiError
                ? e
                : new ApiError(
                    "STORY_UNCERTAIN",
                    "생성 상태를 확인하지 못했어요. 중복 요청을 막기 위해 다시 생성하지 않아요.",
                  ),
          },
        }));
    } finally {
      store.controllers.current.delete(controller);
      pending.current.delete(id);
    }
  }
  async function remove() {
    if (busy) return;
    setBusy(true);
    setDeleteError("");
    const generation = store.invalidate();
    pending.current.clear();
    analyzeBusy.current = false;
    setStoryStates((states) =>
      Object.fromEntries(
        Object.entries(states).map(([id, state]) => [
          id,
          state.status === "loading"
            ? {
                ...state,
                status: "error" as const,
                error: new ApiError(
                  "PROVIDER_UNCERTAIN",
                  "삭제 요청으로 기다리기를 중단했어요. 생성 여부가 확인되지 않아 다시 요청하지 않아요.",
                ),
              }
            : state,
        ]),
      ),
    );
    if (await store.persist(null, generation)) {
      store.put(null);
      setInput(emptyInput);
      setLabels({});
      setStoryStates({});
      setDialog(null);
      go("deleted");
    } else
      setDeleteError(
        "기록을 삭제하지 못했어요. 브라우저 저장소 설정을 확인하고 다시 시도해 주세요.",
      );
    setBusy(false);
  }
  const titles: Record<Screen, [string, string]> = {
    start: ["시작", "내 이름이 이랬다면\n어땠을까?"],
    birth: ["출생정보", "태어난 순간을\n알려주세요"],
    name: ["이름·한자", "지금의 이름을\n알려주세요"],
    review: ["확인", "이 정보로\n살펴볼까요?"],
    current: ["현재 이름", "지금의 이름을\n살펴보았어요"],
    result: [
      type === "balance" ? "균형형" : "극대화형",
      recommendation?.status === "withheld"
        ? "확인할 수 있는\n부분부터"
        : type === "balance"
          ? "균형을 담은\n또 하나의 이름"
          : "나의 강점을\n담은 이름",
    ],
    story: [
      "가상의 이야기",
      candidate &&
      storyStates[candidate.candidateId]?.status === "loading" &&
      !result?.stories[candidate.candidateId]
        ? "이야기를\n준비하고 있어요"
        : "이 이름으로\n살아왔다면",
    ],
    record: ["기록 관리", "이 브라우저에\n남겨 둔 이야기"],
    deleted: ["삭제 완료", "이 브라우저 기록을\n삭제했어요"],
    error: ["상태 안내", "결과를\n불러오지 못했어요"],
  };
  const city = config?.cities.find((c) => c.id === input.birthCityId);
  const region = config?.regions.find((r) => r.id === city?.regionId);
  return (
    <main className="screen">
      <nav className="navigation" aria-label="화면 이동">
        {screen !== "start" && (
          <IconButton icon="back" label="이전 화면" onClick={back} />
        )}
        <p>나의 이름은</p>
      </nav>
      <p className="caption">{titles[screen][0]}</p>
      <h1 ref={h1} tabIndex={-1}>
        {titles[screen][1]}
      </h1>
      {store.externalChange > 0 && screen === "start" && (
        <p role="status">
          다른 탭에서 기록이 변경되어 최신 기록을 다시 확인했어요.
        </p>
      )}
      {store.saveError && result && !["birth", "name"].includes(screen) && (
        <Notice kind="hold" title="이 브라우저에 저장되지 않았어요">
          <p>{store.saveError}</p>
          <Button
            variant="secondary"
            onClick={() =>
              store.persist(store.current.current, store.epoch.current)
            }
          >
            저장 다시 시도
          </Button>
          <Button variant="quiet" onClick={() => go("record")}>
            기록 관리
          </Button>
        </Notice>
      )}
      {screen === "start" && (
        <>
          <p>
            지금 이름을 살펴보고, 다른 이름에 담긴 뜻과 가상의 이야기를
            만나보세요.
          </p>
          <div className="editorial">
            <p className="display">
              나의
              <br />
              이름은
            </p>
            <p>
              익숙한 이름에서 시작하는
              <br />
              조용한 자기 탐색
            </p>
          </div>
          <Button onClick={begin}>내 이름 살펴보기</Button>
          {result && (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setInput(result.input);
                  go("current");
                }}
              >
                지난 이름 이야기 이어보기
              </Button>
              <Button variant="quiet" onClick={() => go("record")}>
                기록 관리
              </Button>
            </>
          )}
          {store.status === "corrupt" && (
            <Notice kind="error" title="저장 기록을 확인할 수 없어요">
              <p>기록을 임의로 복구하거나 삭제하지 않았어요.</p>
              <Button variant="secondary" onClick={() => go("record")}>
                기록 관리
              </Button>
            </Notice>
          )}
          {store.status === "unavailable" && (
            <Notice title="브라우저 기록을 읽지 못했어요">
              <p>
                저장소 접근이 제한되어 있어요. 현재 탭의 입력은 사용할 수
                있어요.
              </p>
            </Notice>
          )}
          <p>
            이 브라우저에 마지막 완료 결과를 보관해요. 전통 해석을 자기 탐색에
            활용하며 개명을 권하지 않아요.
          </p>
        </>
      )}
      {screen === "birth" && (
        <BirthForm
          input={input}
          update={setInput}
          config={config}
          configError={configError}
          reload={() => setConfigReload((v) => v + 1)}
          next={() => go("name")}
        />
      )}
      {screen === "name" && (
        <NameForm
          input={input}
          update={setInput}
          api={api}
          labels={labels}
          setLabels={setLabels}
          next={() => go("review")}
        />
      )}
      {screen === "review" && (
        <>
          <Progress step={3} />
          <section className="card">
            <h2>출생정보</h2>
            <p>
              {input.birthDate} ·{" "}
              {input.calendarType === "solar"
                ? "양력"
                : `음력${input.isLeapMonth ? " · 윤달" : ""}`}
            </p>
            <p>
              {input.timeAccuracy === "unknown" ? "시간 모름" : input.birthTime}{" "}
              · {region?.name} {city?.name}
            </p>
            <Button variant="quiet" onClick={() => go("birth")}>
              출생정보 수정
            </Button>
          </section>
          <section className="card">
            <h2>현재 이름</h2>
            <p>
              {input.surname}
              {input.givenName}
            </p>
            <p>
              {[...input.surnameHanja, ...input.givenNameHanja]
                .map((id) =>
                  id ? (labels[id]?.character ?? "선택됨") : "미선택",
                )
                .join(" · ")}
            </p>
            <p>분위기 {moods[input.mood]}</p>
            <Button variant="quiet" onClick={() => go("name")}>
              이름 정보 수정
            </Button>
          </section>
          <p>
            한자가 빠진 경우 전체 등급 대신 확인할 수 있는 부분부터 풀이해요. 새
            이름 추천 가능 여부는 별도로 판단해요.
          </p>
          <Button busy={busy} onClick={analyze}>
            {busy ? "이름을 살펴보고 있어요…" : "지금 이름 살펴보기"}
          </Button>
          <p role="status" className={busy ? "" : "sr-only"}>
            {busy
              ? "분석 요청을 처리하고 있어요. 완료되면 결과를 보여드려요."
              : ""}
          </p>
          <p className="muted">
            자체 서버에 개인 결과를 저장하지 않으며, 마지막 완료 결과는 이
            브라우저에 보관합니다.
          </p>
        </>
      )}
      {screen === "current" && result && (
        <CurrentName
          analysis={result.analysis}
          next={() => {
            setType("balance");
            setIndex(0);
            go("result");
          }}
          review={review}
        />
      )}
      {(screen === "result" || screen === "story") &&
        result &&
        (candidate ? (
          <>
            <NameCard candidate={candidate} type={type} dev={dev} />
            {screen === "result" && (
              <>
                <details className="disclosure">
                  <summary>풀이 근거 살펴보기</summary>
                  <div className="details">
                    {candidate.evidence.map((e, i) => (
                      <p key={i}>{e}</p>
                    ))}
                    {candidate.optionalNumerology && (
                      <section>
                        <h3>원획·81수 참고</h3>
                        <p style={{whiteSpace:'pre-line'}}>{candidate.optionalNumerology}</p>
                      </section>
                    )}
                  </div>
                </details>
                <div className="compact">
                  <p className="label" aria-live="polite">
                    {index + 1} / {recommendation!.candidates.length} · 공개된
                    이름
                  </p>
                  {recommendation!.candidates.length > 1 ? (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setIndex(
                          (i) => (i + 1) % recommendation!.candidates.length,
                        )
                      }
                    >
                      다른 이름 보기
                    </Button>
                  ) : (
                    <p>현재 확인된 이름은 한 개예요.</p>
                  )}
                </div>
              </>
            )}
            <StoryCard
              saved={result.stories[candidate.candidateId]}
              pending={storyStates[candidate.candidateId]}
              read={() => story(0)}
              retry={story}
              dev={dev}
            />
            {screen === "story" ? (
              <Button variant="secondary" onClick={() => go("result")}>
                이름으로 돌아가기
              </Button>
            ) : (
              <Button variant="secondary" onClick={switchType}>
                {type === "balance"
                  ? "나의 장점을 극대화하는 이름"
                  : "균형을 담은 이름 보기"}
              </Button>
            )}
            <Button variant="quiet" onClick={review}>
              입력 확인
            </Button>
          </>
        ) : (
          <Hold
            analysis={result.analysis}
            type={type}
            current={() => go("current")}
            review={review}
            time={() => {
              setInput(result.input);
              go("birth");
            }}
            switchType={switchType}
          />
        ))}
      {screen === "error" && (
        <>
          <Notice kind="error" title="요청을 완료하지 못했어요">
            <p>{error?.message}</p>
          </Notice>
          <Button busy={busy} onClick={analyze}>
            다시 시도
          </Button>
          <Button variant="secondary" onClick={() => go("review")}>
            입력 확인
          </Button>
          {result && (
            <Button
              variant="quiet"
              onClick={() => {
                setInput(result.input);
                go("current");
              }}
            >
              이전 완료 기록 보기
            </Button>
          )}
        </>
      )}
      {screen === "record" && (
        <>
          <p>
            마지막으로 완료한 한 사람의 입력·결과·성공한 회상문 한 묶음을
            보관해요. 다른 기기와 동기화되지는 않아요.
          </p>
          {result && (
            <Button
              onClick={() => {
                setInput(result.input);
                go("current");
              }}
            >
              지난 이야기 이어 보기
            </Button>
          )}
          {store.status === "corrupt" && (
            <Notice kind="hold" title="저장 기록을 확인할 수 없어요">
              <p>
                손상되었거나 지원하지 않는 버전이에요. 자동으로 삭제하지
                않았어요.
              </p>
            </Notice>
          )}
          <Button
            variant="secondary"
            onClick={() => {
              setDeleteError("");
              setDialog("delete");
            }}
          >
            전체 삭제
          </Button>
          <Button variant="quiet" onClick={() => go("start")}>
            처음으로
          </Button>
        </>
      )}
      {screen === "deleted" && (
        <>
          <p>새로운 정보로 다시 시작할 수 있어요.</p>
          <Button onClick={() => go("start")}>처음으로</Button>
        </>
      )}
      {["current", "result", "story", "error"].includes(screen) && (
        <>
          <Button variant="quiet" onClick={() => setDialog("share")}>
            친구한테 보내기
          </Button>
          <Button variant="quiet" onClick={() => go("record")}>
            기록 관리
          </Button>
        </>
      )}
      {dialog === "share" && (
        <ShareDialog failCopy={failCopy} close={() => setDialog(null)} />
      )}
      {dialog === "delete" && (
        <Dialog
          title="이 브라우저 기록을 지울까요?"
          onClose={() => setDialog(null)}
        >
          <p>
            마지막 입력·결과·보관된 회상문을 삭제합니다. 기기 변경 후 복구할 수
            없어요. 외부 제공자와 운영 원장의 보관까지 즉시 삭제하는 기능은
            아니에요.
          </p>
          {deleteError && <p role="alert">{deleteError}</p>}
          <Button variant="danger" busy={busy} onClick={remove}>
            전체 삭제
          </Button>
          <Button variant="quiet" onClick={() => setDialog(null)}>
            취소
          </Button>
        </Dialog>
      )}
    </main>
  );
}
