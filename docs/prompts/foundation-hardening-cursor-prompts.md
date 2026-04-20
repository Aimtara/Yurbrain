# Cursor Prompt Pack — Foundation Hardening (A1, E1, P1)

## A1 — Auth Audit Prompt

Audit the Yurbrain codebase for all hardcoded demo-user assumptions.

Search across:

- apps/api
- apps/web
- apps/mobile
- packages/db
- packages/client

Identify:

- hardcoded user IDs
- implicit current-user assumptions
- services that assume a single user

Output:

1. list of files and locations
2. description of each assumption
3. impact on product loop
4. recommended replacement strategy

Do NOT modify code yet.

Focus on producing a clear audit and minimal identity plan.

---

## E1 — Event Policy Prompt

Audit the current event system in Yurbrain.

Determine:

- how events are stored
- how events are accessed
- where events are exposed via API

Then define:

1. which events should be server-only
2. which can be user-readable
3. which should only be exposed as derived summaries

Output:

- event access policy
- security risks in current design
- recommended access model for Founder Review

Do NOT implement yet.
Focus on policy definition and risk analysis.

---

## P1 — Boundary Audit Prompt

Audit package boundary violations in the Yurbrain monorepo.

Focus on:

- imports from apps into packages/*/src
- especially apps/api → packages/db/src

Output:

1. list all violations
2. group by package
3. rank by risk (high, medium, low)
4. recommend minimal entrypoints needed to fix them

Do NOT refactor yet.

Goal: produce a clear boundary audit and prioritized fix plan.
