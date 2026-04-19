# Founder Review Cursor Prompt Pack

Use this prompt pack to execute Founder Review safely in phase-based slices.

## Comprehensive Prompt (Run First)

```text
You are working in the Yurbrain monorepo.

Your job is to implement Founder Review in strict phases, preserving product truth and avoiding dashboard creep.

Core principle:
- This is not a reporting dashboard.
- This is a self-awareness layer that reveals where Yurbrain's loop is working or breaking.

Global constraints:
1) Use only real behavior/state signals where possible.
2) Keep scoring deterministic and explainable.
3) Keep PR scope narrow to one phase at a time.
4) Avoid broad new subsystems or complex schemas.
5) Preserve Yurbrain's product feel (not generic analytics software).

Phase order (strict):
FR1 Signal Audit + Scaffolding
FR2 Scoring Service (Deterministic)
FR3 Mock / Seed Data
FR4 API Layer
FR5 Core Web UI
FR6 Deep Links / Actionability
FR7 Flags + Next Move Refinement
FR8 AI Readout Layer (Optional)
FR9 Polish + Stability

Before moving to the next phase, enforce:
- Truth check: reflects real behavior?
- Simplicity check: simplest thing that works?
- Product check: helps decide what to build next?

If any answer is no, stop and report.

For each phase:
- list touched files
- summarize what was implemented
- list what was intentionally deferred
- provide test/validation commands and outputs
```

## Strict FR2 Prompt (Deterministic Scoring Only)

```text
Proceed with Founder Review Phase 2 only.

Implement deterministic scoring service first.
Do not build UI yet.
Do not add API routes yet.
Do not add AI logic.
Do not add advanced trend modeling.

Required outputs:
- base metrics computation
- loop scores: Capture, Resurface, Continue, Convert, Act, Return
- platform scores: Web, Mobile, Cross-platform (basic)
- simple overall/system score
- tests or runnable validation for score behavior with changing inputs

Definition of done:
- formulas are explainable
- scores are tied to behavior/state inputs
- outputs change coherently when inputs change
- complexity remains minimal
```

## GitHub Usage

For every Founder Review phase PR, select the dedicated template:

- `.github/PULL_REQUEST_TEMPLATE/founder-review.md`

Keep each PR narrowly scoped to one phase.
