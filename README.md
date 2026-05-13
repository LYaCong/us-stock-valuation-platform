<div align="center">

# 📊 US Stock Valuation Platform

**Real-time US stock valuation analysis with AI-powered insights**

[English](#features) · [中文](#功能特性)

</div>

---

## Features

- 🔍 **100+ US Stocks Tracking** — Covers mega-cap, large-cap, and ADRs including NVDA, AAPL, GOOGL, MSFT, AMZN, TSM, BABA, etc.
- 📈 **26 Major Indices & ETFs** — SPY, QQQ, DIA, IWM, sector ETFs (XLK, XLF, XLV...), and thematic ETFs (ARKK, KWEB, GDX...)
- 📐 **Multi-dimensional Valuation** — PE (TTM/Forward), PB, ROE ratios, PE percentile ranking
- 📊 **Historical Trend Charts** — 20 years of monthly price data with PE trend visualization
- 🤖 **AI-Powered Analysis** — Gemini AI integration for intelligent stock analysis and insights
- 🏷️ **Valuation Status Indicators** — Automatic Low / Neutral / High classification based on PE thresholds
- 💹 **Market Cap & Price Display** — Real-time market data via Sina Finance API (domestic China direct access)
- 🎨 **Modern UI** — Built with React 19, Tailwind CSS 4, Recharts, and smooth animations
- 🚀 **One-Click Deploy** — Vercel deployment with auto CI/CD
- ⏰ **Automated Data Pipeline** — Cron jobs for daily quotes, monthly history, and EPS accumulation

## Tech Stack

| Category | Technology |
|----------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS 4, Recharts |
| Backend | Vercel Serverless Functions |
| Primary Data Source | Sina Finance API (新浪财经) |
| Supplement Data Sources | Finnhub (PE/PB/ROE), Twelve Data (history), Alpha Vantage (EPS) |
| AI | Google Gemini API (`@google/genai`) |
| Build | Vite 6 |
| Deployment | Vercel (CI/CD via GitHub push) |
| Automation | OpenClaw Cron Jobs |
| Testing | Node.js built-in test runner |

## Live Demo

🌐 **[https://us-stock-valuation-platform.vercel.app](https://us-stock-valuation-platform.vercel.app)**

## Quick Start

### Prerequisites

- Node.js >= 18
- API keys (see [Environment Variables](#environment-variables))

### Installation

```bash
# Clone the repository
git clone https://github.com/LYaCong/us-stock-valuation-platform.git
cd us-stock-valuation-platform

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local and add your API keys

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Build for Production

```bash
npm run build
npm run preview
```

### Run Tests

```bash
npm run test
```

## Data Source Architecture

```
┌──────────────────────┐     ┌──────────────────────────────────────┐
│  Sina Finance API     │────▶│  Primary Source (100% price coverage) │
│  (新浪财经)           │     │  Price, Name, PE(TTM), Market Cap,   │
│  Free, unlimited      │     │  Change%, OHLCV                      │
└──────────────────────┘     └──────────────────────────────────────┘

┌──────────────────────┐     ┌──────────────────────────────────────┐
│  Finnhub API          │────▶│  Valuation Supplement                 │
│  Free, 60 req/min     │     │  Forward PE, PB, ROE, 52-week H/L,   │
│                       │     │  Beta, Dividend Yield                 │
│                       │     │  + Full data for BRK-B (Sina N/A)    │
└──────────────────────┘     └──────────────────────────────────────┘

┌──────────────────────┐     ┌──────────────────────────────────────┐
│  Twelve Data API      │────▶│  Historical Monthly Prices            │
│  Free, 8 req/min,     │     │  20 years (240 months), OHLCV        │
│  800 req/day          │     │  100 companies + 26 indices           │
└──────────────────────┘     └──────────────────────────────────────┘

┌──────────────────────┐     ┌──────────────────────────────────────┐
│  Alpha Vantage API    │────▶│  Historical Earnings (EPS)            │
│  Free, 25 req/day     │     │  Quarterly & Annual EPS               │
│                       │     │  → Calculate Historical PE(TTM)      │
└──────────────────────┘     └──────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────┐
│            stock_cache/                   │
│  ├── daily_quotes.json    (daily quotes)  │
│  ├── historical.json      (monthly K-line)│
│  ├── valuation_history.json (PE timeline) │
│  └── earnings.json         (quarterly EPS)│
│                    │                      │
│                    ▼                      │
│          Vercel build → Online            │
└──────────────────────────────────────────┘
```

## Automated Data Pipeline (Cron Jobs)

All data updates are automated via OpenClaw cron jobs:

| Job | Schedule | Script | Duration | Description |
|-----|----------|--------|----------|-------------|
| **Daily Quotes** | Every day 05:00 CST | `fetch_quotes.py` | ~4 min | Sina (price) + Finnhub (PE/PB/ROE) → git push → Vercel deploy |
| **Monthly History** | 1st of month 05:30 CST | `fetch_history.py` | ~16 min | Twelve Data monthly K-line (20 years, 240 pts) |
| **Historical EPS** | Every day 02:00 CST | `fetch_earnings.py` | ~30 sec | Alpha Vantage quarterly/annual EPS (25 tickers/day) |

### Daily Quotes Flow (fetch_quotes.py)

```
[1/3] Sina Finance → Price, PE(TTM), Market Cap (batch, seconds)
[1.5/3] Finnhub Quote → BRK-B price (Sina doesn't support it)
[2/3] Finnhub Metric → Forward PE, PB, ROE (rate-limited concurrent, 2 threads)
[3/3] Alpha Vantage → Supplement missing metrics (25/day limit)
→ Save to daily_quotes.json + append to valuation_history.json
→ git push → Vercel auto-deploys
```

**Coverage**: Price 100% | Forward PE 99/100 | PB 100/100 | ROE 100/100

### Historical PE Timeline

Two approaches combined for maximum coverage:

- **Approach A (Backfill)**: Fetch quarterly EPS from Alpha Vantage → calculate PE(TTM) = monthly price / rolling 4-quarter EPS sum → gives 10+ years of historical PE
- **Approach B (Ongoing)**: Every day's PE/PB/ROE snapshot is automatically appended to `valuation_history.json` → builds a growing daily valuation timeline from now on

## Project Structure

```
us-stock-valuation-platform/
├── api/
│   └── [[...path]].ts               # Vercel Serverless API handler
├── server.ts                        # Express API server (local dev)
├── server/
│   ├── services/
│   │   ├── marketDataService.ts     # Market data fetching & caching
│   │   └── cacheService.ts          # Cache file I/O
│   └── mappers/
│       └── valuationMappers.ts      # Data transformation & mapping
├── src/
│   ├── App.tsx                      # Main application component
│   ├── types.ts                     # TypeScript type definitions
│   ├── config/
│   │   └── tickers.ts               # Stock & index ticker lists
│   ├── components/
│   │   ├── common/                  # Reusable UI components
│   │   └── views/                   # Page-level views
│   ├── hooks/                       # Custom React hooks
│   ├── services/                    # API client services
│   ├── utils/                       # Utility functions
│   ├── data/                        # Static data & mappings
│   └── __tests__/                   # Unit tests
├── scripts/
│   ├── fetch_quotes.py              # Daily quotes + valuation snapshot
│   ├── fetch_history.py             # Monthly K-line history (Twelve Data)
│   ├── fetch_earnings.py            # Quarterly EPS (Alpha Vantage, 25/day)
│   └── prebuild-api-data.sh         # Copy cache to api/_data/ for Vercel
├── stock_cache/                     # Cached data files
│   ├── daily_quotes.json            # Latest quotes (100 cos + 26 indices)
│   ├── historical.json              # 20-year monthly data (126 tickers)
│   ├── valuation_history.json       # Daily PE/PB/ROE timeline
│   └── earnings.json                # Quarterly/annual EPS data
├── vercel.json                      # Vercel deployment config
├── vite.config.ts
└── tsconfig.json
```

## How It Works

1. **Data Fetching** — Python scripts fetch from multiple free APIs with rate-limit-aware concurrent requests
2. **Serverless API** — Vercel Serverless Function serves cached data via REST endpoints, bundled at build time
3. **PE Percentile Calculation** — Computes PE percentile using empirical thresholds based on S&P 500 historical distribution
4. **Valuation Classification** — Classifies stocks as Low/Neutral/High based on PE thresholds
5. **Visualization** — Interactive charts showing PE trends, percentile bands, and comparison data
6. **AI Insights** — (Optional) Gemini API provides AI-generated analysis and commentary
7. **Auto Update** — Cron jobs run daily to keep data fresh, git push triggers Vercel deployment

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/valuation?tickers=AAPL,NVDA` | GET | Company valuations with PE/PB/ROE |
| `/api/index-valuations` | GET | Index & ETF valuations |
| `/api/quotes?symbols=AAPL` | GET | Real-time quotes (from cache) |
| `/api/fundamentals?symbol=AAPL` | GET | Company fundamentals (from cache) |
| `/api/historical?symbol=AAPL` | GET | Historical price & PE data |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | No | Google Gemini API key for AI analysis features |
| `SINA_ENABLED` | No | Enable Sina Finance primary source (`true`/`false`, default: `true`) |
| `FINNHUB_API_KEY` | No | Finnhub API key for Forward PE/PB/ROE supplement |
| `TWELVE_DATA_API_KEY` | No | Twelve Data API key for historical monthly data |
| `ALPHA_VANTAGE_API_KEY` | No | Alpha Vantage API key for historical EPS data |
| `YAHOO_ENABLED` | No | Enable Yahoo Finance supplement (`true`/`false`, default: `false`) |

## Deployment (Vercel)

This project is deployed on **Vercel** with zero-config CI/CD:

1. Import repo from GitHub in [Vercel Dashboard](https://vercel.com)
2. Framework preset: **Vite** (auto-detected)
3. Deploy — that's it!

The `vercel-build` npm script automatically:
1. Copies `stock_cache/` → `api/_data/`
2. Builds the Vite frontend
3. Serverless function reads data at runtime via `fs.readFileSync`

## License

MIT

---

<div align="center">

## 功能特性

**实时美股估值分析平台，AI 驱动的投资洞察**

🌐 **在线访问：[https://us-stock-valuation-platform.vercel.app](https://us-stock-valuation-platform.vercel.app)**

</div>

- 🔍 **100+ 美股追踪** — 覆盖超大盘、大盘股和 ADR，包括 NVDA、AAPL、GOOGL、MSFT、AMZN、TSM、BABA 等
- 📈 **26 个主流指数和 ETF** — SPY、QQQ、DIA、IWM，行业 ETF（XLK、XLF、XLV...）以及主题 ETF（ARKK、KWEB、GDX...）
- 📐 **多维度估值分析** — PE（TTM/Forward）、PB、ROE 估值倍数，PE 百分位排名
- 📊 **20年历史趋势** — 月线价格数据，可视化 PE 比率历史走势，附带百分位参考线
- 🤖 **AI 智能分析** — 集成 Gemini AI，提供智能股票分析和洞察
- 🏷️ **估值状态标识** — 基于历史百分位自动划分 低估 / 中性 / 高估
- 💹 **市值与价格展示** — 通过新浪财经 API 获取实时市场数据（国内直连，100% 成功率）
- 🎨 **现代化界面** — 基于 React 19、Tailwind CSS 4、Recharts 构建，流畅动画效果
- 🚀 **一键部署** — Vercel 部署，GitHub 推送自动上线
- ⏰ **自动化数据管线** — 定时任务自动更新每日行情、历史数据、季度EPS

### 数据源架构

```
新浪财经 API（主数据源）    → 价格、名称、PE(TTM)、市值、OHLCV（免费无限制，国内直连）
Finnhub API（估值补充）     → Forward PE、PB、ROE、52周高低、Beta（免费，60次/分钟）
Twelve Data API（历史数据）  → 20年月线 OHLCV（免费，8次/分钟，800次/天）
Alpha Vantage API（EPS）    → 季度/年度 EPS（免费，25次/天）
          ↓
     stock_cache/ 本地缓存
          ↓
   Vercel 构建时打包 → 在线访问
```

### 自动化定时任务

| 任务 | 时间 | 脚本 | 耗时 | 说明 |
|------|------|------|------|------|
| **每日行情** | 每天 05:00 | `fetch_quotes.py` | ~4分钟 | 新浪价格 + Finnhub估值 → 自动部署 |
| **历史月线** | 每月1号 05:30 | `fetch_history.py` | ~16分钟 | Twelve Data 20年月线 |
| **历史EPS** | 每天 02:00 | `fetch_earnings.py` | ~30秒 | Alpha Vantage 季度EPS（每天25只） |

### 历史PE时间线

- **方案A（回溯）**：从 Alpha Vantage 获取季度 EPS → 计算 PE(TTM) = 月末价格 / 滚动4季度EPS之和 → 得到10年+的历史PE
- **方案B（积累）**：每天的 PE/PB/ROE 快照自动追加到 `valuation_history.json` → 持续积累每日估值时间线

### 快速开始

```bash
git clone https://github.com/LYaCong/us-stock-valuation-platform.git
cd us-stock-valuation-platform
npm install
cp .env.example .env.local   # 编辑 .env.local 添加你的 API keys
npm run dev
```

### 部署（Vercel）

1. 在 [Vercel](https://vercel.com) 导入 GitHub 仓库
2. 框架自动识别为 **Vite**
3. 点击部署即可

`vercel-build` 脚本会自动：复制缓存数据 → `api/_data/` → 构建前端 → 上线

### 开源协议

MIT
