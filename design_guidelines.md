# Design Guidelines: Autonomous Content Intelligence Platform

## Design Approach

**Selected System:** Linear + Notion hybrid with Carbon Design principles for data-heavy interfaces

**Justification:** This productivity-focused analytics platform requires exceptional information density, clear data hierarchies, and efficient workflows. Linear's modern aesthetic combined with Notion's flexible content organization and Carbon's enterprise-grade data visualization creates the optimal foundation.

**Core Principles:**
- Information clarity over decoration
- Scannable data hierarchies
- Purposeful space utilization
- Workflow-optimized interactions

---

## Typography

**Font Stack:**
- Primary: Inter (400, 500, 600) via Google Fonts
- Monospace: JetBrains Mono (400, 500) for metrics, IDs, code snippets

**Hierarchy:**
- Page headers: text-2xl/text-3xl font-semibold
- Section titles: text-lg/text-xl font-medium
- Data labels: text-sm font-medium uppercase tracking-wide
- Body content: text-base font-normal
- Metadata/timestamps: text-xs/text-sm
- Code/metrics: Monospace text-sm

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4, p-6
- Section spacing: space-y-6, space-y-8
- Card spacing: p-6, gap-4
- Dense tables/lists: p-2, gap-2
- Page margins: p-8, p-12

**Grid Structure:**
- Main app: Sidebar (w-64 fixed) + Content area (flex-1)
- Dashboard grids: 2-column (lg:grid-cols-2), 3-column (xl:grid-cols-3) for KPI cards
- Data tables: Full-width with responsive horizontal scroll
- Detail panels: 2/3 main content + 1/3 metadata sidebar split

---

## Component Library

### Navigation & Layout

**Sidebar Navigation:**
- Fixed left sidebar (w-64) with logo, primary nav, secondary utilities at bottom
- Nav items: Full-width with icon (w-5 h-5) + label, hover states, active indicator (left border accent)
- Grouped sections with subtle dividers (py-2)
- Collapsible sub-navigation for multi-level hierarchies

**Top Bar:**
- Breadcrumb navigation (text-sm) with chevron separators
- Search bar (w-96) with keyboard shortcut hint
- Right-aligned: Notification bell icon, user avatar dropdown

**Page Container:**
- max-w-7xl with px-8 py-6
- Page header with title, description, primary action button
- Content sections with consistent vertical rhythm (space-y-8)

### Data Display

**Metric Cards:**
- Grid layout with clean borders, rounded-lg
- Large number (text-3xl font-semibold monospace) + label + trend indicator
- Sparkline charts inline where applicable
- Compact footer with change percentage + timeframe

**Data Tables:**
- Sticky header row with sortable columns
- Alternating row backgrounds for scannability
- Right-aligned numeric columns
- Expandable rows for detailed content views
- Bulk action toolbar appears on row selection
- Pagination controls: Previous/Next + page numbers

**Content Preview Cards:**
- Platform icon badge (top-left corner)
- Content snippet with truncation (line-clamp-3)
- Engagement metrics bar (views, likes, comments) with icons
- Insight tags (rounded-full badges)
- Action buttons footer: Approve/Revise/Reject with distinct styling

**Insight Panels:**
- Two-column comparison layout (high-performer vs baseline)
- Highlighted differentiators with bullet points
- Citation links to source content
- Confidence score indicator

### Forms & Inputs

**Input Fields:**
- Consistent height (h-10)
- Subtle border with focus ring
- Label above input (text-sm font-medium mb-2)
- Inline validation messages (text-xs)
- Helper text in muted tone

**Approval Workflow Interface:**
- Large content preview area (60% width)
- Sidebar with insight summary, metrics, and history
- Sticky action bar at bottom: Three-button layout (Reject/Revise/Approve) with keyboard shortcuts shown
- Rationale textarea that expands on interaction

**Filter Controls:**
- Horizontal filter bar with dropdowns and date pickers
- Active filter chips with remove icons
- "Clear all" utility link
- Saved filter presets dropdown

### Feedback & States

**Status Indicators:**
- Inline badges for content status (Draft/Pending/Approved/Published)
- Crawler health dots (connected/crawling/error) with tooltips
- Processing spinners for async operations

**Alert Banners:**
- Full-width at top of content area
- Dismiss button (top-right)
- Icon + message + optional action link
- Severity levels with distinct borders

**Empty States:**
- Centered icon (w-16 h-16 opacity-50)
- Heading + description text
- Primary CTA button to trigger first action

### Overlays & Modals

**Modal Dialogs:**
- Centered with backdrop blur
- max-w-2xl for content-rich modals, max-w-md for confirmations
- Header with title + close button
- Scrollable body with consistent padding (p-6)
- Footer with action buttons (right-aligned)

**Slide-over Panels:**
- Right-side drawer (w-96 to w-1/2)
- Detail views for content items, settings
- Sticky header with close button
- Scrollable content area

---

## Specialized Views

**Dashboard Overview:**
- 4-column KPI grid at top (sessions crawled, insights generated, content approved, leads qualified)
- 2-column layout below: Recent activity timeline (left) + Performance chart (right)
- Quick action cards for common workflows

**Content Review Queue:**
- List view with filters (platform, topic, date)
- Each item: Compact card with preview, metrics, quick actions
- Click expands to full approval interface
- Batch operations toolbar

**Insight Explorer:**
- Search + topic filter header
- Masonry grid of insight cards
- Each card: Topic badge, key finding, supporting metrics, "Generate Content" CTA
- Detail modal on click with full analysis

**Crawler Configuration:**
- Tabbed interface (Sources/Schedule/Rules/Monitoring)
- Form layouts with grouped fields
- Live preview of crawler output
- Connection test utility

**Analytics Dashboard:**
- Time range selector prominent at top
- Large performance charts (line/bar/area)
- Breakdowns by platform, topic, content type
- Export data button

---

## Images

**Dashboard Illustrations:**
- Empty state graphics for each major section (crawler idle, no content pending, etc.)
- Style: Minimal line-art illustrations with single accent usage
- Placement: Centered in empty state containers (w-48)

**No Hero Image:** This is a utility application; omit traditional hero sections in favor of functional dashboards

---

## Animation Guidelines

**Minimal, Purposeful Motion:**
- Table row expansion: Smooth height transition (300ms)
- Modal entry: Fade + scale from 95% to 100% (200ms)
- Filter application: Brief loading state on data refresh
- NO scroll animations, parallax, or decorative effects