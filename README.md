# Guided by Ella

Guided by Ella is TrailGenic’s evidence-aware AI healthspan guide. It translates longitudinal movement and recovery data into conservative, explainable protocols without presenting itself as medical care.

## Product identity

- **Experience:** Guided by Ella
- **Application:** `app.trailgenic.com`
- **Method authority:** [TrailGenic](https://www.trailgenic.com)
- **Canonical Ella identity:** [EllaEntity.AI](https://ellaentity.ai/ella)
- **Movement architecture:** Walking, Rucking, Running, and Hiking

## Locked decision order

> Safety → Recovery → Consistency → Layer → Progression → Optimization

Ella does not maximize activity. She selects the smallest appropriate action that can produce useful adaptation evidence without outrunning recovery.

## Repository status

Phase 1 establishes the product constitution and executable implementation contract:

- `docs/phase-1/Ella_Alpha_Phase_1_Product_Constitution_v1.0.md` — product purpose, boundaries, ontology, safety constitution, memory contract, and governance
- `docs/phase-1/ella-alpha-source-map.v1.json` — approved source registry, authority order, and five TrailGenic protocol levels
- `docs/phase-1/ella-alpha-evaluation-fixtures.v1.json` — deterministic placement, recovery, uncertainty, and safety cases
- `scripts/validate-phase1.mjs` — structural and policy validator

Validate the Phase 1 contract:

```bash
npm run validate:phase1
```

## Phase 2

The next milestone is the functional shell:

1. onboarding and minimum user-data contract
2. daily state and recovery check-in
3. separate Safety, Recovery, Consistency, and Layer judgments
4. explainable protocol recommendation
5. longitudinal Personal World Model timeline

## Product boundary

Guided by Ella is a wellness and education product. It does not diagnose conditions, provide emergency services, replace a clinician, or treat wearable estimates as clinical measurements.

