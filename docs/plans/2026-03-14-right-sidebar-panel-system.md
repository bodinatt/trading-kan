# Right Sidebar Panel System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the fixed Watchlist sidebar with a TradingView-style right panel system: icon toolbar, resizable panels, 8 panel types.

**Architecture:** Single-panel-at-a-time sidebar with vertical icon bar (40px) pinned to right edge. Active panel renders between chart area and icon bar. Panel width is adjustable via drag handle (240-600px) and persisted. All state managed by Zustand stores.

**Tech Stack:** React 19, Zustand 5, Tailwind CSS 4, lightweight-charts 5, TypeScript

---

## Task 1: Side Panel Store + i18n Keys

**Files:**
- Create: `src/stores/sidePanelStore.ts`
- Modify: `src/i18n/types.ts`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/th.ts`

**Step 1: Create sidePanelStore**

```typescript
// src/stores/sidePanelStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PanelId = 'watchlist' | 'alerts' | 'dataWindow' | 'news'
                    | 'screener' | 'calendar' | 'notifications' | 'help';

interface SidePanelState {
  activePanel: PanelId | null;
  panelWidth: number;
  togglePanel: (id: PanelId) => void;
  setPanelWidth: (w: number) => void;
  closePanel: () => void;
}

export const useSidePanelStore = create<SidePanelState>()(
  persist(
    (set, get) => ({
      activePanel: 'watchlist' as PanelId | null,
      panelWidth: 280,

      togglePanel: (id) => set({ activePanel: get().activePanel === id ? null : id }),
      setPanelWidth: (w) => set({ panelWidth: Math.max(240, Math.min(w, window.innerWidth * 0.5)) }),
      closePanel: () => set({ activePanel: null }),
    }),
    {
      name: 'trading-kan-side-panel',
      partialize: (s) => ({ activePanel: s.activePanel, panelWidth: s.panelWidth }),
    }
  )
);
```

**Step 2: Add i18n keys to types.ts**

Add to the `Translations` interface:

```typescript
// Side Panel
sidePanel: string;
panelWatchlist: string;
panelAlerts: string;
panelDataWindow: string;
panelNews: string;
panelScreener: string;
panelCalendar: string;
panelNotifications: string;
panelHelp: string;
// Watchlist enhancements
newGroup: string;
renameGroup: string;
deleteGroup: string;
moveToGroup: string;
ungrouped: string;
marketCap: string;
high24h: string;
low24h: string;
// Data Window
dataWindow: string;
noData: string;
indicators: string;
// News
newsTitle: string;
allNews: string;
loadMore: string;
minutesAgo: string;
hoursAgo: string;
daysAgo: string;
// Screener
screenerTitle: string;
topGainers: string;
topLosers: string;
volumeLeaders: string;
autoRefresh: string;
// Calendar
calendarTitle: string;
today: string;
thisWeek: string;
nextWeek: string;
forecast: string;
previous: string;
actual: string;
highImpact: string;
mediumImpact: string;
lowImpact: string;
// Notifications
notificationsTitle: string;
allNotifications: string;
systemNotifications: string;
alertNotifications: string;
clearAll: string;
noNotifications: string;
// Help
helpTitle: string;
keyboardShortcuts: string;
quickGuide: string;
appInfo: string;
howToIndicators: string;
howToDrawings: string;
howToAlerts: string;
howToBacktest: string;
```

**Step 3: Add translations to en.ts and th.ts**

Add English and Thai translations for all keys above. Follow existing pattern in those files.

**Step 4: Verify build**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```
feat: add sidePanelStore and i18n keys for right sidebar panels
```

---

## Task 2: IconBar + RightSidebar Shell + ResizeHandle

**Files:**
- Create: `src/components/Sidebar/IconBar.tsx`
- Create: `src/components/Sidebar/ResizeHandle.tsx`
- Create: `src/components/Sidebar/PanelContainer.tsx`
- Create: `src/components/Sidebar/RightSidebar.tsx`

**Step 1: Create IconBar**

8 icon buttons in a vertical strip. Each icon is an SVG. Active panel is highlighted with blue background. Tooltip on hover.

```typescript
// src/components/Sidebar/IconBar.tsx
import { useSidePanelStore, type PanelId } from '../../stores/sidePanelStore';
import { useThemeStore } from '../../stores/themeStore';
import { useTranslation } from '../../i18n';

