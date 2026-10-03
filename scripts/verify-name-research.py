"""Structural integrity checks only; this does not verify human transcription accuracy or legal usability."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load(name):
    return json.loads((ROOT / "docs/research" / name).read_text(encoding="utf-8"))


hanja = load("2026-09-30-name-mvp-hanja-verification.json")
suri = load("2026-09-30-name-mvp-suri-verification.json")
strokes = load("2026-09-30-name-mvp-original-strokes.json")
expansion = load("2026-09-30-name-mvp-hanja-expansion.json")

stroke_rows = strokes["rows"]
assert len(stroke_rows) == strokes["unique_characters"] == 21
stroke_by_char = {row["character"]: row for row in stroke_rows}
assert len(stroke_by_char) == len(stroke_rows), "duplicate original-stroke character"
assert strokes["source_name"].strip() and strokes["locator_format"] == "[page, character_ordinal_on_page]"
expansion_rows = expansion["rows"]
expansion_chars = [row["character"] for row in expansion_rows]
assert len(expansion_rows) == 5 and len(expansion_chars) == len(set(expansion_chars))
assert set(expansion_chars).isdisjoint(stroke_by_char)
for row in expansion_rows:
    evidence = row["original_strokes_evidence"]
    assert row["original_strokes"] == evidence["kangxi_total"]
    assert row["original_strokes_status"] == "kangxi_transcription_entry_checked"
    assert evidence["policy"] == "kangxi-tongwen-entry-v1"
    assert evidence["source"].startswith("https://") and evidence["scan_visually_verified"] is False
    assert len(evidence["tongwen"]) == len(evidence["wuying"]) == 2
    assert all(type(value) is int and value > 0 for locator in (evidence["tongwen"], evidence["wuying"]) for value in locator)
    assert evidence["radical_strokes"] > 0 and evidence["outside_strokes"] >= 0
    assert evidence["radical_strokes"] + evidence["outside_strokes"] == evidence["kangxi_total"] > 0
for row in stroke_rows:
    assert len(row["character"]) == 1
    assert row["source"].startswith("https://") and row["volume"].strip()
    assert row["tongwen"] and row["wuying"]
    for edition in (row["tongwen"], row["wuying"]):
        assert len(edition) == 2 and all(type(value) is int and value > 0 for value in edition)
    for field in ("radical_strokes", "outside_strokes", "kangxi_total"):
        value = row[field]
        assert type(value) is int and value >= 0
    assert row["kangxi_total"] > 0
    assert row["radical_strokes"] + row["outside_strokes"] == row["kangxi_total"]

assert {row["character"] for row in hanja["rows"]} == set(stroke_by_char)
assert "연구 단계의 글자 후보 자격" in hanja["eligibility_scope_note"]
for row in hanja["rows"]:
    source = stroke_by_char[row["character"]]
    value = row["strokes"]
    assert value["status"] == "source_entry_checked_under_adopted_policy"
    assert value["policy"] == "kangxi-tongwen-entry-v1"
    assert value["original"] == source["kangxi_total"]
    assert value["source"] == source["source"] and value["tongwen"] == source["tongwen"]
    assert value["scan_visually_verified"] is False
    assert value["observed_modern_total"] is not None
    assert "실제 이름 조합·정확히 일치하는 제외 규칙" not in row["remaining_gates"]
    assert "공식 자형 머신 코드포인트 대조" not in row["remaining_gates"]
    expected = row["official"]["status"] == "verified_live_visual" and bool(row["meaning"]["text"] and row["meaning"]["text"].strip()) \
        and row["element"]["status"] == "reviewed_service_interpretation" and row["element"]["value"] is not None \
        and row["suitability"]["status"] == "character_semantics_reviewed"
    assert row["recommendation_eligible"] is expected
    assert bool(row["remaining_gates"]) is (not expected)

keys = [(row["character"], row["reading"]) for row in hanja["rows"]]
assert len(keys) == len(set(keys)), "duplicate (character, reading) key"
for row in hanja["rows"]:
    char = row["character"]
    assert len(char) == 1, f"character must be one Unicode code point: {char!r}"
    if row["meaning"]["text"] is not None:
        assert row["meaning"]["text"].strip()
    assert row["meaning"]["source"].strip()
    assert row["meaning"]["locator"].strip(), f"empty locator: {char}"
    assert row["official"]["status"] == "verified_live_visual"
    assert row["official"]["source"].strip() and row["official"]["locator"].strip()
    assert char in row["official"]["locator"]
    assert isinstance(row["official"]["machine_codepoint_verified"], bool)
    assert row["element"]["status"] in ("reviewed_service_interpretation", "withheld")
    assert row["suitability"]["status"] in (
        "character_semantics_reviewed", "excluded_initial_recommendation", "withheld"
    )
    assert row["suitability"]["reason"].strip()
    assert row["recommendation_eligible"] is (row["meaning"]["text"] is not None
        and row["element"]["status"] == "reviewed_service_interpretation" and row["element"]["value"] is not None
        and row["suitability"]["status"] == "character_semantics_reviewed")

rows = suri["rows"]
assert len(rows) == 81 and [row[0] for row in rows] == list(range(1, 82))
assert len({row[0] for row in rows}) == 81
for number, printed_page, frame, *_ in rows:
    assert printed_page and frame, f"missing source locator for {number}"

# Check the four published arithmetic examples only; do not infer any reduction rule.
examples = {
    "原敬": lambda s: [s[1] + 1, s[0] + s[1], 2, s[0] + s[1]],
    "松方巖": lambda s: [s[2] + 1, s[1] + s[2], s[0] + 1, sum(s)],
    "沖禎介": lambda s: [s[1] + s[2], s[0] + s[1], 1 + s[2], sum(s)],
    "尾崎行雄": lambda s: [s[2] + s[3], s[1] + s[2], s[0] + s[3], sum(s)],
}
assert len(suri["formulas"]["examples"]) == 4
for example in suri["formulas"]["examples"]:
    assert example["source_name"] in examples
    assert examples[example["source_name"]](example["strokes"]) == example["source_result"], example

for row in expansion_rows:
    expected = row["official_status"] == "2024_table_hosted_copy_visual_verified" and bool(row["meaning"]) \
        and row["element_status"] == "reviewed_service_interpretation" and row["element"] is not None
    assert row["recommendation_eligible"] is expected
    assert bool(row["remaining_gates"]) is (not expected)

assert sum(row["recommendation_eligible"] for row in hanja["rows"]) == 18
assert sum(row["recommendation_eligible"] for row in expansion_rows) == 3
assert len({row["character"] for row in hanja["rows"] if row["recommendation_eligible"]}
           | {row["character"] for row in expansion_rows if row["recommendation_eligible"]}) == 20
print(f"OK: {len(hanja['rows'])} hanja rows, 18 eligible pairs; 5 expansion rows, 3 eligible pairs; 81 suri rows; 4 arithmetic examples")
