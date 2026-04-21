# Yurbrain Nhost Migration Scorecard

Use this as a living document (Notion, README, or this file) and update it weekly (or per PR) to track real progress toward production.

---

## 🧭 Overall Migration Progress

| Area                    | Score (0–10) | Status | Notes |
| ----------------------- | ------------ | ------ | ----- |
| N1 Audit & Visibility   |              |        |       |
| N2 Client Abstraction   |              |        |       |
| N3 Nhost Foundation     |              |        |       |
| N4 Auth & Identity      |              |        |       |
| N5 Schema & Permissions |              |        |       |
| N6 GraphQL CRUD         |              |        |       |
| N7 Web CRUD Cutover     |              |        |       |
| N8 Feed Function        |              |        |       |
| N9 AI Functions         |              |        |       |
| N10 Founder Review      |              |        |       |
| N11 Event Safety        |              |        |       |
| N12 Mobile Cutover      |              |        |       |
| N13 REST Cleanup        |              |        |       |

### Interpretation

- **0–3** → Not started / conceptual
- **4–6** → In progress but unstable
- **7–8** → Working but incomplete
- **9–10** → Production-ready for pre-alpha

---

## 🧱 Architecture Integrity Score

| Category             | Score (0–10) | What “10” Looks Like                             |
| -------------------- | ------------ | ------------------------------------------------ |
| UI → Client Boundary |              | No UI calls REST, GraphQL, or Functions directly |
| GraphQL Discipline   |              | Only used for CRUD, not logic                    |
| Function Discipline  |              | Feed/AI/Review all server-side                   |
| Event Model Safety   |              | Raw events not exposed broadly                   |
| Package Boundaries   |              | No direct db imports, clean layering             |

---

## 🔐 Identity & Security Score

| Category                | Score | What “10” Looks Like            |
| ----------------------- | ----- | ------------------------------- |
| Auth Integration        |       | Real Nhost auth everywhere      |
| Current User Model      |       | No demo-user anywhere           |
| Row-Level Security      |       | All tables owner-scoped         |
| Sensitive Data Exposure |       | Events + artifacts safe         |
| Session Integrity       |       | Sessions tied correctly to user |

---

## ⚙️ Backend Capability Score

| Capability         | Score | What “10” Looks Like           |
| ------------------ | ----- | ------------------------------ |
| Brain Items        |       | Full CRUD via GraphQL          |
| Threads & Messages |       | Structured + stable            |
| Tasks              |       | Clean lifecycle                |
| Sessions           |       | Real execution tracking        |
| Feed               |       | Ranked, contextual, meaningful |
| AI Layer           |       | Thin, useful, grounded         |
| Founder Review     |       | Actionable + accurate          |

---

## 🧠 Product Loop Integrity Score

This is the most important section.

| Loop Stage       | Score | What “10” Looks Like            |
| ---------------- | ----- | ------------------------------- |
| Capture          |       | Fast, frictionless, reliable    |
| Resurface (Feed) |       | Relevant, trusted               |
| Continue         |       | Context is sufficient to resume |
| Convert (Plan)   |       | Easy to turn into action        |
| Act (Session)    |       | Real execution happens          |
| Return           |       | Users naturally come back       |

---

## 🌐 Cross-Platform Continuity Score

| Category         | Score | What “10” Looks Like          |
| ---------------- | ----- | ----------------------------- |
| Mobile → Web     |       | Items flow seamlessly         |
| Web → Mobile     |       | Context preserved             |
| Feed Consistency |       | Same logic both platforms     |
| State Continuity |       | No fragmentation              |
| Auth Consistency |       | Same user identity everywhere |

---

## 🚀 Production Readiness Score

| Category             | Score | What “10” Looks Like            |
| -------------------- | ----- | ------------------------------- |
| Stability            |       | No major crashes or regressions |
| Data Integrity       |       | No broken relationships         |
| Observability        |       | Logs + debugging possible       |
| Error Handling       |       | Graceful degradation            |
| Deployment Readiness |       | Can onboard real users          |

---

## 🧨 Technical Debt Score

Lower is better here.

| Category               | Score (0–10, lower better) | What “0” Looks Like  |
| ---------------------- | -------------------------- | -------------------- |
| Hardcoded Assumptions  |                            | None remain          |
| Legacy REST Dependency |                            | Fully removed        |
| Package Violations     |                            | Clean boundaries     |
| Mocked Systems         |                            | Replaced or isolated |
| Duplicate Logic        |                            | Consolidated         |

---

## 📊 Weighted Overall Score

Use this formula to calculate the weekly weighted score:

```text
Overall =
(Architecture * 0.15) +
(Security * 0.15) +
(Backend * 0.15) +
(Product Loop * 0.25) +
(Cross-Platform * 0.10) +
(Production Readiness * 0.20)
```

### Why Product Loop is highest

Because Yurbrain lives or dies on:

> “Does this feel like a second brain or not?”

---

## 🧭 Progress Milestones

### 0–3 (Prototype)

- Demo-user
- Mock AI
- REST-heavy
- Not safe for real users

### 4–6 (Migration in Progress)

- Client abstraction exists
- Partial GraphQL
- Partial Nhost integration
- Loop still fragile

### 7–8 (Pre-Alpha Ready)

- Web loop stable on Nhost
- Auth real
- Feed + AI functional
- Mobile catching up

### 9–10 (Alpha Ready)

- Full parity
- Stable system
- Founder Review meaningful
- Safe for real users

---

## 🧪 Weekly Check Ritual (Highly Recommended)

Once per week:

1. Fill in all scores honestly.
2. Identify:
   - **Lowest 2 areas**
   - **Highest risk area**
3. Define:
   - “What single PR improves this most?”
4. Execute that PR next.

---

## ⚠️ Common Scorecard Failure Modes

Avoid these:

### 1. Inflated scores

If everything is “8”, nothing is actually ready.

### 2. Backend over-optimization

High architecture score + low product loop score = failure.

### 3. Mobile neglect

If cross-platform score is low, Yurbrain breaks its core promise.

### 4. AI over-focus

AI score high but “Continue” score low = wrong priority.

---

## 🎯 What Good Progress Looks Like Right Now

Given the current state, a realistic near-term target:

| Area                  | Target |
| --------------------- | ------ |
| N2 Client Abstraction | 8      |
| N4 Auth               | 6–7    |
| N6 GraphQL CRUD       | 6      |
| N7 Web Cutover        | 5–6    |
| Feed Function         | 5      |
| Product Loop          | 6      |
| Mobile Parity         | 4–5    |
