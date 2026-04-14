# Yurbrain User Behavior Simulation and Friction Report

## Objective
Stress-test the proposed Yurbrain UX loop against realistic behavior and identify high-probability friction points before or during implementation.

## Personas
### Persona 1: Founder / Builder
High context switching, many open loops, values momentum and continuity more than formal planning.

### Persona 2: Overloaded Parent / Organizer
Captures many practical reminders and opportunities, needs calm resurfacing and low-friction re-entry.

### Persona 3: Curious Learner / Reflective Thinker
Captures articles, ideas, snippets, quotes, and future curiosities; values meaning more than execution.

## 10-day simulation

### Day 1
User captures 8 items.
Likely friction:
- unclear difference between "keep in mind" and "open loop"
- feed not yet meaningful due to low history
Fix:
- excellent empty states
- onboarding copy explaining card types only when needed

### Day 2
User reopens the app expecting something useful to surface.
Likely friction:
- feed too generic
- not enough "why shown"
Fix:
- always show why shown
- bias feed toward one obviously meaningful resurfacing moment

### Day 3
User opens one resurfaced item but forgets why it mattered.
Likely friction:
- item detail shows content but not continuity
Fix:
- context panel near the top
- "last touched" and "why it matters" visible before thread

### Day 4
User adds a note, leaves, and returns later.
Likely friction:
- thread reads like generic comments, not continuation
Fix:
- label as update / progress update in execution contexts
- render timeline as a continuity history

### Day 5
User wants to do something with an item but not turn it into a full plan.
Likely friction:
- plan flow feels too heavy
Fix:
- one-step convert flow
- smallest next action only

### Day 6
Founder user expects execution visibility.
Likely friction:
- status/priority hidden
- feed does not surface active work clearly
Fix:
- Founder Mode execution lens
- execution quick actions directly on cards

### Day 7
User skips app for a day, then returns.
Likely friction:
- poor re-entry
Fix:
- resume packet on resurfaced cards: why shown, last touched, suggested next move

### Day 8
User asks AI for help.
Likely friction:
- summary too vague or generic
Fix:
- AI output must cite concrete signals from the item, thread, sessions, or status

### Day 9
User wants to work from the feed, not navigate around.
Likely friction:
- too many screens feel equal
Fix:
- make feed the home
- all secondary actions deepen from feed then return to feed

### Day 10
User decides whether Yurbrain is becoming habitual.
Likely friction:
- useful system, but no emotional pull
Fix:
- emphasize moments of recognition and continuity
- make resurfacing feel timely and personal, not mechanical

## Cross-persona friction themes

### 1. Weak information scent
If cards do not show enough signal, users will ignore the feed.

### 2. Thin continuity
If item detail does not restore context fast, users will not trust resurfacing.

### 3. Execution overload
If planning becomes too heavy, users will abandon conversion and keep items inert.

### 4. AI trust gap
If AI appears generic, users will stop asking for help.

### 5. Competing homes
If users must decide whether to start in feed, tasks, detail, or founder summary, coherence will break.

## Highest-priority fixes
1. Make Focus feed the undisputed home
2. Strengthen why-shown language
3. Turn item detail into a resume screen
4. Keep plan/convert to one smallest next step
5. Add Founder Mode execution lens rather than a separate board
6. Make AI suggestions short, grounded, and reasoned

## Behavioral success metrics
### Meaning / continuity
- % resurfaced cards opened
- time to first action from resurfaced card
- % of item opens followed by update, plan, or session

### Execution
- % of "plan this" actions resulting in a session or later return
- % of blocked items updated again within 3 days

### Trust
- % of AI summaries expanded or reused
- % of AI next-step suggestions accepted

## Final read
Yurbrain becomes compelling when it helps users feel:
1. I did not lose this
2. I know why this is back
3. I can restart without rebuilding context
4. I can move this forward lightly
5. I can leave without guilt if now is not the time

The biggest likely breakpoints are:
- feed cards not carrying enough context
- item detail not functioning as a continuity engine
- execution conversion becoming too task-manager-like
- AI feeling generic rather than grounded
