# Right Sidebar Panel System — Design Document

**Date:** 2026-03-14
**Status:** Approved

## Overview

Build a TradingView-style right sidebar panel system with an icon toolbar, resizable panels, and 8 panel types. Replaces the current fixed-width Watchlist sidebar.

## Architecture: Single Panel + Resize

```
┌──────────────────────────────────────────────────────────┐
│  Chart Area (flex-1)       │⟷│ Active Panel  │ IconBar   │
│                            │  │ (240-600px)   │  (40px)   │
│                            │  │ resizable     │  8 icons  │
└──────────────────────────────────────────────────────────┘
```

- **IconBar**: Vertical strip (w-10, 40px) pinned to right edge. 8 icon buttons.
- **Active Panel**: Only one panel visible at a time. Toggle on/off by clicking icon.
- **ResizeHandle**: 4px drag handle on left edge of panel. Min 240px, max 50% viewport.
- **Mobile**: IconBar hidden. Panel opens as full-screen overlay via hamburger menu.

## Store: `sidePanelStore.ts`

```typescript
type PanelId = 'watchlist' | 'alerts' | 'dataWindow' | 'news'
             | 'screener' | 'calendar' | 'notifications' | 'help';

interface SidePanelState {
  activePanel: PanelId | null;
  panelWidth: number;              // default 280, persisted
  togglePanel: (id: PanelId) => void;
  setPanelWidth: (w: number) => void;
}
```

Persisted via Zustand `persist` middleware (key: `trading-kan-side-panel`).

## Components

| Component | Location | Purpose |
|---|---|---|
| `RightSidebar` | `src/components/Sidebar/RightSidebar.tsx` | Container: IconBar + PanelContainer + ResizeHandle |
| `IconBar` | `src/components/Sidebar/IconBar.tsx` | Vertical icon strip, highlights active panel |
| `PanelContainer` | `src/components/Sidebar/PanelContainer.tsx` | Renders active panel component |
| `ResizeHandle` | `src/components/Sidebar/ResizeHandle.tsx` | Drag handle for width adjustment |

## Panel Designs

### 1. Enhanced Watchlist (`src/components/Sidebar/panels/WatchlistPanel.tsx`)

Upgrade from existing Watchlist component:
- **Groups**: Create/delete/rename groups, collapse/expand, drag symbols between groups
- **Extra data**: Volume 24h, Market Cap, 24h High/Low (second line, small text)
- **Sparkline**: Keep existing SVG sparklines
- **Context menu**: Move to group, Remove, Set alert
- **Data**: watchlistStore (enhanced with groups), Binance WS (existing)

### 2. Alerts Panel (`src/components/Sidebar/panels/AlertsPanel.tsx`)

Move from header dropdown to full panel:
- **Sections**: Active alerts, Triggered alerts (collapsible)
- **Create**: Inline form for price + indicator alerts
- **Actions**: Remove, Clear triggered
- **Data**: alertStore (existing)

### 3. Data Window (`src/components/Sidebar/panels/DataWindowPanel.tsx`)

OHLCV + indicator values at crosshair position:
- **Source**: Subscribe to chart crosshairMove event
- **Fallback**: Show latest bar when no crosshair
- **Indicators**: Read from indicatorStore, compute values at crosshair time
- **Data**: crosshairMove event + indicatorStore + chartStore

### 4. News Feed (`src/components/Sidebar/panels/NewsPanel.tsx`)

Crypto/market news:
- **Tabs**: All, symbol-specific, category filters
- **Source**: CryptoPanic API (free, no key)
- **Click**: Opens article in new tab
- **Refresh**: Auto-refresh every 5 minutes
- **Data**: newsStore (new) with fetch + cache

### 5. Screener (`src/components/Sidebar/panels/ScreenerPanel.tsx`)

Market movers:
- **Tabs**: Top Gainers, Top Losers, Volume Leaders
- **Source**: Binance REST `/api/v3/ticker/24hr`
- **Click**: Load symbol in main chart
- **Refresh**: Auto-refresh every 30 seconds
- **Data**: screenerStore (new)

### 6. Economic Calendar (`src/components/Sidebar/panels/CalendarPanel.tsx`)

Upcoming economic events:
- **Tabs**: Today, This Week, Next Week
- **Impact**: High (red), Medium (yellow), Low (gray)
- **Data**: Forecast, Previous, Actual values
- **Source**: Free economic calendar API
- **Data**: calendarStore (new)

### 7. Notifications Center (`src/components/Sidebar/panels/NotificationsPanel.tsx`)

Unified notification history:
- **Categories**: All, Alerts, System
- **Sources**: Triggered alerts, WS connect/disconnect, errors
- **Storage**: Ring buffer of 100 items in notificationStore (new)
- **Actions**: Clear all, dismiss individual

### 8. Help Center (`src/components/Sidebar/panels/HelpPanel.tsx`)

Static reference panel:
- **Keyboard shortcuts**: Table of all shortcuts
- **Quick guide**: Collapsible sections (indicators, drawings, alerts, backtest)
- **App info**: Version, links
- **Data**: Static content, no API

## New Stores

| Store | Purpose | Persist |
|---|---|---|
| `sidePanelStore.ts` | Active panel, panel width | Yes |
| `newsStore.ts` | News articles cache, filters | No |
| `screenerStore.ts` | Ticker data, sort mode | No |
| `calendarStore.ts` | Economic events cache | No |
| `notificationStore.ts` | Notification ring buffer | No |

## i18n

Add ~120 new translation keys across en.ts and th.ts for all panel labels, buttons, and messages.

## Migration

- Current `Watchlist` component code → refactored into `WatchlistPanel`
- Current `AlertPanel` dropdown → refactored into `AlertsPanel` (full panel)
- `App.tsx` layout → replace `<Watchlist />` with `<RightSidebar />`
- Header alert bell → becomes icon in IconBar
- Mobile hamburger menu → updated to list panel names

## Data Sources (all free, no API keys)

| Panel | Source |
|---|---|
| Watchlist | Binance WS mini-ticker (existing) |
| Alerts | Internal alertStore (existing) |
| Data Window | Chart crosshairMove event (existing) |
| News | CryptoPanic API |
| Screener | Binance REST API |
| Calendar | Free economic calendar API |
| Notifications | Internal events |
| Help | Static |
