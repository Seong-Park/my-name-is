"use client";
import type { Analysis, Candidate, Story } from "../lib/contracts";
import { retryAttempt, type ApiError } from "../lib/client/api";
import { Button, Notice } from "./ui";
export type StoryState = {
  status: "loading" | "error";
  error?: ApiError;
  attempt: 0 | 1;
  key?: string;
};
export function CurrentName({
  analysis,
  next,
  review,
}: {
  analysis: Analysis;
  next: () => void;
  review: () => void;
}) {
  const n = analysis.currentName;
  const grade = {
    well_matched: "잘 맞는 이름",
    partly_supplement: "일부 보완할 이름",
    needs_supplement: "보완이 필요한 이름",
  };
  return (
    <>
      <section className={`evaluation ${n.status}`}>
        <p className="caption">
          {n.status === "partial"
            ? "부분 풀이 · 등급 보류"
            : "현재 이름 · 자원오행 기준"}
        </p>
        <h2>{n.grade ? grade[n.grade] : "확인할 수 있는 부분부터"}</h2>
        <p className="muted">
          {n.status === "partial"
            ? "전체 등급을 붙일 전제가 모두 확인되지 않았어요. 확인된 뜻과 소리는 살펴볼 수 있어요."
            : "이름 부분의 자원오행을 기준으로 살펴본 전통 해석이에요. 개명을 권하거나 삶의 결과를 단정하지 않아요."}
        </p>
      </section>
      <p>성씨와 이름의 소리, 확인된 한자 뜻을 참고로 살펴볼 수 있어요.</p>
      <details className="disclosure">
        <summary>풀이 근거 살펴보기</summary>
        <div className="details">
          {n.explanations.map((e, i) => (
            <section key={i}>
              <h3>{e.title}</h3>
              <p>{e.text}</p>
            </section>
          ))}
          {!n.explanations.length && (
            <p>
              확인된 풀이 자료가 아직 없어요. 미확인을 중립이나 감점으로 바꾸지
              않아요.
            </p>
          )}
        </div>
      </details>
      <Button onClick={next}>좋은 이름 확인하기</Button>
      <Button variant="quiet" onClick={review}>
        입력 확인
      </Button>
      <p className="muted">
        추천 가능 여부는 현재 이름 등급과 별도로 판단합니다.
      </p>
    </>
  );
}
export function NameCard({
  candidate,
  type,
  dev,
}: {
  candidate: Candidate;
  type: "balance" | "amplify";
  dev: boolean;
}) {
  return (
    <section className="name-card">
      <p className="label">
        {type === "balance" ? "균형형 · 보완 방향" : "극대화형 · 강점 강조"}
      </p>
      <p className="display">{candidate.hangul}</p>
      <p className="name-meaning">
        {candidate.hanja} · {candidate.meanings.join(" · ")}
      </p>
      <p className="muted">{candidate.evidence[0]}</p>
      {type === "amplify" && (
        <p>
          균형형보다 더 좋은 이름이라는 뜻은 아니에요. 강한 특성을 더할 때의
          부담도 함께 살펴보세요.
        </p>
      )}
      {dev && (
        <p className="dev-label">개발용 가상 데이터 · 실제 추천 결과 아님</p>
      )}
    </section>
  );
}
export function Hold({
  analysis,
  type,
  current,
  review,
  time,
  switchType,
}: {
  analysis: Analysis;
  type: "balance" | "amplify";
  current: () => void;
  review: () => void;
  time: () => void;
  switchType: () => void;
}) {
  const codes = analysis.recommendations[type].reasonCodes;
  const other =
    analysis.recommendations[type === "balance" ? "amplify" : "balance"];
  const timeHold =
    codes.includes("TIME_UNCERTAIN") &&
    analysis.inputSnapshot.timeAccuracy === "unknown";
  const shortage = codes.includes("CANDIDATES_INSUFFICIENT");
  const preparing = codes.includes("RULES_NOT_VERIFIED");
  const unsupported = codes.includes("STRUCTURE_UNSUPPORTED");
  const boundary = codes.includes("TIME_UNCERTAIN") && !timeHold;
  return (
    <>
      <Notice
        kind="hold"
        title={
          preparing ? "추천 분석 준비 중" : timeHold
            ? "시간별 풀이를 확정하지 못했어요"
            : shortage
              ? "조건에 맞는 자료가 부족해요"
              : "추천 방향을 확정하지 못했어요"
        }
      >
        <p>
          {preparing ? `${type === 'balance' ? '균형형' : '극대화형'} 판정 규칙의 검증이 아직 완료되지 않아 이 방향의 추천은 보류했어요. 확인된 현재 이름의 소리와 뜻은 살펴볼 수 있어요.` : timeHold
            ? "가능한 출생시간 전체에서 같은 추천 방향을 확인하지 못했어요. 확인된 소리와 뜻은 볼 수 있어요. 정확한 시간을 아는 경우에만 추가해 주세요. 시간이 추가되어도 추천이 보장되지는 않아요."
            : shortage
              ? "검토된 후보를 충분히 확보하지 못했어요. 확인된 현재 이름 풀이는 유지됩니다."
              : unsupported
                ? "입력한 원국은 현재 검토된 명리 구조의 지원 범위에 해당하지 않아 추천을 보류했어요. 확인된 소리와 뜻은 살펴볼 수 있어요. 이름이 나쁘다는 뜻은 아니며, 입력을 바꿀 필요는 없어요."
                : boundary
                  ? "입력한 시각이 시간대·절기·일시 경계의 불확실성에 걸려 추천 방향을 하나로 확정하지 못했어요. 확인된 소리와 뜻은 살펴볼 수 있어요. 입력한 시각을 임의로 바꾸지 않아도 돼요."
                  : "추천 방향의 판단에 필요한 근거를 모두 확인하지 못했어요. 현재 이름에서 확인된 소리와 뜻부터 살펴볼 수 있어요. 이름이 나쁘다는 뜻은 아니에요."}
        </p>
      </Notice>
      {timeHold && <Button onClick={time}>출생시간 추가하기</Button>}
      {other.status === "available" && (
        <>
          <p>다른 방향의 이름은 확인할 수 있어요. 입력을 바꿀 필요는 없어요.</p>
          <Button onClick={switchType}>
            {type === "balance"
              ? "나의 강점을 담은 이름 보기"
              : "균형을 담은 이름 보기"}
          </Button>
        </>
      )}
      <Button
        variant={
          other.status === "available" || timeHold ? "secondary" : "primary"
        }
        onClick={current}
      >
        지금 이름 살펴보기
      </Button>
      <Button variant="quiet" onClick={review}>
        입력 확인
      </Button>
    </>
  );
}
export function StoryCard({
  saved,
  pending,
  read,
  retry,
  dev,
}: {
  saved?: Story;
  pending?: StoryState;
  read: () => void;
  retry: (attempt: 0 | 1) => void;
  dev: boolean;
}) {
  const error = pending?.error;
  const nextAttempt = pending ? retryAttempt(error, pending.attempt) : null;
  return (
    <section className="card">
      <h2>이 이름으로 살아왔다면</h2>
      {saved ? (
        <>
          <p className="caption">가상의 이야기 · 실제 과거를 뜻하지 않아요</p>
          {saved.story.paragraphs.map((p, i) => (
            <p key={i} className="story-text">
              {p}
            </p>
          ))}
          {dev && (
            <p className="dev-label">개발용 시연 문장 · 실제 AI 생성 아님</p>
          )}
        </>
      ) : pending?.status === "loading" ? (
        <div role="status" className="compact">
          <p>이야기를 준비하고 있어요…</p>
          <p>추천 이름과 분석 결과는 이미 준비되어 있어요.</p>
        </div>
      ) : error ? (
        <div className="compact" role="alert">
          <p>{error.message}</p>
          <p>이름 결과와 이미 보관된 이야기는 계속 볼 수 있어요.</p>
          {error.retryAfterSeconds !== undefined && (
            <p>서버 안내 대기 시간: {error.retryAfterSeconds}초</p>
          )}
          {nextAttempt !== null && (
            <Button onClick={() => retry(nextAttempt)}>
              {nextAttempt === pending?.attempt
                ? "상태 확인 후 다시 요청"
                : "한 번 더 시도"}
            </Button>
          )}
          {pending?.attempt === 1 && nextAttempt === null &&
            ["PROVIDER_FAILED", "STORY_INVALID", "STORY_ALREADY_FINISHED"].includes(error.code) && (
            <p>이 분석에서 다시 시도할 수 있는 횟수를 모두 사용했어요.</p>
          )}
        </div>
      ) : (
        <>
          <p>
            이야기를 만들기 위해 추천 이름·한자 뜻·분석 요약·연령대를 DeepSeek에
            보내요. 출생일시 원문은 보내지 않아요.
          </p>
          <Button onClick={read}>가상의 이야기 읽기</Button>
        </>
      )}
    </section>
  );
}
