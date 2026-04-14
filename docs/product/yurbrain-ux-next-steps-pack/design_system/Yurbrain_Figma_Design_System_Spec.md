# Yurbrain Figma Design System Spec
Version: 1.0

## 1. Design intent
Yurbrain should feel calm, intelligent, emotionally safe, and momentum-building.
The visual system should support:
- recognition over recall
- continuity over storage
- feed-first gravity
- soft execution rather than hard productivity pressure

## 2. Frame setup
### Web
- Desktop base frame: 1440 x 1024
- Content max width: 960
- Feed width target: 720
- Right-side summary panel optional: 320
- Grid: 12 columns
- Margin: 80
- Gutter: 24

### Mobile
- Base frame: 390 x 844
- Content width: full bleed minus 16 px margins
- Grid: 4 columns
- Margin: 16
- Gutter: 12

## 3. Spacing scale
- 4
- 8
- 12
- 16
- 20
- 24
- 32
- 40
- 48
- 64

Use:
- card internal padding: 16
- section spacing: 24
- screen vertical rhythm: 16 / 24
- major surface separation: 32

## 4. Radius scale
- chip: 999
- small control: 12
- card: 20
- primary panel: 24
- hero panel: 32

## 5. Typography
### Display / Hero
- 40 / 48 / 800

### Screen Title
- 30 / 36 / 800

### Panel Title
- 22 / 28 / 700

### Card Title
- 20 / 26 / 700

### Body
- 16 / 24 / 400

### Secondary Body
- 15 / 22 / 400

### Metadata
- 13 / 18 / 600

### Label / Eyebrow
- 12 / 16 / 700 uppercase tracking 4%

## 6. Color system
### Neutrals
- Slate 950: #020617
- Slate 900: #0F172A
- Slate 700: #334155
- Slate 600: #475569
- Slate 500: #64748B
- Slate 300: #CBD5E1
- Slate 200: #E2E8F0
- Slate 100: #F1F5F9
- Slate 50: #F8FAFC
- White: #FFFFFF

### Accent
- Primary accent / thinking blue: #1D4ED8
- Accent soft: #DBEAFE
- Accent surface: #EFF6FF

### State
- Blocked / warning amber: #B45309
- Blocked soft: #FEF3C7
- Done / success teal: #0F766E
- Done soft: #CCFBF1
- In progress / calm violet: #7C3AED
- In progress soft: #EDE9FE

## 7. Elevation
### Level 1
- y: 2
- blur: 8
- opacity: 0.06

### Level 2
- y: 6
- blur: 16
- opacity: 0.08

Use shadows sparingly; calm surfaces matter more than dramatic elevation.

## 8. Component specs

## Feed card
Width:
- web: full width of feed column
- mobile: full width minus margins

Min height:
- 220 web
- 180 mobile

Structure:
1. badge row
2. title
3. preview
4. why shown panel
5. quick actions row

Padding:
- 16 mobile
- 20 web

Internal gaps:
- 12 between sections
- 8 between badges
- 8 between action chips

States:
- default
- execution
- blocked
- done
- resume

## Why shown panel
- inset panel
- background: Slate 50
- radius: 16
- padding: 12
- label small uppercase
- text 14 / 20

## Action chips
Height:
- 40 mobile
- 36 web compact / 40 standard

Padding:
- 12 horizontal
- 10 vertical

Radius:
- 14

Use border-only default style unless primary action is emphasized.

## Item detail panel
- width: full content column
- radius: 24
- padding: 24
- background: white
- section spacing: 24

## Founder status / priority controls
- control height: 44
- radius: 12
- border: 1 Slate 300
- label above control: 13 / 18 / 600

## AI summary card
- radius: 20
- padding: 16
- background: Slate 50
- title: 15 / 22 / 700
- body: 15 / 22 / 400
- blockers list: 14 / 20

## Session screen
- background: Slate 950
- card surface: Slate 900
- main timer: 56 / 60 / 800
- action buttons height: 52
- strong visual contrast, minimal chrome

## 9. Founder Mode visual rules
Founder Mode should not visually feel like an admin system.
Changes should be subtle:
- founder mode toggle visible in header
- execution badges visible
- additional quick actions available
- slight emphasis on status/priority
Avoid dashboards, dense tables, and red-heavy urgency styling.

## 10. Screen-level guidance
### Focus feed
- max 1 primary header row
- lens pills directly beneath
- card stack with generous vertical rhythm
- summary panel optional on desktop only

### Item detail
- original content visible immediately
- context panel near top
- thinking timeline below content
- AI support in right rail on desktop, stacked below on mobile

### Founder summary
- 3 stat tiles max above fold
- one suggested next focus card
- one AI founder summary card
- total first-screen scan time < 30 seconds

## 11. Figma page structure
1. Foundations
2. Tokens
3. Components
4. Patterns
5. Web screens
6. Mobile screens
7. Founder Mode variants
8. Prototypes

## 12. Figma component list
- Mode Toggle
- Lens Pill
- Feed Card
- Why Shown Panel
- Action Chip
- Execution Badge
- Priority Badge
- Context Panel
- Timeline Entry
- AI Summary Card
- Founder Summary Tile
- Session Action Button

## 13. Prototype flows to build in Figma
1. Feed → Item Detail → Add Update
2. Feed → Item Detail → Summarize Progress
3. Feed → Plan This → Start Session
4. Founder Mode Toggle → Execution Lens
5. Founder Summary → Suggested Next Focus → Item Detail

## 14. Anti-patterns to avoid
- dense enterprise dashboards
- kanban metaphors
- too many colors
- AI output blocks that dominate the screen
- unclear "why shown" wording
- multiple competing home screens
