# Yurbrain First Working UI Wireframe Spec

## General notes
- Default rendering: Focus/clean mode
- Explore/spatial mode is a rendering layer, not separate product behavior
- Every major screen should preserve the same data/actions across modes

---

## Screen 1: Global Capture Sheet

### Purpose
Fastest way to get something into Yurbrain.

### Layout
- Header: “Capture”, close button
- Main: large multiline input
- Utility row: paste URL, attach file, voice button (stubs acceptable)
- Footer CTAs:
  - Save
  - Save and Ask Yurbrain
  - Organize later

### UX rules
- no required categorization
- no forced AI step
- success toast after save

---

## Screen 2: Brain Item Detail

### Purpose
Read item, understand it, and start interacting.

### Layout
- Header with back button, title/snippet, metadata
- Raw content block first
- Quick action row:
  - Summarize
  - Similar
  - Plan
  - Comment
  - Keep in Mind
- Summary panel appears inline on demand
- Comment preview section

### Key states
- raw-only state
- summarized state
- loading AI state
- fallback error state

---

## Screen 3: Item Chat Panel

### Purpose
Queryable understanding for one item.

### Layout
- Context chip with item snippet/title
- Chat thread
- Suggested prompt chips:
  - What matters here?
  - What does this connect to?
  - Is this a task or keep in mind?
  - Turn this into a plan
- Bottom composer

### UX rules
- context bounded to one item
- concise replies
- structured suggestions under replies

---

## Screen 4: Focus Feed

### Purpose
Browsable memory surface.

### Layout
- Header: Focus
- Feed lens bar:
  - All
  - Keep in Mind
  - Open Loops
  - Learning
  - In Progress
  - Recent
- Feed stack of cards

### Card anatomy
- title
- short body text
- whyShown label
- quick action row
- inline comment entry

### Required quick actions
- Comment
- Ask AI
- Plan
- Later
- Dismiss

### UX rules
- 8 to 12 cards first load
- calm, non-infinite feel
- whyShown always available

---

## Screen 5: Inline Comment Composer

### Purpose
Let users continue a thought with minimal friction.

### Layout
- compact input under item/card
- mode toggle:
  - Comment
  - Ask Yurbrain

### Behavior
- Comment => ThreadMessage(comment)
- Ask Yurbrain => ThreadMessage(ai_query) + AI reply appended

---

## Screen 6: Convert to Task Flow

### Purpose
Turn item or comment into action.

### Layout
Bottom sheet with:
- rationale
- one of:
  - single task proposal
  - mini plan proposal
  - not recommended

### Actions
- Create Task
- Create Plan
- Keep in Mind
- Remind Later

### UX rules
- never force conversion
- always explain recommendation

---

## Screen 7: Task Detail / Start Screen

### Purpose
Start action with minimal friction.

### Layout
- task title
- source link to original item/comment
- estimate
- minimum viable time
- Start CTA
- secondary dismiss/back

---

## Screen 8: Active Session Screen

### Purpose
Track one active task.

### Layout
- task title
- elapsed timer
- source context shortcut
- Pause / Finish actions

### UX rule
Minimal and uncluttered.

---

## Screen 9: Session Finish Sheet

### Purpose
Close the loop.

### Layout
- task title
- actual time
- delta if available
- CTAs:
  - Back to Focus
  - View Task
  - Return to source item

### Tone
Supportive, neutral, calm
