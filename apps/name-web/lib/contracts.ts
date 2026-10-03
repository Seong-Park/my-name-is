import KoreanLunarCalendar from "korean-lunar-calendar";

export type Input = {
  schemaVersion: 1;
  birthDate: string;
  calendarType: "solar" | "lunar";
  isLeapMonth: boolean;
  timeAccuracy: "exact" | "unknown";
  birthTime: string | null;
  birthCityId: string;
  surname: string;
  givenName: string;
  surnameHanja: (string | null)[];
  givenNameHanja: (string | null)[];
  mood: "masculine" | "feminine" | "neutral" | "any";
};
export type Errors = Partial<Record<keyof Input, string>>;
export type Config = {
  minDate: string;
  maxDate: string;
  locationVersion: string;
  regions: { id: string; name: string }[];
  cities: { id: string; name: string; regionId: string }[];
};
export type Hanja = {
  id: string;
  character: string;
  sound: string;
  meaning: string | null;
  reviewStatus: string;
};
export type Candidate = {
  candidateId: string;
  hangul: string;
  hanja: string;
  meanings: string[];
  targetElement: string;
  evidence: string[];
  optionalNumerology?: string;
};
export type Recommendation = {
  status: "available" | "withheld";
  candidates: Candidate[];
  reasonCodes: string[];
};
export type Analysis = {
  schemaVersion: 1;
  analysisId: string;
  computedAt: string;
  versions: Record<string, string>;
  inputSnapshot: Input;
  currentName: {
    status: "rated" | "partial";
    grade: "well_matched" | "partly_supplement" | "needs_supplement" | null;
    explanations: { title: string; text: string }[];
    reasonCodes: string[];
  };
  recommendations: { balance: Recommendation; amplify: Recommendation };
  receipt: string;
};
export type Story = {
  analysisId: string;
  candidateId: string;
  attempt: 0 | 1;
  story: { paragraphs: [string, string, string] };
  promptVersion: string;
};
export type StoredRecord = {
  schemaVersion: 1;
  revision: string;
  completedAt: string;
  input: Input;
  analysis: Analysis;
  stories: Record<string, Story>;
  hanjaLabels?: Record<string, Hanja>;
};
export const emptyInput: Input = {
  schemaVersion: 1,
  birthDate: "",
  calendarType: "solar",
  isLeapMonth: false,
  timeAccuracy: "unknown",
  birthTime: null,
  birthCityId: "",
  surname: "",
  givenName: "",
  surnameHanja: [],
  givenNameHanja: [],
  mood: "any",
};
export const moods = {
  masculine: "남성적",
  feminine: "여성적",
  neutral: "중성적",
  any: "상관없음",
};
export const normalizeName = (value: string) => value.trim().normalize("NFC");
export const sameInput = (a: Input, b: Input) =>
  (Object.keys(emptyInput) as (keyof Input)[]).every(
    (key) => JSON.stringify(a[key]) === JSON.stringify(b[key]),
  );
