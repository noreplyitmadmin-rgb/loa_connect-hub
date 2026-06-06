# iOS Layout Transformation Plan

## Overview

Transform the web app from a sidebar-based dashboard layout into a native-feeling iOS application using `UINavigationController` + `UITabBar` patterns with proper push/pop navigation, grouped table views, and iOS HIG-compliant components.

---

## Phase 1: Navigation Architecture

### 1.1 iOS NavigationStack (NavBar + Push/Pop) ✅

**Current**: Desktop sidebar + breadcrumbs. Mobile has a static large title nav bar.
**Target**: iOS `UINavigationController`-style push/pop navigation.

**Changes:**
- ✅ **AppShell.tsx**: Wraps content in `<NavigationStack>` context provider.
- ✅ **NavigationStack.tsx**: Context provider tracking push/pop history via `useRef` + pathname comparison, exports `useNavigation()` and `AnimatedPage`.
- ✅ **NavigationBar.tsx**: Large title (34pt) collapses to inline (17pt) on scroll via `IntersectionObserver`, back chevron button, right bar items, frosted glass background, bottom separator.
- ✅ **AnimatedPage**: Wraps only `<main>` content with `ios-slide-in` (push-right) / `ios-pop-in` (pop-left) animations, keeping NavigationBar outside the animated container.
- ✅ **globals.css**: Added `ios-slide-in`, `ios-pop-in` keyframes and `.ios-page` utility classes.
- ✅ **Breadcrumbs.tsx**: Replaced with NavigationBar throughout app.

### 1.2 iOS Tab Bar Enhancement ✅

**Current**: Bottom tab bar with basic icons + labels, frosted glass.
**Target**: Full iOS `UITabBar` with proper styling.

**Changes:**
- ✅ **Tab bar items**: SF Symbols-equivalent SVG icons with `fill="currentColor"` + `fillOpacity="0.2"` for active state, `fill="none"` for inactive (iOS 18+ filled-vs-outlined style).
- ✅ **Badge notifications**: Red badge dot support on tab items.
- ✅ **Animations**: Spring transition on tab switch, press scale animation on icons.
- ✅ **Safe area**: Respect home indicator (already done).
- ✅ **Sidebar.tsx**: Updated tab bar rendering with `.ios-tab-item` and `.ios-tab-icon` CSS classes.
- ✅ **globals.css**: Added `.ios-tab-item` and `.ios-tab-icon` styles.

---

## Phase 2: iOS-Style Content Layouts

### 2.1 Grouped Table View (InsetGrouped) ✅

**Current**: Cards with `rounded-xl`, border, shadow in a flex column layout.
**Target**: iOS `UITableView` in `.insetGrouped` style (like Settings app).

**Changes:**
- ✅ **globals.css**: Added `.ios-table-section`, `.ios-table-row`, `.ios-table-row-label`, `.ios-table-row-detail`, `.ios-table-row-chevron` CSS classes.
- ✅ **AppointmentCard.tsx**: Converted to iOS table row with avatar+name+date/status+chevron layout, action buttons in footer section.
- ✅ **faculty/meetings/page.tsx**, **student/m/meetings/page.tsx**, **faculty/m/meetings/page.tsx**: Updated to use `ios-table-section`/`ios-table-row` lists.
- ✅ **Desktop standardisation**: All pages standardised to `max-w-6xl mx-auto` (dean/upload, dean/departments, admin/data-management, admin/access-config, faq, admin/etl-hub, admin/departments, faculty/availability, ConsultationHistory, AppointmentDetail).

### 2.2 iOS Action Buttons ✅

**Current**: `btn-primary`, `btn-secondary`, `btn-success`, `btn-danger`.
**Target**: iOS `UIButton` styles matching system buttons.

