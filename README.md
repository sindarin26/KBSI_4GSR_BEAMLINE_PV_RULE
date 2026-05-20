# KBSI 4GSR Beamline PV Rule Workbench

빔라인 PV 원자료를 SEO_v2 기준 PV registry와 reference 문서로 정리하고
검증하기 위한 내부 workbench입니다.

이 저장소의 목적은 사람에게 공유할 표준 문서 하나를 보관하는 것이 아니라,
원자료 추출, registry 생성/검토, Markdown 렌더링, coverage 검증, 예외 추적을
반복 가능하게 만드는 것입니다. 사람에게 공유할 문서는 `standards/`나
`outputs/<beamline>/PV_REFERENCE.md`만 골라서 사용합니다.

## Workbench Commands

SEO_v2 rule/source 자체를 확인합니다.

```text
node scripts/validate_seo_v2_rules.js
```

특정 beamline output을 검증합니다.

```text
node scripts/validate_registry.js ID10
```

`pv_registry.yaml`에서 `PV_REFERENCE.md`를 렌더링하거나 현재 상태를
확인합니다.

```text
node scripts/render_reference.js ID10 --check
node scripts/render_reference.js ID10 --write
```

커밋 전 기본 확인:

```text
node scripts/validate_seo_v2_rules.js
node scripts/validate_registry.js ID10
node scripts/render_reference.js ID10 --check
git diff --check
```

## Quick Start

1. 빔라인별 원자료를 넣습니다.

```text
inputs/ID10/
```

2. agent에게 요청합니다.

```text
inputs/ID10 자료를 보고 PV 리스트를 정리해줘.
```

3. 결과를 확인합니다.

```text
outputs/ID10/pv_registry.yaml
outputs/ID10/PV_REFERENCE.md
outputs/ID10/_work/raw_extracted_pvs.yaml
outputs/ID10/status.yaml
reviews/ID10/SELF_REVIEW.md
```

## Output

`pv_registry.yaml`이 canonical source입니다.

`PV_REFERENCE.md`는 사람이 보는 렌더링 문서입니다. 빔라인 GitHub 저장소나
문서 최상위에 붙일 때는 이 파일을 사용합니다.

`_work/raw_extracted_pvs.yaml`은 누락과 환각을 줄이기 위한 중간 추출
목록입니다. 각 raw 항목은 `raw_id`를 받고, registry, exception, skipped
항목의 합집합으로 빠짐없이 처리되어야 합니다. 같은 `raw_id`가 임시 registry
항목과 exception에 cross-link될 수 있지만 coverage에서는 한 번만 셉니다.
최종 사용자는 보통 `pv_registry.yaml`과 `PV_REFERENCE.md`만 보면 되지만,
감사와 재현성을 위해 `_work/raw_extracted_pvs.yaml`도 output과 함께 보존합니다.

`status.yaml`은 해당 output directory가 `draft`, `reviewed`, `approved`, 또는
`legacy` 중 어디에 해당하는지 기계가 읽을 수 있게 기록합니다.

초안 생성 시 자체 검토는 `SELF_REVIEW.md`에 남깁니다. 별도 리뷰 작업을
요청하면 리뷰 agent는 가능한 명백한 오류를 output에 직접 반영하고,
수정 내역과 남은 판단사항을 `REVIEW.md`에 남깁니다. 사용자가 "리뷰만"을
명시하면 output을 수정하지 않습니다.

예외나 미정 항목은 다음 위치에 남깁니다.

```text
reviews/<beamline>/
exceptions/<beamline>/
```

## Current Rule Summary

현재 SEO_v2 / 4GSR standard v1.0 기준 요약입니다. 자세한 active rule은
`rules/draft/PV_NAMING_RULEBOOK.md`와 `rules/review/PV_REVIEW_RULEBOOK.md`를
봅니다. 결정 이유와 배경은 `rules/decisions/`에 있습니다.

사람에게 배포하거나 회의에서 비교할 표준 문서 후보는 `standards/`에 둡니다.
`standards/`의 문서는 active rulebook이 아니며, 최종 결정 후 룰북과 schema에
반영해야 실제 생성 규칙이 됩니다.

```text
Structure: BL-[PORT]:[AREA]-[DEV]-[SUBDEV]:[SignalName]
Section: BL
Port example: 10C
Area: FE, PTL, OH, EH, SYS
Device examples: IVU, MONO, HHLM, WBSLT, ION, CTRL, MOTOR
Subdevice examples: GIRD, ENC, CRYS, MIRR, SLIT, DIAG, LOGIC, STG
SignalName: upper-initial CamelCase/PascalCase
White beam slit token: WBSLT
Canonical schema: schemas/pv_registry.seo_v2.yaml
Canonical output: outputs/<beamline>/pv_registry.yaml
Rendered document: outputs/<beamline>/PV_REFERENCE.md
Raw extraction: outputs/<beamline>/_work/raw_extracted_pvs.yaml
Draft self-review: reviews/<beamline>/SELF_REVIEW.md
Review/fix log: reviews/<beamline>/REVIEW.md
```

예시:

```text
BL-10C:FE-IVU-GIRD:Y
BL-10C:FE-IVU-ENC:US
BL-10C:OH-MONO-CRYS:Theta
BL-10C:OH-WBSLT-SLIT:Hgap
BL-10C:SYS-CTRL-LOGIC:UserAve1
```

과거 `ID10:{Area}:{Device}:{AxisOrFunction}` v0 자료는 migration/reference
용도로만 남겨둡니다. 새 산출물은 active SEO_v2 구조로 작성해야 합니다.

## Repository Map

- `AGENTS.md`: LLM/agent 운영 지침
- `ARCHITECTURE.md`: 저장소 구조와 workflow 규칙
- `rules/draft/`: 초안 생성 룰북
- `rules/review/`: 검토 룰북
- `rules/decisions/`: 룰의 의사결정 기록과 판단 근거
- `standards/`: 사람용 표준 문서와 후보안
- `inputs/`: 빔라인별 원자료
- `outputs/`: 생성된 canonical registry와 reference 문서
- `reviews/`: 검토 리포트
- `exceptions/`: 현재 룰로 처리하기 어려운 실제 케이스
- `proposals/`: exception을 공식 룰로 편입하기 위한 변경 제안
- `examples/`: good/bad/before-after 예제
- `schemas/`: SEO_v2 registry/raw/status schema contract
- `scripts/`: 검증/유지보수 스크립트

`temp/`와 `notes/`는 작업용 디렉토리이며 배포 대상에서 제외합니다.