export function koreaNow(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");
const text = (v: unknown): v is string => typeof v === "string" && v.length > 0;
export function validateInput(value: unknown, now = new Date()): Errors {
  if (!object(value)) return { birthDate: "입력 정보를 확인해 주세요." };
  const v = value;
  const errors: Errors = {};
  if (Object.keys(v).some((k) => !Object.hasOwn(emptyInput, k)) || v.schemaVersion !== 1)
    errors.birthDate = "지원하지 않는 입력 형식이에요.";
  let solar = "";
  if (
    typeof v.birthDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.birthDate)
  ) {
    const [y, m, d] = v.birthDate.split("-").map(Number);
    if (v.calendarType === "solar" && v.isLeapMonth === false) {
      const date = new Date(Date.UTC(y, m - 1, d));
      if (
        date.getUTCFullYear() === y &&
        date.getUTCMonth() === m - 1 &&
        date.getUTCDate() === d
      )
        solar = v.birthDate;
    } else if (
      v.calendarType === "lunar" &&
      typeof v.isLeapMonth === "boolean"
    ) {
      const calendar = new KoreanLunarCalendar();
      if (calendar.setLunarDate(y, m, d, v.isLeapMonth)) {
        const lunar = calendar.getLunarCalendar();
        const converted = calendar.getSolarCalendar();
        if (
          lunar.year === y &&
          lunar.month === m &&
          lunar.day === d &&
          lunar.intercalation === v.isLeapMonth
        ) {
          const reverse = new KoreanLunarCalendar();
          reverse.setSolarDate(converted.year, converted.month, converted.day);
          const back = reverse.getLunarCalendar();
          if (
            back.year === y &&
            back.month === m &&
            back.day === d &&
            back.intercalation === v.isLeapMonth
          )
            solar = `${converted.year}-${String(converted.month).padStart(2, "0")}-${String(converted.day).padStart(2, "0")}`;
        }
      }
    }
  }
  if (
    !solar ||
    solar < "1900-01-01" ||
    solar > koreaNow(now).slice(0, 10) ||
    solar > "2026-12-31"
  )
    errors.birthDate =
      "실제 날짜와 윤달을 확인해 주세요. 양력 환산 1900년부터 한국시간 오늘까지 지원해요.";
  if (
    v.timeAccuracy === "unknown"
      ? v.birthTime !== null
      : v.timeAccuracy !== "exact" ||
        typeof v.birthTime !== "string" ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(v.birthTime)
  )
    errors.birthTime = "정확한 시·분을 입력하거나 시간 모름을 선택해 주세요.";
  if (v.timeAccuracy === "exact" && `${solar} ${v.birthTime}` > koreaNow(now))
    errors.birthTime = "미래의 시각은 입력할 수 없어요.";
  if (!text(v.birthCityId))
    errors.birthCityId = "출생지역을 목록에서 선택해 주세요.";
  for (const key of ["surname", "givenName"] as const) {
    const name = typeof v[key] === "string" ? normalizeName(v[key]) : "";
    if (!(key === "surname" ? /^[가-힣]{1,2}$/ : /^[가-힣]{1,5}$/).test(name))
      errors[key] =
        key === "surname"
          ? "성씨는 한글 1~2음절로 입력해 주세요."
          : "이름은 공백 없이 한글 1~5음절로 입력해 주세요.";
    const slots = v[`${key}Hanja`];
    if (
      !Array.isArray(slots) ||
      slots.length !== [...name].length ||
      slots.some((x) => x !== null && !text(x))
    )
      errors[key] = "한글과 한자 선택을 확인해 주세요.";
  }
  if (typeof v.mood !== "string" || !Object.hasOwn(moods, v.mood))
    errors.mood = "이름 분위기를 선택해 주세요.";
  return errors;
}