const PANELS: { id: PanelId; label: keyof /* Translations */ any; icon: JSX.Element }[] = [
  // Define 8 panels with SVG icons for: watchlist, alerts, dataWindow, news, screener, calendar, notifications, help
  // Use stroke-based 20x20 SVGs matching existing app style (w-5 h-5)
];

export function IconBar() {
  const { activePanel, togglePanel } = useSidePanelStore();
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const tx = useTranslation();
  // Render vertical flex column with 8 icon buttons
  // Active: bg-blue-500/20 text-blue-400
  // Inactive: hover:bg-gray-800 (dark) / hover:bg-gray-100 (light)
  // Each button: w-10 h-10 flex items-center justify-center
}
```

**Step 2: Create ResizeHandle**

A 4px wide drag handle. On mousedown, track horizontal mouse movement to resize panel.

```typescript
// src/components/Sidebar/ResizeHandle.tsx
import { useCallback } from 'react';
import { useSidePanelStore } from '../../stores/sidePanelStore';
import { useThemeStore } from '../../stores/themeStore';

export function ResizeHandle() {
  const setPanelWidth = useSidePanelStore((s) => s.setPanelWidth);
  const isDark = useThemeStore((s) => s.theme) === 'dark';

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = useSidePanelStore.getState().panelWidth;
    const iconBarWidth = 40;

    const onMouseMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX; // moving left = wider
      setPanelWidth(startWidth + delta);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [setPanelWidth]);

  // Render: div w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors
}
```

**Step 3: Create PanelContainer**

Renders the active panel component with a header (title + close button) and scrollable body.

```typescript
// src/components/Sidebar/PanelContainer.tsx
import { useSidePanelStore } from '../../stores/sidePanelStore';
import { useThemeStore } from '../../stores/themeStore';
import { useTranslation } from '../../i18n';
// Import all 8 panel components (placeholder stubs for now)

export function PanelContainer() {
  const { activePanel, panelWidth, closePanel } = useSidePanelStore();
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const tx = useTranslation();

  if (!activePanel) return null;

  // Render: div with style={{ width: panelWidth }}
  // Header: panel title (from tx) + close (X) button
  // Body: overflow-y-auto flex-1, renders <PanelContent panel={activePanel} />
  // Initially render placeholder divs for each panel
}
```

**Step 4: Create RightSidebar**

Composes ResizeHandle + PanelContainer + IconBar.

```typescript
// src/components/Sidebar/RightSidebar.tsx
import { useSidePanelStore } from '../../stores/sidePanelStore';
import { IconBar } from './IconBar';
import { PanelContainer } from './PanelContainer';
import { ResizeHandle } from './ResizeHandle';

export function RightSidebar() {
  const activePanel = useSidePanelStore((s) => s.activePanel);

  return (
    <div className="hidden md:flex h-full">
      {activePanel && (
        <>
          <ResizeHandle />
          <PanelContainer />
        </>
      )}
      <IconBar />
    </div>
  );
}
```

**Step 5: Verify build**

Run: `npx tsc --noEmit`

**Step 6: Commit**

```
feat: add IconBar, ResizeHandle, PanelContainer, RightSidebar shell
```

---

## Task 3: Integrate RightSidebar into App.tsx (replace Watchlist)

**Files:**
- Modify: `src/App.tsx`

**Step 1: Replace Watchlist with RightSidebar**

In `src/App.tsx`:
- Remove `import { Watchlist }` and add `import { RightSidebar }` from `./components/Sidebar/RightSidebar`
- Remove `watchlistVisible` state variable
- Remove the Watchlist section (lines ~293-298):
  ```tsx
  {watchlistVisible && (
    <div className={`hidden md:block ...`}>
      <Watchlist />
    </div>
  )}
  ```
- Replace with: `<RightSidebar />`
- Remove `AlertPanel` from header (it moves to sidebar)
- Update mobile menu to use `sidePanelStore.togglePanel()` instead of `setWatchlistVisible`

**Step 2: Update mobile menu**

Replace watchlist toggle button with panel buttons that call `useSidePanelStore.getState().togglePanel(panelId)` and close the mobile menu.

**Step 3: Verify build and visual check**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```
feat: integrate RightSidebar into App.tsx, replace fixed Watchlist
```

---

## Task 4: Enhanced WatchlistPanel (with groups)

**Files:**
- Modify: `src/stores/watchlistStore.ts` (add groups)
- Create: `src/components/Sidebar/panels/WatchlistPanel.tsx`

**Step 1: Enhance watchlistStore with groups**

Add to the store:

```typescript
export interface WatchlistGroup {
  id: string;
  name: string;
  collapsed: boolean;
}

