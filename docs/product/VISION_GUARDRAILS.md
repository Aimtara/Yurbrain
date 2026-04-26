# Yurbrain Product Vision Guardrails

_Status: required release guardrail for enterprise hardening._

Yurbrain is a continuity engine for the mind. Production hardening must protect
trust, reliability, and recoverability without turning the product into a
dashboard, kanban board, inbox-zero system, or chatbot wrapper.

## Core loop contract

Capture → Resurface → Continue → Convert → Act → Return

| Surface | Guardrail |
| --- | --- |
| Capture | Save first, organize later. No required tags, folders, dates, projects, or task conversion. |
| Focus Feed | Home remains Focus Feed. Cards explain why they appear. No inbox-zero framing or guilt-heavy aging indicators. |
| Brain Item Detail | Original context remains visible. Comments stay easy. AI is optional and contextual. |
| Comments | Comments are first-class continuation primitives, not secondary notes hidden behind task workflows. |
| AI | Source-grounded, bounded, explainable, timeout/fallback-safe, and dismissible. No silent mutation of user memory. |
| Plan/Task | Conversion is optional. “Keep in mind” remains valid. No forced taskification. |
| Act/Session | Sessions are lightweight downstream action helpers, not the dominant product model. |
| Explore | Source-linked connection-making mode. No required graph/canvas workspace before validation. |
| Enterprise controls | Security/admin/ops controls must not dominate user UX. |

## Hard no-go examples

- Dashboard-first home.
- Kanban-first app.
- Inbox-zero processing.
- Mandatory task conversion.
- Required tags/folders/dates/projects during capture.
- AI chatbot as primary UI.
- Guilt, urgency, or shame-heavy language.
- Required graph/canvas workflow.
- User-facing analytics dashboard as a production-readiness substitute.

## Release checklist

Every release candidate must answer:

1. Does Focus Feed remain the home surface?
2. Can a user capture without extra organization steps?
3. Can a user continue a thought with a comment without invoking AI?
4. Are AI outputs grounded in visible sources and safe to ignore?
5. Are tasks/sessions clearly downstream conversions?
6. Does Explore save source-linked cards without becoming a required workspace?
7. Do enterprise/security controls stay operationally visible without changing the calm UX?
8. Did any new copy introduce coercion, guilt, or inbox-zero language?

Any “no” requires product review before release.