**Changes:**
- ✅ **Filled**: `.btn-ios-primary` — gold filled (for primary CTA)
- ✅ **Tinted**: `.btn-ios-tinted` — gold tinted background with white text (for secondary actions)
- ✅ **Gray**: `.btn-ios-gray` — gray filled (for tertiary actions)
- ✅ **Plain**: `.btn-ios-plain` — text-only gold button (like "Cancel", "View Details")
- ✅ **Destructive**: `.btn-ios-destructive` — red tinted like iOS "Delete"
- ✅ **globals.css**: Added all 5 iOS button variant CSS classes.
- ✅ **SubmitButton.tsx**: Extended `variant` prop with `ios-primary | ios-tinted | ios-gray | ios-plain | ios-destructive`.
- ✅ **Migrated key pages**: AppointmentCard, AppointmentDetail, faculty/m/meetings/[id], student/m/meetings/[id].

### 2.3 iOS Search Bar

**Current**: `SearchInput.tsx` with a text input + icon.
**Target**: iOS `UISearchBar` integrated into navigation bar.

**Changes:**

- **SearchBar.tsx** (new component):
  - Rounded search field with magnifying glass icon
  - "Cancel" button that appears on focus (iOS 18+ style)
  - Scope bar / filter chips below search (optional)
  - Debounced input
  - Transitions: smooth expand on focus
  
- **Integration**: Place in navigation bar's `titleView` or as a large title search (iOS 15+)

- **Files to modify**:
  - New: `components/SearchBar.tsx`
  - `components/SearchInput.tsx` → refactor or replace
  - Pages with search functionality

### 2.4 iOS Segmented Control

**Current**: Filter pills using `<Link>` with `rounded-full` styling.
**Target**: iOS `UISegmentedControl` style.

**Changes:**

- **SegmentedControl.tsx** (new component):
  - Equal-width segments in a rounded container
  - Active segment: filled background with text
  - Inactive segments: transparent with secondary text
  - Smooth sliding indicator animation on switch
  - Compact and regular size variants

- **Files to modify**:
  - New: `components/SegmentedControl.tsx`
  - `app/student/m/meetings/page.tsx` — replace filter pills
  - `app/faculty/m/meetings/page.tsx` — replace filter pills
  - `app/student/meetings/page.tsx` — replace filter pills
  - `app/faculty/meetings/page.tsx` — replace filter pills

### 2.5 iOS Action Sheet / Alert

**Current**: No dedicated action sheet or alert component.
**Target**: iOS `UIAlertController` style action sheets and alerts.

**Changes:**

- **ActionSheet.tsx** (new component):
  - Slides up from bottom on mobile
  - Centered card on desktop
  - Title + message (optional)
  - List of action buttons (default, cancel, destructive)
  - Frosted glass background
  - Backdrop tap to dismiss

- **Alert.tsx** (new component):
  - Centered card with title, message, and buttons
  - 1-2 buttons (default + cancel)
  - iOS-style rounded corners and shadow

- **Files to modify**:
  - New: `components/ActionSheet.tsx`
  - New: `components/Alert.tsx`
  - Pages with confirmation dialogs

---

## Phase 3: iOS Gestures & Interactions

### 3.1 Swipe Back Gesture ✅

**Current**: Back button only.
**Target**: iOS interactive pop gesture (swipe from left edge).

**Changes:**
- ✅ Touch start near left edge (< 25px) initiates swipe tracking
- ✅ Page translates with finger (50% resistance), vertical swipe cancels
- ✅ Shadow overlay on current page, surface-muted background peeks through
- ✅ Release at < 35%: snap back with spring animation
- ✅ Release at >= 35%: complete navigation pop
- ✅ Uses refs to avoid stale closure issues in touch handlers

- **Files to modify**:
  - `components/NavigationStack.tsx` — added `SwipeBackHandler` component, wrapped in `NavigationStack`

### 3.2 Swipe Actions on List Rows

**Current**: Action buttons inline in cards.
**Target**: iOS swipe-to-reveal actions (like Mail app).

**Changes:**

- **SwipeableRow.tsx** (new component):
  - Wraps a list row
  - Swipe left to reveal action buttons (Accept, Decline, etc.)
  - Swipe right (less common, for special actions)
  - Haptic-style spring animation
  - Action buttons with colored backgrounds (green/red/gray)

- **Files to modify**:
  - New: `components/SwipeableRow.tsx`
  - `components/AppointmentCard.tsx` — wrap in SwipeableRow
  - List pages

### 3.3 Pull to Refresh