// Add to WatchlistState:
groups: WatchlistGroup[];
addGroup: (name: string) => void;
removeGroup: (id: string) => void;
renameGroup: (id: string, name: string) => void;
toggleGroupCollapse: (id: string) => void;
moveItemToGroup: (symbol: string, groupId: string | null) => void;

// Modify WatchlistItem to include:
groupId?: string | null;  // null = ungrouped
```

Default groups: `[{ id: 'default', name: 'Watchlist', collapsed: false }]`. Migrate existing items to `groupId: 'default'`.

**Step 2: Create WatchlistPanel**

Refactor from existing `src/components/Watchlist/Watchlist.tsx` into the new panel format:
- Keep: search, sparklines, real-time prices, drag reorder, sort
- Add: group headers (collapsible), "+ New Group" button, extra data row (Vol 24h, MktCap)
- Add: right-click context menu (Move to group, Remove, Set alert)
- Extra data comes from Binance ticker WS (volume, quoteVolume for market cap proxy)

The existing `Watchlist.tsx` file stays for now (backward compat) but `App.tsx` no longer uses it.

**Step 3: Wire into PanelContainer**

In `PanelContainer.tsx`, when `activePanel === 'watchlist'` render `<WatchlistPanel />`.

**Step 4: Verify build**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```
feat: add WatchlistPanel with groups, extra data, context menu
```

---

## Task 5: AlertsPanel (move from dropdown to sidebar)

**Files:**
- Create: `src/components/Sidebar/panels/AlertsPanel.tsx`

**Step 1: Create AlertsPanel**

Refactor from existing `src/components/Alerts/AlertPanel.tsx`:
- Keep: all alert creation logic (price + indicator), alert list, triggered alerts, clear
- Change: full-height panel layout instead of dropdown
- Add: collapsible Active/Triggered sections
- Add: timestamp for each alert (when created, when triggered)
- Use `alertStore` (no changes needed to the store)

**Step 2: Wire into PanelContainer**

When `activePanel === 'alerts'` render `<AlertsPanel />`.

**Step 3: Verify build**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```
feat: add AlertsPanel in sidebar (refactored from dropdown)
```

---

## Task 6: DataWindowPanel

**Files:**
- Create: `src/components/Sidebar/panels/DataWindowPanel.tsx`

**Step 1: Create DataWindowPanel**

- Subscribe to crosshair position from `crosshairStore` (syncTime)
- Read OHLCV data from `chartStore.data` at the crosshair time
- Read active indicators from `indicatorStore`
- Compute indicator values at crosshair time (reuse existing calc functions)
- Fallback: show latest bar when no crosshair active
- Display: symbol, timeframe, timestamp, O/H/L/C/V, change, then indicator values

Layout: key-value table with labels left, values right-aligned. Monospace numbers.

**Step 2: Wire into PanelContainer**

When `activePanel === 'dataWindow'` render `<DataWindowPanel />`.

**Step 3: Verify build**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```
feat: add DataWindowPanel showing OHLCV + indicators at crosshair
```

---

## Task 7: NewsPanel + newsStore

**Files:**
- Create: `src/stores/newsStore.ts`
- Create: `src/components/Sidebar/panels/NewsPanel.tsx`

**Step 1: Create newsStore**

```typescript
interface NewsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  currencies?: string[];  // e.g. ['BTC', 'ETH']
}

