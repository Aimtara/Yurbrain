# Yurbrain UX Strategy Document

Version 1.0 — Foundational Experience Strategy

This is a research-backed UX strategy artifact to guide future Yurbrain design and engineering decisions.

## 1. Product Vision (UX Translation)

### Core Vision
Yurbrain is a continuity engine for the mind.

It helps users:
- remember what fades
- return to what matters
- continue thinking across time
- move from meaning → action naturally

### UX Definition of Success
A user should feel:

> “I don’t lose things anymore.
> I can pick up where I left off.
> I always know what I can do next—even if I choose not to.”

### What Yurbrain is NOT
- Not a task manager
- Not a note-taking app
- Not a productivity dashboard
- Not an AI chatbot

### What Yurbrain IS
- A resurfacing system
- A context restoration engine
- A lightweight execution bridge
- A thinking companion over time

## 2. Foundational UX Principles (Research-Based)

### Principle 1 — Recognition Over Recall
**Research basis:** Nielsen Heuristic.

**Insight**
Humans are bad at recalling context, but very good at recognizing it when cued.

**Application in Yurbrain**
Every resurfaced item must instantly answer:
- What is this?
- Why does it matter?
- Why is it back now?

**Implementation**
Each Feed Card includes:
- snippet / preview
- timestamp
- why shown
- last interaction
- quick next action

### Principle 2 — Continuity Over Storage
**Research basis:** HCI + interruption research.

**Insight**
People don’t struggle to store ideas—they struggle to resume them.

**Application**
Yurbrain must prioritize:
- where the user left off
- what changed since
- how to re-enter quickly

**Implementation**
Item Detail becomes a Resume Screen with:
- last update
- previous thinking
- next possible action
- AI-generated continuity summary

### Principle 3 — Progressive Disclosure
**Research basis:** Apple / Microsoft UX guidance.

**Insight**
Too much structure too early kills usability.

**Application**
Yurbrain reveals complexity in stages:
- Feed → Item → Plan → Session

Not:
- multiple parallel systems
- multiple primary surfaces

### Principle 4 — Information Scent
**Research basis:** Information Foraging Theory.

**Insight**
Users follow cues that signal value.

**Application**
Feed must feel like: “I know what’s worth opening.”

**Implementation**
- clear card types
- strong labeling
- visible payoff

### Principle 5 — Re-entry Optimization
**Research basis:** Task interruption research.

**Insight**
The biggest cognitive cost is resuming work.

**Application**
Every item should provide a resume packet:
- what this is
- where you left off
- what’s changed
- what to do next

### Principle 6 — Intention → Action Bridging
**Research basis:** Implementation intentions research.

**Insight**
People fail not at planning, but at starting.

**Application**
Execution must:
- suggest the smallest next step
- anchor to a real-world moment

**Example**
Instead of “Break into subtasks,” Yurbrain suggests:
“If you have 10 minutes later, skim and leave one note.”

### Principle 7 — Trust Calibration (AI)
**Research basis:** Google People + AI Guidebook.

**Insight**
Trust grows when AI:
- explains itself
- shows limits
- ties to user data

**Application**
AI must show:
- why it suggested something
- what signals it used
- when it’s uncertain

### Principle 8 — Autonomy & Competence
**Research basis:** Self-Determination Theory.

**Insight**
Motivation comes from autonomy (choice) and competence (clarity).

**Application**
Yurbrain must never:
- pressure
- guilt
- overwhelm

Always allow users to:
- continue
- snooze
- ignore
- close

### Principle 9 — Open Loops as Resumable, Not Stressful
**Research basis:** Zeigarnik reinterpretation.

**Insight**
Open loops matter because they can be resumed—not because they create tension.

**Application**
Users should be able to:
- close
- shrink
- snooze
- revisit

## 3. Core User Loop (The Heart of Yurbrain)

### The Loop
Capture → Resurface → Recognize → Continue → Convert → Act → Return

### Emotional Journey
| Step | Feeling |
| --- | --- |
| Capture | Relief |
| Resurface | Recognition |
| Open | Curiosity |
| Continue | Clarity |
| Convert | Readiness |
| Act | Momentum |
| Return | Trust |

