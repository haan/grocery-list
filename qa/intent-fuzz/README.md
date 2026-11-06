# Shared-list model testing

This harness drives real stores with fast-check command sequences, checks intended
outcomes and convergence, and shrinks failures to reproducible stories. Models
live in the sync tests; no external factory or generated template is needed.

- harness.ts runs properties with smoke/deep settings.
- harnessCore.cjs owns seeds, serialization, artifact writing, and validation.
- replay.ts replays checked-in regression JSON as ordinary Jest tests.
- selftest.mjs checks the harness itself, including generated artifacts.

Run npm test -- --runInBand and npm run test:fuzz-harness. For an optional deep
local run, set FUZZ_RUNS=2000 and run the intentFuzz.model.test.ts suite. Set
FUZZ_SEED to reproduce a logged seed. FUZZ_PROFILE=nightly is an optional local
profile, not a scheduled workflow. Remove temporary environment overrides after use.

Transient seed logs and failure intake go under ignored tmp/. Minimized failures
are saved to qa/regressions/<model>-seed-<n>.json; review and commit useful fixtures
so fixed bugs stay covered. Artifact paths use forward slashes on every host OS.
Malformed regression fixtures fail rather than silently skipping tests.
