# Founder Review Workflow and Merge Plan

This guide defines how Founder Review work should be implemented and merged in narrow, low-risk slices.

## Core Principle

Founder Review is **not** a dashboard project.

Founder Review is a **self-awareness layer for Yurbrain** that should answer:

1. Does this improve our ability to understand the loop?
2. Does this help decide what to build next?

## Required PR Template

Use the dedicated Founder Review PR template for all Founder Review changes:

- `.github/PULL_REQUEST_TEMPLATE/founder-review.md`

This keeps each PR focused and validates product alignment before merge.

## Best Way to Use This Workflow

### 1) Start in Cursor

Paste your comprehensive Founder Review implementation prompt and force completion of the audit phase first.

Then continue with a constrained instruction such as:

> Proceed with Phase 2 only.
> Implement the deterministic scoring service first.
> Do not build UI yet.

### 2) Use GitHub PRs in Small Slices

Open one Founder Review PR per phase so each merge is independently testable and reversible.

## Recommended Merge Sequence

Follow this order strictly:

1. Signal audit + service scaffolding
2. Scoring service
3. Mock event seed
4. API route
5. Web screen
6. Deep links / actionability
7. Optional AI wording layer
8. Cleanup / polish

This sequence validates truth before presentation.

## Phase-by-Phase Plan

## FR1 — Signal Audit + Scaffolding

**Goal:** understand what real signals exist and avoid invented metrics.

### Include

- Audit existing:
  - events
  - item interactions
  - feed usage
  - tasks
  - sessions
  - founder mode signals
- Identify:
  - what maps to loop stages
  - what is missing
- Define:
  - minimal metric mapping
- Create:
  - empty service structure
  - placeholder types

### Do Not Include

- scoring logic
- UI
- API routes

### Output

- documented mapping: event → metric → loop stage
- service scaffolding files

### Merge Criteria

- clear understanding of available signals
- no invented complexity
- clean file structure in place

## FR2 — Scoring Service (Deterministic)

**Goal:** compute loop truth from behavior/state.

### Include

- base metric computation
- loop scores:
  - Capture
  - Resurface
  - Continue
  - Convert
  - Act
  - Return
- platform scores:
  - Web
  - Mobile
  - Cross-platform (basic)
- simple system score

### Do Not Include

- UI
- API
- AI
- advanced smoothing/trends

### Output

- testable scoring functions

### Merge Criteria

- scores are explainable
- scores change when input changes
- no unnecessary complexity

## FR3 — Mock / Seed Data

**Goal:** validate behavior before real telemetry dependency.

### Include

- mock event dataset
- coverage for:
  - strong capture
  - weak continuation
  - execution drop-off
  - partial cross-platform continuity
  - mixed AI effectiveness
- simple test runner/script

### Do Not Include

- UI
- production data dependencies

### Output

- reproducible Founder Review output from seed data

### Merge Criteria

- mock data triggers at least 2 flags
- uneven loop scores are visible
- easy local execution

## FR4 — API Layer

**Goal:** expose a clean Founder Review product surface.

### Include

- endpoint: `GET /founder-review?window=7d`
- scoring service integration
- UI-ready response mapping

### Do Not Include

- UI
- deep links
- advanced filtering

### Output

- stable JSON response

### Merge Criteria

- coherent data returned
- no leaking internal complexity
- works with mock data

## FR5 — Core Web UI

**Goal:** make Founder Review visible and usable.

### Include

- screen sections:
  - score strip (overall/web/mobile/cross-platform)
  - loop health (6 stages)
  - current readout (rules-based)
  - founder execution summary (basic)
  - cross-platform continuity section
  - risk flags
- clean and fast-scanning layout

### Do Not Include

- charts
- heavy visualizations
- deep links (yet)
- AI summaries

### Output

- first usable Founder Review screen

### Merge Criteria

- readable in under 30 seconds
- weakest loop stage is obvious
- does not feel like generic analytics software

## FR6 — Deep Links / Actionability

**Goal:** turn insight into immediate investigation paths.

### Include

- link weak scores to filtered views:
  - weak Continue → items opened but not updated
  - weak Return → items not revisited
  - execution issues → blocked items
- simple routing/query filters

### Do Not Include

- complex diagnostics
- new data models

### Output

- every major metric has a follow-up path

### Merge Criteria

- no dead-end metrics
- click-through helps immediate investigation

## FR7 — Flags + Next Move Refinement

**Goal:** improve decision quality with deterministic logic.

### Include

- refine flag thresholds
- improve flag wording and severity
- refine next-best-move logic
- map weakest loop stage to recommended move

### Do Not Include

- AI-generated logic

### Output

- higher-signal flags
- specific recommendations

### Merge Criteria

- flags feel true to real behavior
- recommendations are useful and specific

## FR8 — AI Readout Layer (Optional)

**Goal:** improve explanation quality without changing scoring truth.

### Include

- AI-generated short readout summary
- AI-generated next move phrasing
- inputs restricted to deterministic outputs (scores/flags/trends)

### Do Not Include

- AI-generated scores
- long verbose explanations
- chat UI

### Output

- concise, high-quality explanatory copy

### Merge Criteria

- AI adds clarity, not noise
- summary remains short and grounded

## FR9 — Polish + Stability

**Goal:** make Founder Review dependable.

### Include

- loading and error states
- edge-case handling
- runbook/current-state doc updates
- small UX stability improvements

### Do Not Include

- new features
- large redesigns

### Output

- stable and trustworthy feature

### Merge Criteria

- no obvious breakages
- data appears consistent
- screen feels calm and reliable

## Phase Gating Rules (Must Pass Before Next Phase)

1. **Truth check:** does this reflect real behavior?
2. **Simplicity check:** is this the simplest thing that works?
3. **Product check:** does this help decide what to build next?

If any answer is “No,” do not proceed to the next phase.

## Common Failure Modes to Avoid

1. **Dashboard creep**
   - charts, KPI grids, visual overload
2. **Fake precision**
   - precise-looking numbers not grounded in behavior
3. **Over-modeling**
   - unnecessary entities/schemas for MVP
4. **AI overreach**
   - AI replacing deterministic logic or becoming verbose

## Weekly Iteration Loop (After FR5)

Review weekly:

1. Which score feels most inaccurate?
2. Which flag feels most useful?
3. Which recommendation actually led to action?
4. What is the biggest blind spot?

Refine in this order:

- metric mapping
- thresholds
- signal interpretation

Do **not** lead with UI refinements.

## Intended Outcome

Done correctly, Founder Review becomes:

- a system that tells how well Yurbrain is helping you think

—not a place to browse disconnected metrics.
