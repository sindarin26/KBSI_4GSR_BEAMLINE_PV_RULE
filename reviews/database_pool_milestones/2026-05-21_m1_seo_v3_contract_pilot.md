# 2026-05-21 M1 SEO_V3 Contract Pilot Closeout

## Scope

Milestone 1 implemented the SEO_V3 contract pilot only.

Included:

- pilot-only parser/render helper under `scripts/seo_v3_pilot/`;
- pilot-only validation runner under `scripts/seo_v3_pilot/`;
- pilot fixture rows under `fixtures/seo_v3_pilot/`;
- validation of the SEO_V3 rendered shape and `standardPv` derived invariant.

Excluded:

- no `ARCHITECTURE.md` or `AGENTS.md` update;
- no active SEO_v2 rulebook rewrite;
- no `schemas/pv_registry.seo_v2.yaml` replacement;
- no ID10/BL10A output migration;
- no UI work;
- no abbreviation registry gating or Review-tab `pending` behavior.

## Deliverables

- `scripts/seo_v3_pilot/seo_v3_contract.js`
- `scripts/seo_v3_pilot/validate_contract.js`
- `scripts/seo_v3_pilot/README.md`
- `fixtures/seo_v3_pilot/source_rows.json`

## Validation

Passed:

```text
node scripts/seo_v3_pilot/validate_contract.js
node --check scripts/seo_v3_pilot/seo_v3_contract.js
node --check scripts/seo_v3_pilot/validate_contract.js
node scripts/validate_seo_v2_rules.js
git diff --check
```

The pilot validation covers:

- eight SEO_V3 Markdown golden examples;
- SEO_v2 shape rejection;
- future `SR` section grammar parse;
- `BL110A` section/port ambiguity rejection;
- lowercase signal rejection;
- empty required component rejection;
- stored `standardPv` component/render mismatch rejection.

## Read-Only Review

Subagent review found:

- Blocker: none.
- Important: none.
- Minor: new pilot paths were untracked before commit.

Reviewer conclusion:

- M1 can close after adding the pilot files and this closeout to the intended
  commit.

## Deferred To Later Milestones

- Abbreviation registry status/gating: Milestone 3.
- Review-tab `pending` and bulk approval behavior: Milestone 5.
- ID10 to BL10A migration: after pilot data layer and migration path review.
- `database_pool/` tracked directory creation: requires the Milestone 2
  architecture boundary decision.
- Instance numbering, section length cap beyond letter-only parsing, stricter
  `SignalName` CamelCase: explicitly deferred.

## Status

Milestone 1 is complete and ready to commit.
