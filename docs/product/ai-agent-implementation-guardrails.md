# Yurbrain AI Agent Guardrails and Guiding Principles

_Last updated: 2026-04-20_

## Why this exists

This document defines the execution guardrails for AI agents (including Cursor) so implementation stays safe, scoped, and production-aligned while Yurbrain transitions from prototype patterns to real multi-user foundations.

## Non-negotiable principles

1. **Protect the core loop first**: Capture → Resurface → Interact → Convert → Act must remain functional in every PR.
2. **No silent identity assumptions**: no hardcoded user identity in production paths.
3. **Default to least exposure**: event and analytics data are server-owned unless explicitly approved for client use.
4. **Respect package boundaries**: app code imports package entrypoints, never package internals.
5. **Ship thin slices**: prefer narrow, testable, reversible changes over broad rewrites.
6. **Deterministic fallback required**: all AI paths keep deterministic fallback behavior.
7. **Contract-first changes**: shared package contracts are the source of truth.

## Agent execution guardrails

### Scope control

- Every change must map to a client-defined work unit with explicit objective, tasks, and acceptance criteria.
- Work units may use different naming conventions (for example: tickets, waves, issues, phases, milestones, tracks, or requests).
- Execute these work units in dependency order; blocked items are documented, not bypassed.
- “No implementation yet” work units are analysis/documentation-only and must not include refactors.

### Security and privacy

- Do not expose raw event streams directly to clients.
- Do not add cross-user query capabilities without explicit access policy and tests.
- User identifiers must come from request context/auth context, not query defaults.

### Architecture boundaries

- Apps import from `@yurbrain/*` entrypoints or package root exports.
- Direct `packages/*/src` imports are considered boundary violations.
- New package exports must be minimal and intentionally curated.

### Quality controls per PR

- Include tests for changed behavior (or a documented reason when not possible).
- Include docs update for any boundary, auth, or event exposure changes.
- Preserve existing deterministic behavior while introducing production paths.

## Delivery workflow for Cursor agents

1. Pick one client-defined work unit (ticket/wave/issue/phase/etc.).
2. Restate objective and acceptance criteria.
3. Run repo audit for impacted files.
4. Implement minimal slice.
5. Run lint/tests for impacted areas.
6. Update docs (what changed + why).
7. Open PR with explicit risk notes and rollback plan.

## Done definition for foundational hardening

A scoped work unit in this stream is done only when all are true:

- Demo-user assumptions removed or explicitly isolated to dev-only contexts.
- Current-user context exists where required.
- Event access model is documented and enforced.
- User-scoped tests prevent cross-user leakage.
- Package boundary violations in scoped ticket are removed or formally deferred.

## Linked execution artifacts

- Issue pack: `docs/product/github-issues/foundation-hardening-issue-pack.md`
- Cursor prompts: `docs/prompts/foundation-hardening-cursor-prompts.md`
- First-pass audit outputs (A1/E1/P1): `docs/product/reviews/foundation-audits-2026-04-20.md`
