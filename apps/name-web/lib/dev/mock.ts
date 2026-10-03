import { api, ApiError, type Api } from "../client/api";
import {
  type Analysis,
  type Candidate,
  type Input,
  type Story,
} from "../contracts";
export type Scenario = {
  analysis:
    | "success"
    | "time"
    | "balance"
    | "both"
    | "shortage"
    | "failure"
    | "loading";
  story: "success" | "failure" | "disabled" | "uncertain" | "loading";
  hanja: "rows" | "empty" | "failure";
  count: number;
};
// Developer fixtures only. Never import this module from the production page or API.
export function createMock(get: () => Scenario) {
  const waiting = new Set<() => void>();
  async function wait(signal?: AbortSignal) {
    await new Promise<void>((resolve, reject) => {
      const done = () => {
        waiting.delete(done);
        signal?.removeEventListener("abort", abort);
        resolve();
      };
      const abort = () => {
        waiting.delete(done);
        reject(new DOMException("Aborted", "AbortError"));
      };
      if (signal?.aborted) return abort();
      waiting.add(done);
      signal?.addEventListener("abort", abort, { once: true });
    });
  }
  const mock: Api = {
    config: api.config,
    async hanja(sound) {
      if (get().hanja === "failure")
        throw new ApiError(
          "CALCULATION_UNAVAILABLE",
          "개발 시연: 한자 검색 서버에 연결하지 못했어요.",
        );
      const rows: Record<string, string[]> = {
        박: ["朴", "博"],
        김: ["金"],
        연: ["然", "蓮"],
        우: ["宇", "雨"],
        가: ["佳", "嘉"],
        나: ["娜"],
      };
      return {
        rows:
          get().hanja === "empty"
            ? []
            : (rows[sound] ?? []).map((character, i) => ({
                id: `dev-${sound}-${i}`,
                character,
                sound,
                meaning: "선택 동작 확인용",
                reviewStatus: "개발용 시연 · 뜻/독음 검증 자료 아님",
              })),
        nextCursor: null,
      };
    },
    async analyze(input: Input, signal) {
      const scenario = { ...get() };
      if (scenario.analysis === "loading") await wait(signal);
      if (scenario.analysis === "failure")
        throw new ApiError(
          "CALCULATION_UNAVAILABLE",
          "개발 시연: 분석 요청이 실패했어요. 이전 완료 기록은 유지돼요.",
          true,
        );
      const candidates = (names: string[], type: string): Candidate[] =>
        names
          .slice(0, scenario.count)
          .map((name, i) => ({
            candidateId: `dev-${type}-${i}`,
            hangul: input.surname + name,
            hanja: "開發",
            meanings: ["개발용 가상 후보", "한자·뜻 대응 없음"],
            targetElement: "DEVELOPMENT_ONLY",
            evidence: [
              "화면 조합과 후보 이동을 확인하는 개발용 데이터예요. 실제 계산이나 추천을 수행하지 않았어요.",
              "개발 시연에만 사용하는 근거 영역이에요. 실제 자원오행·발음·수리 판정이 아니에요.",
            ],
          }));
      const balance = candidates(
        ["하람", "서온", "다윤"].filter((n) => n !== input.givenName),
        "balance",
      );
      const amplify = candidates(
        ["지오"].filter((n) => n !== input.givenName),
        "amplify",
      );
      const hold = ["time", "balance", "both", "shortage"].includes(
        scenario.analysis,
      );
      const why =
        scenario.analysis === "time"
          ? "TIME_UNCERTAIN"
          : scenario.analysis === "shortage"
            ? "CANDIDATES_INSUFFICIENT"
            : "DIRECTION_UNCONFIRMED";
      const a: Analysis = {
        schemaVersion: 1,
        analysisId: crypto.randomUUID(),
        computedAt: new Date().toISOString(),
        versions: {
          rules: "development-only",
          hanja: "development-only",
          names: "development-only",
          locations: "kma-2026-07-01-v1",
          calendar: "development-only",
          publication: "development-only",
        },
        inputSnapshot: structuredClone(input),
        currentName: {
          status: "partial",
          grade: null,
          reasonCodes: ["DEVELOPMENT_ONLY"],
          explanations: [
            {
              title: "이름 부분의 자원오행",
              text: "개발용 시연이므로 실제 판정하지 않았어요.",
            },
            {
              title: "성씨 풀이",
              text: "선택한 한자와 입력을 보존하는 동작을 보여드려요. 실제 풀이는 아니에요.",
            },
            {
              title: "소리와 참고 수리",
              text: "자원오행 평가와 분리된 참고 영역이에요. 자료가 없는 부분은 추정하지 않아요.",
            },
          ],
        },
        recommendations: {
          balance: {
            status: hold || !balance.length ? "withheld" : "available",
            candidates: hold ? [] : balance,
            reasonCodes: hold ? [why] : [],
          },
          amplify: {
            status:
              ["time", "both", "shortage"].includes(scenario.analysis) ||
              !amplify.length
                ? "withheld"
                : "available",
            candidates: ["time", "both", "shortage"].includes(scenario.analysis)
              ? []
              : amplify,
            reasonCodes: hold ? [why] : [],
          },
        },
        receipt: "development-only-not-signed",
      };
      return a;
    },
    async story(_input, analysis, candidateId, attempt, _key, signal) {
      const scenario = get().story;
      if (scenario === "loading") await wait(signal);
      if (scenario === "failure")
        throw new ApiError(
          "PROVIDER_FAILED",
          "개발 시연: 이야기를 완성하지 못했어요.",
          attempt === 0,
        );
      if (scenario === "disabled")
        throw new ApiError(
          "AI_DISABLED",
          "지금은 새 이야기를 만들 수 없어요. 개발용 중단 시연입니다.",
        );
      if (scenario === "uncertain")
        throw new ApiError(
          "PROVIDER_UNCERTAIN",
          "생성 여부를 확인 중이에요. 중복 생성을 막기 위해 다시 요청하지 않아요.",
        );
      const result: Story = {
        analysisId: analysis.analysisId,
        candidateId,
        attempt,
        promptVersion: "development-only",
        story: {
          paragraphs: [
            "이 문장은 개발 화면을 확인하기 위한 가상의 시연이에요. 누구의 실제 경험도 담지 않으며, 추천 이름의 효능을 설명하지 않아요.",
            "책장을 넘기던 작은 순간에 다른 선택을 상상했을지도 몰라요. 이 장면은 화면의 길이와 읽기 흐름을 살펴보려 쓴 개발용 문장이에요.",
            "강점을 더하는 데 따르는 부담도 함께 읽을 자리를 남겨 두었어요. 실제 이야기와 이름의 근거는 검증된 서버 응답으로만 채워질 거예요.",
          ],
        },
      };
      return result;
    },
  };
  return {
    api: mock,
    complete: () => {
      [...waiting].forEach((resolve) => resolve());
    },
  };
}