interface NewsState {
  articles: NewsArticle[];
  isLoading: boolean;
  filter: 'all' | 'symbol';
  fetchNews: (symbol?: string) => Promise<void>;
  setFilter: (f: 'all' | 'symbol') => void;
}
```

Fetch from CryptoPanic API: `https://cryptopanic.com/api/free/v1/posts/?auth_token=free&public=true&kind=news`

If CryptoPanic is unavailable, fallback to a simple RSS proxy or show "News unavailable" message.

Auto-refresh every 5 minutes via `setInterval` in the component.

**Step 2: Create NewsPanel**

- Tab bar: All / Symbol-specific (filters by current chartStore.symbol)
- List of articles: title, source, relative time ("15m ago", "2h ago")
- Click: `window.open(url, '_blank')`
- Loading spinner while fetching
- "Load More" button at bottom

**Step 3: Wire into PanelContainer**

**Step 4: Verify build**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```
feat: add NewsPanel with CryptoPanic feed and auto-refresh
```

---

## Task 8: ScreenerPanel + screenerStore

**Files:**
- Create: `src/stores/screenerStore.ts`
- Create: `src/components/Sidebar/panels/ScreenerPanel.tsx`

**Step 1: Create screenerStore**

```typescript
interface TickerData {
  symbol: string;
  price: number;
  changePercent: number;
  volume: number;
}

interface ScreenerState {
  tickers: TickerData[];
  isLoading: boolean;
  tab: 'gainers' | 'losers' | 'volume';
  fetchTickers: () => Promise<void>;
  setTab: (t: 'gainers' | 'losers' | 'volume') => void;
}
```

Fetch from Binance: `https://api.binance.com/api/v3/ticker/24hr`
- Filter USDT pairs only
- Sort by priceChangePercent (gainers/losers) or quoteVolume (volume)
- Show top 20

Auto-refresh every 30 seconds.

**Step 2: Create ScreenerPanel**

- Tab bar: Top Gainers / Top Losers / Volume Leaders
- Table: # / Symbol / Price / Change%
- Click row: `useChartStore.getState().setSymbol(symbol)`
- Auto-refresh indicator: "Auto-refresh 30s"

**Step 3: Wire into PanelContainer**

**Step 4: Verify build**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```
feat: add ScreenerPanel with Binance top gainers/losers/volume
```

---

## Task 9: CalendarPanel + calendarStore

**Files:**
- Create: `src/stores/calendarStore.ts`
- Create: `src/components/Sidebar/panels/CalendarPanel.tsx`

**Step 1: Create calendarStore**

```typescript
interface EconEvent {
  id: string;
  title: string;
  country: string;
  date: string;          // ISO date
  time: string;          // HH:mm
  impact: 'high' | 'medium' | 'low';
  forecast?: string;
  previous?: string;
  actual?: string;
}

interface CalendarState {
  events: EconEvent[];
  isLoading: boolean;
  tab: 'today' | 'week' | 'nextWeek';
  fetchEvents: () => Promise<void>;
  setTab: (t: 'today' | 'week' | 'nextWeek') => void;
}
```

Data source options (in order of preference):
1. `https://nfs.faireconomy.media/ff_calendar_thisweek.json` (Forex Factory mirror, free)
2. Static mock data if no free API is available at build time

**Step 2: Create CalendarPanel**

- Tab bar: Today / This Week / Next Week
- Events grouped by date, sorted by time
- Impact indicator: 🔴 High, 🟡 Medium, ⚪ Low
- Each event: time, country flag emoji, title, forecast/previous/actual values

**Step 3: Wire into PanelContainer**

**Step 4: Verify build**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```
feat: add CalendarPanel with economic events
```

---

## Task 10: NotificationsPanel + notificationStore

**Files:**
- Create: `src/stores/notificationStore.ts`
- Create: `src/components/Sidebar/panels/NotificationsPanel.tsx`

**Step 1: Create notificationStore**

```typescript
interface Notification {
  id: string;
  type: 'alert' | 'system' | 'info';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markRead: (id: string) => void;
  clearAll: () => void;
  unreadCount: () => number;
}
```

