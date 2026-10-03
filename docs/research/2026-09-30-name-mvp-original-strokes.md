# MVP 21자 康熙 획수 근거 보완

검토일: 2026-09-30. 검토자: Codex AI 연구 에이전트. 전문가 검증 아님.

기존 한자 검증표의 21개 고유 자형을 대상으로 **康熙字典網上版의 개별 표제자 전사와 획수 메타데이터**를 열어 확인했다. 각 항목은 부수획·부외획·총획 및 同文書局本/武英殿本의 페이지와 글자 순서를 함께 제공한다. 아래 값은 일반 사전의 현대 총획을 원획으로 옮긴 값이 아니다. 다만 원본 스캔 전체를 육안 교감한 결과도 아니다. 웹사이트 편집자의 획수 메타데이터와 원문 전사를 확인한 단계이며, 국내 작명 원획 규칙의 모든 예외를 검증했다는 뜻으로 사용하면 안 된다.

동반 JSON의 상태는 `kangxi_transcription_entry_checked`이다. 연구용 `kangxi_total`에 값을 기록했으며, 기존 운영 데이터·추천 적격·독음·오행 필드는 수정하지 않았다. 정책이 康熙 총획을 원획 기준으로 채택한 경우에만 이 근거를 연결한다.

| 자형 | 부수 | 부수획+부외획 | 康熙 총획 | 同文書局本 페이지·제n자 | 武英殿本 페이지·제n자 | 열람한 전사 |
|---|---|---:|---:|---|---|---|
| 林 | 木 | 4+4 | 8 | 516·5 | 2467·5 | [林](https://ww2.kangxizidian.com/v2/index.php?page=2467&sword=%E6%9E%97) |
| 森 | 木 | 4+8 | 12 | 534·11 | 2550·5 | [森](https://www.kangxizidian.com/kxhans/%E6%A3%AE) |
| 松 | 木 | 4+4 | 8 | 514·11 | 2460·1 | [松](https://www.kangxizidian.com/kxhans/%E6%9D%BE) |
| 柏 | 木 | 4+5 | 9 | 518·22 | 2480·1 | [柏](https://www.kangxizidian.com/kxhans/%E6%9F%8F) |
| 桐 | 木 | 4+6 | 10 | 525·17 | 2511·5 | [桐](https://www.kangxizidian.com/kxhans/%E6%A1%90) |
| 泉 | 水 | 4+5 | 9 | 615·12 | 2940·3 | [泉](https://www.kangxizidian.com/kxhans/%E6%B3%89) |
| 江 | 水 | 4+3 | 7 | 606·4 | 2898·2 | [江](https://www.kangxizidian.com/kxhans/%E6%B1%9F) |
| 海 | 水 | 4+7 | 11 | 625·14 | 2984·2 | [海](https://www.kangxizidian.com/kxhans/%E6%B5%B7) |
| 炎 | 火 | 4+4 | 8 | 667·13 | 3187·7 | [炎](https://www.kangxizidian.com/kxhans/%E7%82%8E) |
| 炫 | 火 | 4+5 | 9 | 668·19 | 3193·1 | [炫](https://www.kangxizidian.com/search/index_v.php?detail=y&stype=Word&sword=%E7%82%AB) |
| 煜 | 火 | 4+9 | 13 | 677·15 | 3232·10 | [煜](https://www.kangxizidian.com/kxhans/%E7%85%9C) |
| 煥 | 火 | 4+9 | 13 | 677·33 | 3235·2 | [煥](https://www.kangxizidian.com/kxhans/%E7%85%A5) |
| 土 | 土 | 3+0 | 3 | 223·1 | 1040·1 | [土](https://www.kangxizidian.com/kxhans/%E5%9C%9F) |
| 坤 | 土 | 3+5 | 8 | 226·14 | 1054·4 | [坤](https://www.kangxizidian.com/kxhans/%E5%9D%A4) |
| 岳 | 山 | 3+5 | 8 | 309·31 | 1474·3 | [岳](https://www.kangxizidian.com/kxhans/%E5%B2%B3) |
| 金 | 金 | 8+0 | 8 | 1295·1 | 6204·1 | [金](https://kangxizidian.com/kxhans/%E9%87%91) |
| 鈺 | 金 | 8+5 | 13 | 1300·2 | 6226·2 | [鈺](https://www.kangxizidian.com/kxhans/%E9%88%BA) |
| 銀 | 金 | 8+6 | 14 | 1303·25 | 6243·3 | [銀](https://www.kangxizidian.com/kxhans/%E9%8A%80) |
| 銅 | 金 | 8+6 | 14 | 1304·5 | 6244·5 | [銅](https://www.kangxizidian.com/kxhans/%E9%8A%85) |
| 永 | 水 | 4+1 | 5 | 603·4 | 2886·2 | [永](https://www.kangxizidian.com/kxhans/%E6%B0%B8) |
| 昱 | 日 | 4+5 | 9 | 494·3 | 2356·3 | [昱](https://www.kangxizidian.com/kxhans/%E6%98%B1) |

江와 海는 물수 부수 4획이 해당 표제자에 명시되어 각각 7획·11획이다. 기존 일반 총획 6·10과 구분한다. 松 검색에는 鬆 항목도 같이 나오므로 U+677E 松 항목만 사용했다. 岳는 U+5CB3 표제자의 8획이며, 뜻이나 이체 관계만으로 嶽의 획수로 치환하지 않았다. 각 판단의 근거는 위 개별 항목이다.

접근 한계: ctext 森 항목 열람은 403, 林의 武英殿 원본 이미지 링크는 cache miss였다. 나머지 20자의 스캔을 확인했다고 주장하지 않는다. 일반 검색 경로에서 炫·金에 접근 오류가 있었으나 위 대체 URL로 본문을 열었다. 획수와 판본 위치는 홈페이지 안내나 검색 요약만으로 채우지 않고 각 글자의 본문에서 확인했다. 사이트 전사·메타데이터의 상업적 일괄 재사용 권리는 이번 작업에서 확인하지 않았다.

200자 확장 시 사용할 수 있는 원본 탐색 진입점(일괄 추출 또는 라이선스 승인 아님):

- [康熙字典網上版](https://www.kangxizidian.com/)
- [金부 첫 페이지](https://www.kangxizidian.com/kxbushous/%E9%87%91/1)
- [同文書局本·武英殿本 링크가 있는 표제자 검색 예](https://www.kangxizidian.com/kxhans/%E6%A3%AE)

산출물 검토 범위: 21자 자형과 출처별 획수·판본 위치 전사 대조. 원본 스캔 교감, 국내 작명 규칙 승인, 전문가 검수 및 배포권 검토는 미완료다.

로컬 기존값 비교: `packages/database/data/hanja_dictionary.json`의 `original_stroke_count`와 위 21자의 웹 확인값을 대조했다. 21자 모두 일치하며 차이 목록은 비어 있다. 江=7·海=11은 기존 로컬 원획과도 일치한다. 앞서 언급한 6·10은 교육부 일반 총획 관측값으로, 로컬 원획 오류를 뜻하지 않는다. JSON 파싱·21행 수·부수획+부외획 합계를 확인했으며 이상이 없었다.