**Current**: No pull-to-refresh.
**Target**: iOS `UIRefreshControl` style.

**Changes:**

- **PullToRefresh.tsx** (new utility/hook):
  - Tracks scroll position
  - At scrollTop < -60px, trigger refresh after brief hold
  - Spinner animation during refresh
  - "Pull to refresh" / "Release to refresh" text states
  - Haptic feedback style

- **Files to modify**:
  - New: `hooks/usePullToRefresh.ts`
  - Pages with refreshable content (meetings lists, dashboards)

### 3.4 Context Menu (Long Press)

**Current**: No context menus.
**Target**: iOS `UIContextMenu` style (long press to reveal actions).

**Changes:**

- **ContextMenu.tsx** (new component):
  - Long press (> 500ms) triggers menu reveal
  - Menu appears as a popover near the touch point
  - List of actions with icons
  - Subtle spring animation
  - Tap outside to dismiss

---

## Phase 4: iOS Visual Polish

### 4.1 Status Bar & Safe Areas ✅

- ✅ **Status bar**: Added `apple-mobile-web-app-status-bar-style: black-translucent` meta tag for transparent status bar overlay
- ✅ **Dynamic island / notch**: Auth layout now uses `pt-safe` padding for status bar avoidance
- ✅ **Home indicator**: Bottom content respects safe area (already done via `pb-safe` on tab bar)
- ✅ **Safe area utilities**: `pt-safe`, `pb-safe`, `pl-safe`, `pr-safe` already defined in globals.css

### 4.2 Loading States (iOS Skeleton) ✅

- ✅ New `components/IosSkeleton.tsx` with iOS-style shimmer skeletons:
  - `IosSkeleton` — generic shimmer blocks with configurable count
  - `IosSkeletonText` — text line shimmers with variable widths
  - `IosSkeletonAvatar` — circular avatar shimmer
  - `IosSkeletonCard` — iOS table row skeleton (3 rows with avatar + text + badge)
  - `IosSkeletonDetail` — detail view skeleton (info rows + participant rows + action buttons)
- ✅ Uses existing `animate-shimmer` CSS class (gradient sweep, not opacity pulse)
- ✅ Proper sizing matching iOS table row dimensions (44pt row height, 10pt avatar, etc.)

### 4.3 Empty States ✅

- ✅ New `components/EmptyState.tsx` component matching iOS style:
  - Large SF Symbol–style icon (64px, gray, 1.2 stroke width, optional custom icon)
  - Title (17pt bold / text-lg font-bold)
  - Description (15pt regular, gray / text-base text-tertiary, max-w-xs)
  - Single primary action button (btn-ios-primary) via href or onClick
  - Centered layout with generous padding (py-16 px-8)
- ✅ Reusable across all pages — import `<EmptyState title="..." description="..." action={{ label: "...", href: "..." }} />`

### 4.4 Keyboard Handling

- iOS-style keyboard avoidance:
  - `inputmode` and `enterkeyhint` attributes on inputs
  - Content scrolls to keep focused input visible
  - "Done" toolbar above keyboard for number/date inputs

---

## Phase 5: Page-by-Page Migration

### 5.1 Mobile Student Pages

| Page | Current | Target |
|------|---------|--------|
| `/student/m/book` | Custom `MobileBookingFlow` wizard | iOS wizard with page sheets |
| `/student/m/meetings` | Filtered card list | iOS grouped table with swipe actions |
| `/student/m/meetings/[id]` | Detail card | iOS detail view with table sections |

### 5.2 Mobile Faculty Pages

| Page | Current | Target |
|------|---------|--------|
| `/faculty/m/meetings` | Filtered card list | iOS grouped table with swipe actions |
| `/faculty/m/meetings/[id]` | Detail + actions | iOS detail with action sheet |
| `/faculty/m/meetings/new` | Reuses desktop booking | iOS form in grouped table |

### 5.3 Mobile Dean Pages

| Page | Current | Target |
|------|---------|--------|
| `/dean/m` | "Desktop only" message | iOS dashboard with stats |
| `/dean/m/upload` | Simple form | iOS form with document picker |
| `/dean/m/departments` | CRUD form | iOS grouped table + modal |