Ring buffer: max 100 items. When adding beyond 100, remove oldest. Generate id via `Date.now().toString(36)`.

**Step 2: Integrate with alertStore**

In `src/stores/alertStore.ts`, when an alert triggers, also call `notificationStore.getState().addNotification(...)`.

**Step 3: Create NotificationsPanel**

- Tab bar: All / Alerts / System
- List: icon + title + message + relative time
- Unread items: slightly highlighted background
- "Clear All" button in header
- Empty state: "No notifications"

**Step 4: Add unread badge to IconBar**

Show a small red dot on the notifications icon when `unreadCount() > 0`.

**Step 5: Wire into PanelContainer**

**Step 6: Verify build**

Run: `npx tsc --noEmit`

**Step 7: Commit**

```
feat: add NotificationsPanel with ring buffer and alert integration
```

---

## Task 11: HelpPanel

**Files:**
- Create: `src/components/Sidebar/panels/HelpPanel.tsx`

**Step 1: Create HelpPanel**

Static content panel with three collapsible sections:

1. **Keyboard Shortcuts** — table of shortcuts:
   - Scroll wheel: Zoom time axis
   - Drag: Pan horizontally
   - Drag ↕: Pan vertically (price)
   - Double-click price axis: Reset price scale
   - +/-: Zoom in/out
   - R: Reset chart

2. **Quick Guide** — collapsible sections:
   - How to add indicators
   - How to draw on chart
   - How to set alerts
   - How to backtest

3. **App Info** — version, built with lightweight-charts, links

Use `<details>/<summary>` HTML pattern or custom collapsible divs.

**Step 2: Wire into PanelContainer**

**Step 3: Verify build**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```
feat: add HelpPanel with keyboard shortcuts and quick guide
```

---

## Task 12: Mobile Support + Final Polish

**Files:**
- Modify: `src/App.tsx` (mobile menu)
- Modify: `src/components/Sidebar/RightSidebar.tsx` (mobile overlay)
- Modify: `src/components/Sidebar/IconBar.tsx` (notification badge)

**Step 1: Mobile panel overlay**

When on mobile (< md breakpoint), panels open as full-screen overlay:

```tsx
// In RightSidebar.tsx, add mobile variant:
// <div className="md:hidden fixed inset-0 z-50 bg-black/40" onClick={closePanel}>
//   <div className="absolute right-0 top-0 h-full w-80 max-w-full" onClick={e => e.stopPropagation()}>
//     <PanelContainer />
//   </div>
// </div>
```

**Step 2: Update mobile hamburger menu**

Replace the old watchlist/settings buttons with panel buttons:
- Watchlist, Alerts, Data, News, Screener, Calendar, Notifications, Help

Each button calls `togglePanel(id)` and closes the menu.

**Step 3: Clean up old Watchlist references**

- Remove `watchlistVisible` state from App.tsx
- Remove `hideWatchlist`/`showWatchlist` usage
- Keep old `src/components/Watchlist/Watchlist.tsx` file (no breaking changes) but it's no longer imported in App.tsx

**Step 4: Final build check**

Run: `npx tsc --noEmit && npx vite build`

**Step 5: Commit**

```
feat: add mobile panel overlay, update hamburger menu, clean up old Watchlist refs
```

---

## Build Order Summary

| Task | What | Dependencies |
|------|-------|-------------|
| 1 | Store + i18n | None |
| 2 | IconBar + RightSidebar shell | Task 1 |
| 3 | Integrate into App.tsx | Task 2 |
| 4 | WatchlistPanel (enhanced) | Task 3 |
| 5 | AlertsPanel | Task 3 |
| 6 | DataWindowPanel | Task 3 |
| 7 | NewsPanel | Task 3 |
| 8 | ScreenerPanel | Task 3 |
| 9 | CalendarPanel | Task 3 |
| 10 | NotificationsPanel | Task 3 |
| 11 | HelpPanel | Task 3 |
| 12 | Mobile + Polish | Tasks 4-11 |

Tasks 4-11 can be built in parallel (independent panels). Task 12 is the final integration pass.
