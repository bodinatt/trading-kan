# Trading Kan - Design Document

**Date:** 2026-03-13
**Status:** Approved

## Overview

Trading Kan is a free, open-source web-based charting platform similar to TradingView. It supports multiple markets (Thai stocks, Crypto, Forex) and is designed to be publicly accessible with user accounts.

## Requirements

- **Markets:** Thai stocks (SET), Crypto, Forex, US stocks
- **Features:** Candlestick charts, technical indicators, drawing tools, real-time data, multi-chart layout
- **Users:** Public platform with user authentication
- **Budget:** Free or minimal cost
- **License compliance:** No TradingView copyright infringement

## Tech Stack

### Frontend
- **React 18 + TypeScript** — UI framework
- **Vite** — build tool
- **Lightweight Charts v5** (Apache 2.0) — charting engine by TradingView
- **Zustand** — state management
- **TailwindCSS** — styling
- **react-grid-layout** — multi-chart layout with drag/resize

### Backend
- **Node.js + Express** — API server
- **PostgreSQL** (prod) / **SQLite** (dev) — database
- **JWT** — authentication
- **WebSocket** — real-time data relay

### Free Data Sources
| Market | API | Real-time | Historical | Cost |
|--------|-----|-----------|------------|------|
| Crypto | Binance WebSocket API | Yes | Yes | Free |
| US Stocks | Yahoo Finance (unofficial) | Delayed | Yes | Free |
| Thai Stocks | SET / web scraping | Limited | Limited | Free |
| Forex | exchangerate.host / Twelve Data free tier | Delayed | Yes | Free |

## Architecture

```
Frontend (React + TS + Vite)
├── Chart Engine (Lightweight Charts v5)
├── Drawing Tools (Custom canvas overlay)
├── Indicator Panel (Custom, multi-pane)
├── Layout Manager (react-grid-layout)
├── Symbol Search + Watchlist
└── User Settings

State Management (Zustand)

Data Layer (WebSocket + REST)
├── Binance WS (Crypto)
├── Yahoo Finance (Stocks)
└── Forex APIs

Backend (Node.js + Express)
├── Auth (JWT)
├── User Settings API
└── Data Proxy / Cache

Database (PostgreSQL / SQLite)
├── Users
├── Watchlists
├── Chart Layouts
└── User Preferences
```

## Phased Delivery

### Phase 1 — MVP
- Candlestick chart with timeframe selector (1m, 5m, 15m, 1h, 4h, 1D, 1W)
- Basic indicators: SMA, EMA, RSI, MACD, Bollinger Bands (separate panes)
- Symbol search + Watchlist
- Single chart view
- Crypto real-time data (Binance)

### Phase 2 — Enhanced
- Drawing tools (trendline, horizontal line, fibonacci)
- Multi-chart layout (2x2, 3x1, custom)
- User authentication + save settings
- Additional data sources (stocks, forex)

### Phase 3 — Advanced
- Price alert system
- Custom indicator builder
- Chart sharing
- Mobile responsive design

## Cost Estimate

| Item | Cost |
|------|------|
| Lightweight Charts | Free (Apache 2.0) |
| Binance API | Free |
| Yahoo Finance | Free (unofficial) |
| Hosting (Vercel/Railway free tier) | Free |
| Database (Supabase free tier) | Free |
| Domain (optional) | ~300-500 THB/year |
| **Total** | **Free or ~300-500 THB/year** |