### Key Insight
- The loop is not about productivity.
- It is about continuity of thought over time.

## 4. Core Product Surfaces

### 1) Focus Feed (Primary Surface)
**Purpose:** The home of the product.

**Must answer:**
- What matters now?
- What is worth revisiting?
- What can I do next?

**Card requirements:**
- context preview
- why shown
- last touched
- action affordances

### 2) Item Detail (Continuity Screen)
**Purpose:** Restore full thinking context.

**Must answer:**
- what is this?
- what have I already thought?
- what changed?
- what can I do next?

**Components:**
- original content
- thread (comments as continuation)
- AI summary
- execution options

### 3) Plan / Convert (Bridge Layer)
**Purpose:** Move from meaning → action.

**Must:**
- stay lightweight
- not force structure
- suggest next step

### 4) Session (Execution Layer)
**Purpose:** Enable focused action.

**Must:**
- reduce friction to start
- preserve context
- support interruption

## 5. Execution Intelligence Strategy

**Definition:**
Execution Intelligence = helping users move forward at the right time.

### Level 1 — Awareness
- track interactions
- track updates
- track status

### Level 2 — Pattern Recognition
Detect:
- stale work
- repeated openings
- abandoned items

### Level 3 — Guidance
Suggest:
- next step
- unblock action
- revisit timing

### Level 4 — Adaptation (Future)
Learn:
- timing preferences
- action tendencies
- attention patterns

## 6. UX Coherence Strategy

### Single Gravity Center
The Feed is the center.

Everything flows from:
Feed → Item → Action → Back to Feed

### Avoid These Anti-Patterns
- Multiple primary screens
- Parallel flows
- Deep navigation trees
- Mode confusion
- Over-structuring early

### Enforce These Rules
- One place to return (Feed)
- One object model (BrainItem)
- One continuity model (Thread)
- One execution bridge (Task/Session)

## 7. Interaction Design Guidelines

### Feed Cards
Must be:
- scannable in <2 seconds
- meaningful without opening
- actionable

### Actions
Must be:
- lightweight
- reversible
- non-committal

### AI
Must be:
- concise
- grounded
- optional
- explainable

### Language
Avoid:
- productivity jargon
- system language

Prefer:
- human language
- soft guidance
- neutral tone

## 8. Anti-Patterns to Avoid

1. Turning Yurbrain into a task manager
   - Breaks emotional safety, flexibility, and vision.
2. Over-AI-ing the product
   - Breaks trust, clarity, and control.
3. Over-structuring input
   - Breaks capture flow and increases friction.
4. Feed as a dump instead of a guide
   - Breaks usefulness and engagement.
5. Too many screens
   - Breaks coherence and habit formation.

## 9. MVP UX Priorities

### Priority 1 — Make the Feed Valuable
- meaningful resurfacing
- clear why shown
- strong information scent

### Priority 2 — Fix Item Detail (Continuity)
- show context
- show last thinking
- show next step

### Priority 3 — Add Lightweight Execution
- tiny next steps
- not full task systems

### Priority 4 — Add Founder Mode (Dogfooding)
- execution lens
- progress tracking
- next-step guidance

### Priority 5 — Improve AI Usefulness
- summarize context
- suggest next step
- explain reasoning

## 10. Final Strategy Statement

Yurbrain should feel like a place where your thoughts don’t disappear,
where your past thinking comes back at the right time,
and where moving forward feels obvious, not forced.

## 11. Formal UX Spec — New Captures Review + Feed Slicers

### Feature Name
**New Captures Review (Soft Intake Layer)**

### Reality Check (Codebase Alignment — April 2026)
- Feed slicers already exist in product contracts + API + web/mobile UI.
- Cluster cards are already generated in capture/feed flows.
- The primary gap remains the **post-capture soft review layer** (`new captures` shelf + panel + seen-state lifecycle).

### Purpose
Create a lightweight layer between:
- frictionless capture
- full feed resurfacing

This prevents:
- items getting lost
- feed pollution
- premature categorization

### Core Principle
> “Let me acknowledge what I saved, without forcing me to process it.”

### A. Entry Points

#### 1) App Open (Primary)
When user opens Yurbrain **and** there are at least X new captures (recommended threshold: **3–5**), show a lightweight banner/sheet:

