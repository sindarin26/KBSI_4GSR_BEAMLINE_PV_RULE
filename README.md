# KBSI 4GSR Beamline PV Rule Workbench

빔라인 PV 원자료를 SEO_V3 database-pool workflow와 legacy SEO_v2 output
workflow로 정리하고 검증하기 위한 내부 workbench입니다.

이 저장소의 목적은 사람에게 공유할 표준 문서 하나를 보관하는 것이 아니라,
원자료 추출, registry 생성/검토, Markdown 렌더링, coverage 검증, 예외 추적을
반복 가능하게 만드는 것입니다. 사람에게 공유할 문서는 `standards/`나
`outputs/<beamline>/PV_REFERENCE.md`만 골라서 사용합니다.

## Database-Pool Commands

현재 새 작업의 기본 경로는 SEO_V3 database-pool입니다.

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
PORT=8765 HOST=0.0.0.0 ./run_database_pool_workbench.sh BL10A
```

전체 database-pool pilot 검증을 실행합니다.

```text
./check_database_pool.sh
```

HTTP endpoint smoke까지 포함하려면 로컬 포트 바인딩이 가능한 환경에서 다음을
실행합니다.

```text
./check_database_pool.sh --with-http
```

Node entry point도 그대로 사용할 수 있습니다.

```text
node scripts/review_server.js --database-pool BL10A --port 8765
node scripts/review_server.js --database-pool BL10A --database-pool 4GSR_Beamline_PV_Naming_Standard_v1.0 --port 8765
node scripts/validate_database_pool.js
```

주요 파일 위치:

```text
database_pool/<pool_id>/manifest.yaml
database_pool/<pool_id>/sources/*.rows.json
database_pool/<pool_id>/decisions/*.decisions.json
fixtures/seo_v3_pilot/abbreviation_registry.json
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

## Legacy SEO_v2 Commands

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

review_queue를 빌드하고 검증합니다. 서버를 시작하기 전이나 headless CI에서
실행합니다.

```text
node scripts/build_review_queue.js ID10
node scripts/validate_review_queue.js ID10
```

사람이 브라우저에서 raw item을 검토하고 decision JSON을 저장합니다. `/api/state`
요청마다 서버가 디스크에서 파일 상태를 다시 읽습니다. `Reload` 버튼을 누르면
최신 상태를 가져옵니다. UI는 `outputs/ID10/_work/review_queue.json`이 있으면
그것을 사용하고, 없으면 `raw_extracted_pvs.yaml`로 폴백합니다.

```text
node scripts/review_server.js ID10 --port 8765
```

SEO_v2 DB JSON에 들어 있는 기존 표준 row를 리뷰 테스트용 read-only
comparison fixture로 가져옵니다.

```text
node scripts/import_seo_review_decisions.js
```

커밋 전 기본 확인:

```text
node scripts/validate_seo_v2_rules.js
node scripts/validate_registry.js ID10
node scripts/build_review_queue.js ID10
node scripts/validate_review_queue.js ID10
node scripts/render_reference.js ID10 --check
git diff --check
```

## Quick Start

### Database-Pool Path

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

### Legacy SEO_v2 Output Path

legacy `outputs/<beamline>/` 산출물이 필요할 때만 이 경로를 씁니다.

```text
inputs/BL10A/
outputs/ID10/pv_registry.yaml
outputs/ID10/PV_REFERENCE.md
outputs/ID10/_work/raw_extracted_pvs.yaml
outputs/ID10/status.yaml
reviews/ID10/SELF_REVIEW.md
```

## Database-Pool Output

`database_pool/<pool_id>/sources/*.rows.json`은 source-backed candidate row입니다.
`database_pool/<pool_id>/decisions/*.decisions.json`은 human decision overlay입니다.
`pending`, `conflict`, `needsInput` 같은 bucket은 durable status가 아니라
workbench에서 계산됩니다.

`candidate`는 abbreviation/code status입니다. row `reviewStatus`로 쓰지
않습니다. `fixed`도 row status가 아니라 approved row metadata로 다룹니다.

## Legacy SEO_v2 Output

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

Legacy 사람 리뷰 UI는 다음 JSON 파일을 씁니다. 포맷은 SEO DB JSON처럼 top-level
row array이며 `seq`, `port`, `area`, `dev`, `subdev`, `signal`, `standardPv`,
`note`, `source` 필드를 중심으로 둡니다.

```text
reviews/<beamline>/review_decisions.json
reviews/<beamline>/accepted_decisions.json
reviews/<beamline>/fixed_decisions.json
```

`review_decisions.json`은 전체 판단 이력, `accepted_decisions.json`은 이후
dataset update에 쓸 수 있는 행입니다. `fixed_decisions.json`은 legacy
compatibility 파일이며, 새 database-pool workflow에서는 fixed를 row status로
쓰지 않습니다. GUI는 이 파일들을 쓰는 입력기이며, active naming policy는
여전히 `rules/`와 schema에 있습니다.

`fixtures/SEO_v2/review_decisions.json`은 historical SEO_v2 DB row를 동일한
SEO_v2 형식으로 보존한 comparison fixture입니다. legacy Review UI는 이 rows를
비교용으로 표시하지만 저장하지 않습니다.
`scripts/import_seo_review_decisions.js`로 재생성합니다.

## Current Rule Summary

현재 새 database-pool workflow는 SEO_V3 shape를 사용합니다. legacy
`outputs/<beamline>/` 생성/검증 경로는 SEO_v2 compatibility로 남아 있습니다.
자세한 active rule은 `rules/draft/PV_NAMING_RULEBOOK.md`와
`rules/review/PV_REVIEW_RULEBOOK.md`를 봅니다. 결정 이유와 배경은
`rules/decisions/`에 있습니다.

사람에게 배포하거나 회의에서 비교할 표준 문서 후보는 `standards/`에 둡니다.
`standards/`의 문서는 active rulebook이 아니며, 최종 결정 후 룰북과 schema에
반영해야 실제 생성 규칙이 됩니다.

```text
SEO_V3 structure: [SEC/SYS][PORT]-[AREA]:[DEV]-[SUBDEV]:[SignalName]
Legacy SEO_v2 structure: BL-[PORT]:[AREA]-[DEV]-[SUBDEV]:[SignalName]
Section example: BL
Port example: 10A
Approved Markdown area examples: FE, PTL, OH, EH
Candidate follow-up area examples: SYS
Candidate device examples: IVU, MONO, HHLM, WBSLT, ION
Candidate HTML/DB-only device examples: CTRL, MOTOR
Candidate subdevice examples: GIRD, ENC, CRYS, MIRR, SLIT, STG
Candidate HTML/DB-only subdevice examples: DIAG, LOGIC
SignalName: upper-initial form matching [A-Z][A-Za-z0-9]*; stricter CamelCase validation is deferred
White beam slit token: WBSLT
Database-pool schema: schemas/database_pool.seo_v3.yaml
Legacy registry schema: schemas/pv_registry.seo_v2.yaml
Database-pool rows: database_pool/<pool_id>/sources/*.rows.json
Database-pool decisions: database_pool/<pool_id>/decisions/*.decisions.json
Legacy output: outputs/<beamline>/pv_registry.yaml
Rendered document: outputs/<beamline>/PV_REFERENCE.md
Raw extraction: outputs/<beamline>/_work/raw_extracted_pvs.yaml
Draft self-review: reviews/<beamline>/SELF_REVIEW.md
Review/fix log: reviews/<beamline>/REVIEW.md
```

예시:

```text
BL10A-FE:IVU-GIRD:Y
BL10A-FE:IVU-ENC:US
BL10A-OH:MONO-CRYS:Theta
BL10A-OH:WBSLT-SLIT:Vgap
BL10A-EH:SMPL-STG:X
```

과거 `ID10:{Area}:{Device}:{AxisOrFunction}` v0 자료와 legacy SEO_v2 output은
migration/reference 용도로 남겨둡니다. 새 reviewable dataset은
database-pool SEO_V3 구조로 작성합니다.

## Repository Map

- `AGENTS.md`: LLM/agent 운영 지침
- `ARCHITECTURE.md`: 저장소 구조와 workflow 규칙
- `rules/draft/`: 초안 생성 룰북
- `rules/review/`: 검토 룰북
- `rules/decisions/`: 룰의 의사결정 기록과 판단 근거
- `standards/`: 사람용 표준 문서와 후보안
- `inputs/`: 빔라인별 원자료
- `database_pool/`: SEO_V3 reviewable source rows and decision overlays
- `outputs/`: 생성된 canonical registry와 reference 문서
- `reviews/`: 검토 리포트
- `exceptions/`: 현재 룰로 처리하기 어려운 실제 케이스
- `proposals/`: exception을 공식 룰로 편입하기 위한 변경 제안
- `examples/`: good/bad/before-after 예제
- `fixtures/`: 테스트/비교용 fixture 데이터
- `schemas/`: database-pool SEO_V3 and legacy SEO_v2 schema contracts
- `scripts/`: 검증/유지보수 스크립트

`temp/`와 `notes/`는 작업용 디렉토리이며 배포 대상에서 제외합니다.
