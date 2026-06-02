# KBSI 4GSR Beamline PV Rule Workbench

빔라인 PV 원자료를 SEO_V3 database-pool workflow로 정리하고 검증하기 위한
내부 workbench입니다. SEO_v2 / v0 경로는 2026-06-02 hard-reset alignment 때
모두 제거되었습니다.

이 저장소의 목적은 사람에게 공유할 표준 문서 하나를 보관하는 것이 아니라,
원자료 추출, 검토 가능한 SEO_V3 row 생성, abbreviation 검토, exception
추적을 반복 가능하게 만드는 것입니다.

## Database-Pool Commands

원자료 import를 미리 봅니다. 기본값은 preview-only라 파일을 쓰지 않습니다.

```text
node scripts/import_database_pool.js --input inputs/BL10A --pool BL10A
```

검토할 source row 파일을 생성합니다. 모든 row는 `needs_input`으로 시작합니다.

```text
node scripts/import_database_pool.js --input inputs/BL10A --pool BL10A --write
```

브라우저 review workbench를 실행합니다. wrapper는 URL을 출력한 뒤 서버를
시작합니다.

```text
./run_database_pool_workbench.sh
```

특정 pool만 열고 싶으면 pool id를 positional argument로 넘깁니다. 인자가
없으면 `database_pool/*/manifest.yaml`을 스캔해서 모든 pool을 명시적인
`--database-pool` 인자로 서버에 넘깁니다.

```text
./run_database_pool_workbench.sh BL10A
./run_database_pool_workbench.sh BL10A 4GSR_Beamline_PV_Naming_Standard_v1.0
```

포트나 host가 필요하면 환경 변수로 지정합니다.

```text
PORT=8212 HOST=0.0.0.0 ./run_database_pool_workbench.sh BL10A
```

전체 database-pool 검증을 실행합니다.

```text
./check_database_pool.sh
```

Node entry point도 그대로 사용할 수 있습니다.

```text
node scripts/review_server.js --database-pool BL10A --port 8212
node scripts/review_server.js --database-pool BL10A --database-pool 4GSR_Beamline_PV_Naming_Standard_v1.0 --port 8212
node scripts/validate_database_pool.js
```

주요 파일 위치:

```text
inputs/<pool_id>/
inputs/4GSR_Beamline_PV_Naming_Standard_v1.0/standard.md
database_pool/<pool_id>/manifest.yaml
database_pool/<pool_id>/sources/*.rows.json
database_pool/<pool_id>/decisions/*.decisions.json
database_pool/abbreviations/registry.json
schemas/database_pool.seo_v3.yaml
```

SEO_V3 PV shape:

```text
[SEC/SYS][PORT]-[AREA]:[DEV]-[SUBDEV]:[SignalName]
```

예시:

```text
BL10A-FE:IVU-GIRD:Y
BL10A-OH:MONO-CRYS:Theta
BL10A-EH:SMPL-STG:X
```

## Quick Start

1. 빔라인별 원자료를 넣습니다. 현재 BL10A pilot source 위치는 다음입니다.

```text
inputs/BL10A/
```

2. import preview를 실행합니다. 이 단계는 파일을 쓰지 않습니다.

```text
node scripts/import_database_pool.js --input inputs/BL10A --pool BL10A
```

3. preview 결과를 확인한 뒤 source row 파일을 생성합니다.

```text
node scripts/import_database_pool.js --input inputs/BL10A --pool BL10A --write
```

4. 브라우저에서 검토합니다.

```text
./run_database_pool_workbench.sh
```

5. 검증을 실행합니다.

```text
./check_database_pool.sh
```

생성/검토되는 주요 파일은 다음입니다.

```text
database_pool/<pool_id>/manifest.yaml
database_pool/<pool_id>/sources/*.rows.json
database_pool/<pool_id>/decisions/*.decisions.json
```

## Database-Pool Output

`database_pool/<pool_id>/sources/*.rows.json`은 source-backed candidate row입니다.
`database_pool/<pool_id>/decisions/*.decisions.json`은 human decision overlay입니다.
`pending`, `conflict`, `needsInput` 같은 bucket은 durable status가 아니라
workbench에서 계산됩니다.

`candidate`는 abbreviation/code status입니다. row `reviewStatus`로 쓰지
않습니다.

SEO_V3 abbreviation review records의 source of truth는 다음 파일입니다.

```text
database_pool/abbreviations/registry.json
```

이 파일의 각 entry는 source, status, rationale, usageEvidence를 갖습니다.
`candidate` entry는 row approval을 자동으로 허용하지 않습니다.

## Current Rule Summary

현재 active rule은 `rules/draft/PV_NAMING_RULEBOOK.md`와
`rules/review/PV_REVIEW_RULEBOOK.md`입니다. 두 룰북은 2026-06-02 hard-reset
alignment 직후로 skeleton 상태이며, 실제 작업에서는 다음을 작업 기준으로
씁니다.

- 표준 문서: `inputs/4GSR_Beamline_PV_Naming_Standard_v1.0/standard.md`
- abbreviation registry: `database_pool/abbreviations/registry.json`
- 변환 절차: `rules/draft/DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md`

결정 이유와 배경은 `rules/decisions/`에 있습니다.

사람에게 배포하거나 회의에서 비교할 표준 문서 후보는 `standards/candidates/`에
둡니다. `standards/`의 문서는 active rulebook이 아니며, 최종 결정 후 룰북과
schema에 반영해야 실제 생성 규칙이 됩니다.

```text
SEO_V3 structure: [SEC/SYS][PORT]-[AREA]:[DEV]-[SUBDEV]:[SignalName]
Section example: BL
Port example: 10A
Approved area examples: FE, PTL, OH, EH
Candidate follow-up area examples: SYS
Database-pool schema: schemas/database_pool.seo_v3.yaml
Database-pool rows: database_pool/<pool_id>/sources/*.rows.json
Database-pool decisions: database_pool/<pool_id>/decisions/*.decisions.json
Abbreviation review registry: database_pool/abbreviations/registry.json
Draft self-review: reviews/<beamline-or-pool>/SELF_REVIEW.md  # local ignored
Review/fix log: reviews/<beamline-or-pool>/REVIEW.md  # local ignored
```

예시:

```text
BL10A-FE:IVU-GIRD:Y
BL10A-FE:IVU-ENC:US
BL10A-OH:MONO-CRYS:Theta
BL10A-OH:WBSLT-SLIT:Vgap
BL10A-EH:SMPL-STG:X
```

## Repository Map

- `AGENTS.md`: LLM/agent 운영 지침
- `ARCHITECTURE.md`: 저장소 구조와 workflow 규칙
- `rules/draft/`: 초안 생성 룰북
- `rules/review/`: 검토 룰북
- `rules/decisions/`: 룰의 의사결정 기록과 판단 근거
- `standards/`: 사람용 표준 후보 문서
- `inputs/`: 빔라인별 원자료 + SEO_V3 표준 문서
- `database_pool/`: SEO_V3 reviewable source rows, decision overlays, abbreviation registry
- `outputs/`: 향후 export/render 산출물용 (현재 비어있음)
- `reviews/`: local ignored 검토 리포트와 리뷰 결정 파일
- `exceptions/`: 현재 룰로 처리하기 어려운 실제 케이스
- `proposals/`: exception을 공식 룰로 편입하기 위한 변경 제안
- `examples/`: good/bad/before-after 예제
- `schemas/`: SEO_V3 database-pool schema contract
- `scripts/`: 검증/유지보수 스크립트

`notes/`, `reviews/`는 작업용 디렉토리이며 배포 대상에서 제외됩니다.