`You have 8 new captures`

Actions:
- Browse now
- Not now

#### 2) Feed Inline Shelf (Secondary)
If the prompt is dismissed, show a shelf at top of feed:

`New Captures (8)` (horizontal scroll)

#### Behavior Rules
- Never block user
- Never force interaction
- Dismiss persists temporarily
- Prompt can reappear if still unprocessed after a time window

### B. New Captures Review Surface

#### Layout
Lightweight panel (not a full app screen).

#### Header
- `New Captures (8)`
- `Things you saved recently`

#### Item List
Fast-scanning cards with:
- title or snippet
- source (optional)
- relative time (e.g., `2h ago`)
- small type icon (link/text/image)

#### Per-Item Actions
- Keep (default passive action)
- Add note
- Ask Yurbrain
- Dismiss

#### Bulk Actions
- Mark all as seen
- Summarize these
- Show similar items

#### UX Rules
- No tagging
- No folders
- No forced classification
- No task creation

### C. Feed Slicers (Critical)

#### Purpose
Allow browsing by mental category, not search syntax or folder hierarchy.

#### Placement
Top of Feed as horizontal tabs/chips.

#### Initial Lenses
- All
- Keep in Mind
- Open Loops
- In Progress
- Learning
- Recently Commented

Optional future lens (only if validated by usage, not required for v1):
- New

#### Behavior
- Filter feed instantly
- Persist last selected lens
- Combine with ranking logic (lens narrows candidates, ranking orders candidates)

#### UX Rules
- Labels must feel human, not technical
- Avoid overwhelming filter systems
- No advanced query-builder UI

### D. Cluster Integration
When the system detects:
- at least 3 related items
- low recent interaction

Show a cluster card.

Example:
- Title: `AI Workflow Tips`
- Subtext: `You saved 5 items about Gemini tricks`
- Why shown: `You’ve been collecting similar ideas`

Actions:
- See highlights
- Compare
- Try one today
- Keep in mind

### E. Relationship to Core Loop
This feature inserts a soft layer:

Capture → **New Captures Review** → Feed (Flow) → Item Detail (Focus) → Optional Action

### F. Emotional UX Targets
The user should feel:
- “I don’t need to deal with this now”
- “Nothing gets lost”
- “I can come back later”
- “This is organized without effort”

### G. Anti-Patterns
Do **not**:
- turn this into inbox zero
- require processing
- add sorting steps
- add categories during capture
- add task conversion prompts in this layer

### Optional Guidance — Mapping to Existing Component Structure
Use this as an implementation alignment reference:

#### Web/UI Surface Mapping
- `apps/web/src/features/feed/FocusFeedSurface.tsx`
  - add New Captures shelf and lens bar placement
- `apps/web/src/features/feed/useFeedController.ts`
  - wire `lens` selection, fetches, and shelf state orchestration
- `packages/ui/src/components/feed/FeedLensBar.tsx`
  - host lens chips (`All`, `New`, etc.) and selected-state behavior
- `packages/ui/src/components/feed/FocusFeedScreen.tsx`
  - pass shelf + lens state into shared feed presentation
- `packages/ui/src/components/feed/ClusterCard.tsx`
  - render the cluster affordance when criteria are met

#### New Panel + Item Interactions
- Add `NewCapturesPanel` under web feed feature or shared UI feed components
- Reuse existing item detail + chat pathways for:
  - Add note
  - Ask Yurbrain
- Keep `Dismiss` and `Mark all as seen` within lightweight state transitions, not task systems

#### API/Domain Mapping
- `apps/api/src/routes/brain-items.ts`
  - add `/brain-items/new` and `/brain-items/mark-seen`
- `apps/api/src/routes/feed.ts`
  - `GET /feed?lens=...` already exists; only extend if “new” lens is truly added
- `packages/contracts/src/api/api-contracts.ts`
  - extend contracts for new-captures endpoints
- `packages/contracts/src/domain/domain.ts`
  - add `isNew` or `lastViewedAt` (lens enum update only if introducing a real new lens)
- `packages/client/src/api/endpoints.ts`
  - add client wrappers for new routes/query params
