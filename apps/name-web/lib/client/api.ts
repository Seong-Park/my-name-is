import {
  isAnalysis,
  isStory,
  sameInput,
  type Analysis,
  type Config,
  type Hanja,
  type Input,
  type Story,
} from "../contracts";
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryable = false,
    public retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export function retryAttempt(
  error: ApiError | undefined,
  attempt: 0 | 1,
): 0 | 1 | null {
  if (error && ["NETWORK_ERROR", "INVALID_RESPONSE", "STORY_IN_PROGRESS"].includes(error.code))
    return attempt;
  if (!error?.retryable) return null;
  if (
    [
      "AI_BUSY",
      "RATE_LIMITED",
      "BUDGET_EXHAUSTED",
      "AI_DISABLED",
      "BUDGET_STORE_UNAVAILABLE",
    ].includes(error.code)
  )
    return attempt;
  return attempt === 0 &&
    ["PROVIDER_FAILED", "STORY_INVALID", "STORY_ALREADY_FINISHED"].includes(
      error.code,
    )
    ? 1
    : null;
}
export type Api = {
  config(signal?: AbortSignal): Promise<Config>;
  hanja(
    sound: string,
    cursor?: string,
    signal?: AbortSignal,
  ): Promise<{ rows: Hanja[]; nextCursor: string | null }>;
  analyze(input: Input, signal?: AbortSignal): Promise<Analysis>;
  story(
    input: Input,
    analysis: Analysis,
    candidateId: string,
    attempt: 0 | 1,
    key: string,
    signal?: AbortSignal,
  ): Promise<Story>;
};
const malformed = () =>
  new ApiError(
    "INVALID_RESPONSE",
    "서버 응답을 확인하지 못했어요. 이전 기록은 그대로 유지돼요.",
  );
async function request(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
  key?: string,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`/api/name/v1/${path}`, {
      method: body === undefined ? "GET" : "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(key ? { "Idempotency-Key": key } : {}),
      },
      credentials: "same-origin",
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(
      "NETWORK_ERROR",
      "연결을 확인한 뒤 다시 시도해 주세요. 이전 완료 기록은 유지돼요.",
    );
  }
  let value;
  try {
    value = await response.json();
  } catch {
    throw malformed();
  }
  if (!response.ok) {
    const e = value?.error;
    throw new ApiError(
      typeof e?.code === "string" ? e.code : "REQUEST_FAILED",
      typeof e?.message === "string" ? e.message : "요청을 처리하지 못했어요.",
      e?.retryable === true,
      typeof e?.retryAfterSeconds === "number"
        ? e.retryAfterSeconds
        : undefined,
    );
  }
  return value;
}
export const api: Api = {
  async config(signal) {
    const v = (await request("config", undefined, signal)) as Config;
    if (
      !v ||
      typeof v.minDate !== "string" ||
      typeof v.maxDate !== "string" ||
      !Array.isArray(v.regions) ||
      !Array.isArray(v.cities) ||
      !v.regions.every(
        (r) => typeof r.id === "string" && typeof r.name === "string",
      ) ||
      !v.cities.every(
        (c) =>
          typeof c.id === "string" &&
          typeof c.name === "string" &&
          v.regions.some((r) => r.id === c.regionId),
      )
    )
      throw malformed();
    return v;
  },
  async hanja(sound, cursor, signal) {
    const v = (await request(
      "hanja-search",
      { sound, ...(cursor ? { cursor } : {}) },
      signal,
    )) as { rows: Hanja[]; nextCursor: string | null };
    if (
      !v ||
      !Array.isArray(v.rows) ||
      v.rows.length > 30 ||
      !(v.nextCursor === null || typeof v.nextCursor === "string") ||
      !v.rows.every(
        (h) =>
          typeof h.id === "string" &&
          typeof h.character === "string" &&
          h.sound === sound &&
          (h.meaning === null || typeof h.meaning === "string") &&
          typeof h.reviewStatus === "string",
      )
    )
      throw malformed();
    return v;
  },
  async analyze(input, signal) {
    const v = await request("analyses", input, signal);
    if (!isAnalysis(v) || !sameInput(v.inputSnapshot, input)) throw malformed();
    return v;
  },
  async story(input, analysis, candidateId, attempt, key, signal) {
    const v = await request(
      "stories",
      { input, receipt: analysis.receipt, candidateId, attempt },
      signal,
      key,
    );
    if (
      !isStory(v) ||
      v.analysisId !== analysis.analysisId ||
      v.candidateId !== candidateId ||
      v.attempt !== attempt
    )
      throw malformed();
    return v;
  },
};
