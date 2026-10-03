/** 원문 확인 수준과 제품 채택 상태는 서로 다른 계약이다. */
export interface RuleSource {
  readonly id: string;
  readonly citation: string;
  readonly url: string;
  readonly locator: string;
  readonly rights: string;
  readonly checkedAt: string;
  readonly verification: 'official_publication_checked' | 'primary_transcription_checked' | 'primary_scan_checked';
}

export type RuleReferenceValue =
  | string | number | boolean | null
  | readonly RuleReferenceValue[]
  | { readonly [key: string]: RuleReferenceValue };

/** Task 7 자료 표본의 계약. 각 규칙표의 정밀한 입력·출력 타입은 Task 8~9에서 정의한다. */
export type RuleReferenceCase = {
  readonly id: string;
  readonly ruleId: string;
  readonly sourceIds: readonly [string, ...string[]];
  readonly locator: string;
  readonly input: RuleReferenceValue;
  readonly expected: RuleReferenceValue;
} & (
  | { readonly status: 'adopted'; readonly policyId: string | null }
  | { readonly status: 'proposed'; readonly policyId: string }
);
