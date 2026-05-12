# KBSI 4GSR Beamline PV Naming Rule Kit

빔라인 PV 원자료를 표준 PV registry와 reference 문서로 정리하기 위한
rule kit입니다.

사용자는 빔라인별 원자료를 `inputs/`에 넣고 agent에게 정리를 요청합니다.
원자료는 Markdown, JSON, XML, txt, 메모처럼 섞여 있어도 됩니다. agent는
먼저 원자료에서 PV 후보를 한 줄씩 추출한 뒤, 룰북과 의사결정 기록을 참고해
`outputs/`에 바로 사용할 수 있는 PV 목록을 만들고, 예외나 미정 항목은
`reviews/`와 `exceptions/`에 남깁니다.

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

현재 v0 기준 요약입니다. 자세한 active rule은
`rules/draft/PV_NAMING_RULEBOOK.md`와 `rules/review/PV_REVIEW_RULEBOOK.md`를
봅니다. 결정 이유와 배경은 `rules/decisions/`에 있습니다.

사람에게 배포하거나 회의에서 비교할 표준 문서 후보는 `standards/`에 둡니다.
`standards/`의 문서는 active rulebook이 아니며, 최종 결정 후 룰북과 schema에
반영해야 실제 생성 규칙이 됩니다.

```text
Prefix: ID10
Structure: ID10:{Area}:{Device}:{AxisOrFunction}
Area: PTL, FE, OH, EH
Unknown area: PTL + note
Default area examples: IVU -> PTL, DCM01/WBSLT01/PH01 -> OH, STG01 -> EH
Axis/function suffix: lowercase
Multi-word suffix: underscore
Directionless axis: m01, m02, ...
White beam slit token: WBSLT
Canonical output: outputs/<beamline>/pv_registry.yaml
Rendered document: outputs/<beamline>/PV_REFERENCE.md
Raw extraction: outputs/<beamline>/_work/raw_extracted_pvs.yaml
Draft self-review: reviews/<beamline>/SELF_REVIEW.md
Review/fix log: reviews/<beamline>/REVIEW.md
```

예시:

```text
ID10:PTL:IVU:girder_y
ID10:OH:DCM01:yaw
ID10:EH:STG01:x
ID10:OH:PH01:m01
ID10:OH:WBSLT01:hgap
```

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
- `schemas/`: 추후 canonical data schema

`temp/`와 `notes/`는 작업용 디렉토리이며 배포 대상에서 제외합니다.