export function isInput(v: unknown): v is Input {
  // Stored records must remain readable after the server's date window changes.
  return (
    object(v) &&
    v.schemaVersion === 1 &&
    text(v.birthDate) &&
    (v.calendarType === "solar" || v.calendarType === "lunar") &&
    typeof v.isLeapMonth === "boolean" &&
    ((v.timeAccuracy === "unknown" && v.birthTime === null) ||
      (v.timeAccuracy === "exact" &&
        typeof v.birthTime === "string" &&
        /^([01]\d|2[0-3]):[0-5]\d$/.test(v.birthTime))) &&
    text(v.birthCityId) &&
    typeof v.surname === "string" &&
    /^[가-힣]{1,2}$/.test(v.surname) &&
    typeof v.givenName === "string" &&
    /^[가-힣]{1,5}$/.test(v.givenName) &&
    Array.isArray(v.surnameHanja) &&
    v.surnameHanja.length === v.surname.length &&
    v.surnameHanja.every((x) => x === null || text(x)) &&
    Array.isArray(v.givenNameHanja) &&
    v.givenNameHanja.length === v.givenName.length &&
    v.givenNameHanja.every((x) => x === null || text(x)) &&
    typeof v.mood === "string" && Object.hasOwn(moods, v.mood)
  );
}
function isCandidate(v: unknown): v is Candidate {
  return (
    object(v) &&
    text(v.candidateId) &&
    text(v.hangul) &&
    text(v.hanja) &&
    strings(v.meanings) &&
    strings(v.evidence) &&
    text(v.targetElement) &&
    (v.optionalNumerology === undefined ||
      typeof v.optionalNumerology === "string")
  );
}
function isRecommendation(v: unknown): v is Recommendation {
  return (
    object(v) &&
    strings(v.reasonCodes) &&
    Array.isArray(v.candidates) &&
    v.candidates.length <= 3 &&
    v.candidates.every(isCandidate) &&
    (v.status === "available"
      ? v.candidates.length > 0
      : v.status === "withheld" && v.candidates.length === 0)
  );
}
export function isAnalysis(v: unknown): v is Analysis {
  if (
    !object(v) ||
    v.schemaVersion !== 1 ||
    !text(v.analysisId) ||
    !text(v.computedAt) ||
    !text(v.receipt) ||
    !isInput(v.inputSnapshot) ||
    !object(v.versions) ||
    !Object.values(v.versions).every(text) ||
    !object(v.currentName) ||
    !object(v.recommendations)
  )
    return false;
  const n = v.currentName;
  if (
    !strings(n.reasonCodes) ||
    !Array.isArray(n.explanations) ||
    !n.explanations.every((e) => object(e) && text(e.title) && text(e.text)) ||
    !(n.status === "partial"
      ? n.grade === null
      : n.status === "rated" &&
        ["well_matched", "partly_supplement", "needs_supplement"].includes(
          String(n.grade),
        ))
  )
    return false;
  if (
    n.status === "rated" &&
    [
      ...v.inputSnapshot.surnameHanja,
      ...v.inputSnapshot.givenNameHanja,
    ].includes(null)
  )
    return false;
  if (
    !isRecommendation(v.recommendations.balance) ||
    !isRecommendation(v.recommendations.amplify)
  )
    return false;
  const candidates = [
    ...v.recommendations.balance.candidates,
    ...v.recommendations.amplify.candidates,
  ];
  const input = v.inputSnapshot;
  return (
    new Set(candidates.map((c) => c.candidateId)).size === candidates.length &&
    new Set(candidates.map((c) => c.hangul)).size === candidates.length &&
    candidates.every((c) => c.hangul !== input.surname + input.givenName)
  );
}
export function isStory(v: unknown): v is Story {
  if (
    !object(v) ||
    !text(v.analysisId) ||
    !text(v.candidateId) ||
    ![0, 1].includes(Number(v.attempt)) ||
    typeof v.attempt !== "number" ||
    !text(v.promptVersion) ||
    !object(v.story) ||
    !strings(v.story.paragraphs) ||
    v.story.paragraphs.length !== 3
  )
    return false;
  return v.story.paragraphs.every(
    (p) =>
      p === p.trim().normalize("NFC") &&
      !/[\r\n]/.test(p) &&
      [...p].length >= 40 &&
      [...p].length <= 100,
  );
}
export function isRecord(v: unknown): v is StoredRecord {
  if (
    !object(v) ||
    v.schemaVersion !== 1 ||
    !text(v.revision) ||
    !text(v.completedAt) ||
    !isInput(v.input) ||
    !isAnalysis(v.analysis) ||
    !object(v.stories) ||
    !sameInput(v.input, v.analysis.inputSnapshot)
  )
    return false;
  const ids = [
    ...v.analysis.recommendations.balance.candidates,
    ...v.analysis.recommendations.amplify.candidates,
  ].map((c) => c.candidateId);
  if (
    v.hanjaLabels !== undefined &&
    (!object(v.hanjaLabels) ||
      !Object.entries(v.hanjaLabels).every(
        ([id, h]) =>
          object(h) &&
          h.id === id &&
          text(h.character) &&
          text(h.sound) &&
          (h.meaning === null || typeof h.meaning === "string") &&
          typeof h.reviewStatus === "string",
      ))
  )
    return false;
  const analysisId = v.analysis.analysisId;
  return Object.entries(v.stories).every(
    ([id, s]) =>
      isStory(s) &&
      s.analysisId === analysisId &&
      s.candidateId === id &&
      ids.includes(id),
  );
}