### 5.4 Auth Pages

| Page | Current | Target |
|------|---------|--------|
| `/login` | Centered card | Full-screen iOS login | ✅ |
| `/activate` | Centered card | iOS form in grouped table | ✅ |
| `/forgot-password` | Centered card | iOS modal presentation | ✅ |

---

## Implementation Order

1. ✅ **NavigationStack + NavigationBar** (foundation)
2. ✅ **iOS table styles** in globals.css (visual foundation)
3. ✅ **Tab bar enhancement** (UI polish)
4. ✅ **iOS button variants** (component update)
5. ✅ **SegmentedControl** (replace filter pills)
6. ✅ **SearchBar** (replace search input)
7. ✅ **ActionSheet + Alert** (modals)
8. ✅ **SwipeableRow** (gesture)
9. ✅ **Pull to refresh** (gesture)
10. **Page-by-page migration** (content) — _in progress_

---

## Files Created

| File | Purpose | Status |
|------|---------|--------|
| `components/NavigationStack.tsx` | Navigation context + push/pop transitions | ✅ |
| `components/NavigationBar.tsx` | iOS-style nav bar with large titles | ✅ |
| `components/SearchBar.tsx` | iOS UISearchBar | ✅ |
| `components/SegmentedControl.tsx` | iOS UISegmentedControl | ✅ |
| `components/ActionSheet.tsx` | iOS action sheet | ✅ |
| `components/Alert.tsx` | iOS alert dialog | ✅ |
| `components/SwipeableRow.tsx` | Swipe-to-reveal actions | ✅ |
| `hooks/usePullToRefresh.ts` | Pull-to-refresh hook | ✅ |
| `components/PullToRefresh.tsx` | Pull-to-refresh wrapper | ✅ |
| `components/IosSkeleton.tsx` | iOS shimmer skeleton variants | ✅ |
| `components/EmptyState.tsx` | iOS empty state with icon + action | ✅ |

## Files Modified

| File | Changes | Status |
|------|---------|--------|
| `app/globals.css` | iOS table styles, button variants, animation keyframes, tab bar styles | ✅ |
| `components/AppShell.tsx` | Wrap in NavigationStack, NavigationBar integration | ✅ |
| `components/Breadcrumbs.tsx` | Replaced with NavigationBar | ✅ |
| `components/SubmitButton.tsx` | Added 5 iOS button variants | ✅ |
| `components/SearchInput.tsx` | Refactor or replace with SearchBar | ✅ |
| `components/AppointmentCard.tsx` | iOS table row style + SwipeableRow | ✅ |
| `components/Sidebar.tsx` | Enhanced tab bar with filled/outlined icons, badges | ✅ |
| `components/AppointmentDetail.tsx` | Migrated buttons to iOS variants | ✅ |
| `app/faculty/meetings/page.tsx` | iOS table layout + SegmentedControl + SearchBar | ✅ |
| `app/faculty/m/meetings/page.tsx` | iOS table layout + SegmentedControl + PullToRefresh | ✅ |
| `app/faculty/m/meetings/[id]/page.tsx` | iOS action buttons | ✅ |
| `app/student/m/meetings/page.tsx` | iOS table layout + SegmentedControl + PullToRefresh | ✅ |
| `app/student/m/meetings/[id]/page.tsx` | iOS action buttons + ActionSheet | ✅ |
| `app/student/meetings/page.tsx` | SegmentedControl integration | ✅ |
| `app/faculty/m/meetings/[id]/page.tsx` | iOS action buttons + ActionSheet | ✅ |
| `app/(auth)/forgot-password/page.tsx` | Full-screen iOS layout, grouped table input, ios-primary button, success/error banners | ✅ |
| `components/NavigationStack.tsx` | Added `SwipeBackHandler` component with touch edge-gesture + refs for stale closure safety | ✅ |
| `app/layout.tsx` | Added `apple-mobile-web-app-status-bar-style: black-translucent` meta tag | ✅ |
| `app/(auth)/layout.tsx` | Added `pt-safe` for status bar safe area | ✅ |
| All mobile route pages | Update to iOS content layouts | ⏳ |
