"use client";
import { useRef, useState } from "react";
import { createMock, type Scenario } from "../lib/dev/mock";
import { NameApp } from "./NameApp";
import { Button } from "./ui";
export default function DevApp() {
  const [scenario, setScenario] = useState<Scenario>({
    analysis: "success",
    story: "success",
    hanja: "rows",
    count: 3,
  });
  const current = useRef(scenario);
  current.current = scenario;
  const [mock] = useState(() => createMock(() => current.current));
  const [storage, setStorage] = useState(false);
  const [copy, setCopy] = useState(false);
  return (
    <>
      <aside className="dev-panel">
        <details>
          <summary>개발용 시연 · 실제 추천·AI 생성 아님</summary>
          <div className="stack">
            <p>
              일반 서비스와 분리된 가상 데이터입니다. 분석·회상문 API는 호출하지
              않아요. 시연 기록은 별도 키에 저장합니다.
            </p>
            <div className="dev-controls">
              <label>
                분석 응답
                <select
                  className="control"
                  value={scenario.analysis}
                  onChange={(e) =>
                    setScenario({
                      ...scenario,
                      analysis: e.target.value as Scenario["analysis"],
                    })
                  }
                >
                  {Object.entries({
                    success: "후보 있음",
                    time: "시간에 따른 보류",
                    balance: "균형형만 보류",
                    both: "두 유형 보류",
                    shortage: "후보 자료 부족",
                    failure: "분석 실패",
                    loading: "응답 대기",
                  }).map(([v, t]) => (
                    <option value={v} key={v}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                회상문 응답
                <select
                  className="control"
                  value={scenario.story}
                  onChange={(e) =>
                    setScenario({
                      ...scenario,
                      story: e.target.value as Scenario["story"],
                    })
                  }
                >
                  {Object.entries({
                    success: "시연 성공",
                    failure: "재시도 후 실패",
                    disabled: "신규 생성 중단",
                    uncertain: "생성 여부 불명",
                    loading: "응답 대기",
                  }).map(([v, t]) => (
                    <option value={v} key={v}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                한자 검색
                <select
                  className="control"
                  value={scenario.hanja}
                  onChange={(e) =>
                    setScenario({
                      ...scenario,
                      hanja: e.target.value as Scenario["hanja"],
                    })
                  }
                >
                  <option value="rows">시연 자료</option>
                  <option value="empty">자료 없음</option>
                  <option value="failure">검색 실패</option>
                </select>
              </label>
              <label>
                균형형 후보 수
                <select
                  className="control"
                  value={scenario.count}
                  onChange={(e) =>
                    setScenario({ ...scenario, count: Number(e.target.value) })
                  }
                >
                  {[1, 2, 3].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={storage}
                onChange={(e) => setStorage(e.target.checked)}
              />
              저장 실패 시연
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={copy}
                onChange={(e) => setCopy(e.target.checked)}
              />
              복사 실패 시연
            </label>
            <Button variant="secondary" onClick={mock.complete}>
              대기 요청 완료
            </Button>
          </div>
        </details>
      </aside>
      <NameApp dev api={mock.api} failStorage={storage} failCopy={copy} />
    </>
  );
}
