# Production UX Regression Checklist

_Status: required before staging and production signoff._

Use this checklist to ensure enterprise hardening does not turn Yurbrain into a dashboard, kanban board, inbox-zero workflow, or chatbot wrapper.

## Core continuity loop

- [ ] Capture remains save-first and low-friction.
- [ ] Focus Feed remains the home surface.
- [ ] Feed cards explain why they were resurfaced.
- [ ] Brain Item Detail keeps original context visible.
- [ ] Comments remain first-class and do not require AI.
- [ ] AI is optional, source-grounded, explainable, and safe to ignore.
- [ ] Plan/task conversion is optional and downstream.
- [ ] Sessions are lightweight action helpers, not the dominant app model.
- [ ] Explore remains optional and source-linked.

## Anti-pattern sweep

- [ ] No dashboard-first landing page.
- [ ] No kanban-first navigation.
- [ ] No inbox-zero pressure or guilt-heavy copy.
- [ ] No mandatory tags, folders, projects, due dates, or categorization during capture.
- [ ] No chatbot-primary UX.
- [ ] No required graph/canvas workflow.
- [ ] No admin/security controls dominate the end-user surface.

## Evidence to attach

- Web staging smoke notes or screenshots.
- Mobile smoke notes only if mobile is in launch scope.
- Product reviewer signoff.
- Any accepted UX exceptions with owner and rollback plan.

## Current automated guard

`pnpm --filter web test` runs a lightweight production UX smoke that checks the web shell preserves:

- Focus Feed home/default surface,
- capture and Brain Item Detail surfaces,
- comments/Ask Yurbrain/task/session flow hooks,
- storage-deferred launch copy.
