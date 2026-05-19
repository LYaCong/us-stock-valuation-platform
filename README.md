<div align="center">

# 📊 US Stock Valuation Platform

**Real-time US stock valuation analysis with PE percentile ranking and AI-powered insights**

[English](#features) · [中文](#功能特性)

</div>

---

## Features

- 🔍 **100+ US Stocks Tracking** — Covers mega-cap, large-cap, and ADRs including NVDA, AAPL, GOOGL, MSFT, AMZN, TSM, BABA, etc.
- 📈 **26 Major Indices & ETFs** — SPY, QQQ, DIA, IWM, sector ETFs (XLK, XLF, XLV...), and thematic ETFs (ARKK, KWEB, GDX...)
- 📐 **Multi-dimensional Valuation** — PE (TTM/Forward), PB, ROE ratios with real historical percentile ranking
- 📊 **10-Year PE Percentile** — Calculated from rolling TTM EPS × monthly prices, showing where current PE stands historically
- 📉 **Interactive PE Trend Charts** — PE, price, and market cap time-series with percentile overlay (20 years)
- 🤖 **AI-Powered Analysis** — Gemini AI integration for intelligent stock analysis and insights
- 🏷️ **Valuation Status Indicators** — Automatic Low / Neutral / High classification based on 10-year PE percentile (≤25% / 25-75% / ≥75%)
- 💹 **Market Cap & Price Display** — Real-time market data via Sina Finance API (domestic China direct access)
- 🎨 **Modern UI** — Built with React 19, Tailwind CSS 4, Recharts, and smooth animations
- 🚀 **One-Click Deploy** — Vercel deployment with auto CI/CD
- ⏰ **Automated Data Pipeline** — Cron jobs for daily quotes, PE percentile calculation, and EPS accumulation

## Tech Stack

| Category | Technology |
|----------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS 4, Recharts |
| Backend | Vercel Serverless Functions |
| Primary Data Source | Sina Finance API (新浪财经) |
| Supplement Data Sources | Finnhub (PE/PB/ROE), Twelve Data (history), Alpha Vantage (EPS), Finnhub (EPS fallback), EODHD (ETF/index fundamentals) |
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
│  Finnhub API          │────▶│  Valuation Supplement + EPS Fallback  │
│  Free, 60 req/min     │     │  Forward PE, PB, ROE, 52-week H/L,   │
│                       │     │  Beta, Dividend Yield, EPS (4Q)      │
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
│                       │     │  90/100 tickers covered               │
│                       │     │  (9 fallback to Finnhub)              │
└──────────────────────┘     └──────────────────────────────────────┘

┌──────────────────────┐     ┌──────────────────────────────────────┐
│  EODHD API            │────▶│  ETF / Index Fundamentals             │
│                       │     │  Provider-direct PE/Fwd PE/PB/Yield, │
│                       │     │  expense ratio, AUM (no Yahoo API)   │
└──────────────────────┘     └──────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────┐
│                PE Percentile Engine                    │
│  calculate_pe_history.py                               │
│  Rolling TTM EPS (4Q sum) × Monthly Price              │
│  → Historical PE(TTM) for each month                   │
│  → 10Y / 5Y percentile, min/max/median, price change   │
└──────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────┐
│            stock_cache/                   │
│  ├── daily_quotes.json    (daily quotes)  │
│  ├── historical.json      (monthly K-line │
│  │                         + PE + pct)    │
│  ├── valuation_history.json (PE timeline) │
│  └── earnings.json         (quarterly EPS)│
│                    │                      │
│                    ▼                      │
│          Vercel build → Online            │
└──────────────────────────────────────────┘
```

## PE Percentile Calculation

The core metric — **10-Year PE Percentile** — is calculated as follows:

1. **Rolling TTM EPS**: For each month, sum the most recent 4 quarters of reported EPS
2. **Monthly PE(TTM)**: Month-end closing price ÷ Rolling TTM EPS
3. **Percentile**: Where the current PE ranks among all monthly PEs in the past 10 years
4. **Status**: ≤25% = Low (undervalued) · 25-75% = Neutral · ≥75% = High (overvalued)

Additional metrics: **5-Year percentile**, **10-Year PE min/max/median**, **10-Year price change**

Coverage: **99/100 tickers** with PE history, **91% monthly data point coverage**

## Automated Data Pipeline (Cron Jobs)

All data updates are automated via OpenClaw cron jobs:

| Job | Schedule | Script | Description |
|-----|----------|--------|-------------|
| **Daily Quotes + PE** | Every day 05:00 CST | `fetch_quotes.py` → `calculate_pe_history.py` | Sina (price) + Finnhub (PE/PB/ROE) → PE percentile → git push → Vercel deploy |
| **Monthly History** | 1st of month 05:30 CST | `fetch_history.py` | Twelve Data monthly K-line (20 years, 240 pts) |
| **Historical EPS** | Every day 02:00 CST | `fetch_earnings.py` | Alpha Vantage quarterly/annual EPS (25 tickers/day) |

### Daily Pipeline Flow

```
[1/4] Sina Finance → Price, PE(TTM), Market Cap (batch, seconds)
[1.5/4] Finnhub Quote → BRK-B price (Sina doesn't support it)
[2/4] Finnhub Metric → Forward PE, PB, ROE (rate-limited concurrent, 2 threads)
[3/4] Alpha Vantage → Supplement missing company metrics (25/day limit)
[4/4] EODHD → Provider-direct ETF/index fundamentals (no Yahoo API)
→ Save to daily_quotes.json

[PE] calculate_pe_history.py
→ Read earnings.json + historical.json
→ Calculate rolling TTM EPS for each month and latest daily PE
→ PE = latest price / latest TTM EPS → percentile ranking
→ Update historical.json (add peTtm, percentile fields)
→ Update daily_quotes.json (add pe10yMin/Max/Median, pePercentile10y/5y/all-history)
→ append to valuation_history.json

→ git push → Vercel auto-deploys
```

**Coverage**: Price 100% | Forward PE 99/100 | PB 100/100 | ROE 100/100 | PE Percentile 97/100

## Project Structure

```
us-stock-valuation-platform/
├── api/
│   └── [[...path]].ts               # Vercel Serverless API handler
├── server.ts                        # Express API server (local dev)
├── src/
│   ├── App.tsx                      # Main application component
│   ├── types.ts                     # TypeScript type definitions
│   ├── components/
│   │   ├── common/                  # Reusable UI components
│   │   └── views/
│   │       ├── OverviewView.tsx     # Main dashboard
│   │       ├── DetailsView.tsx      # Company detail (PE chart + stats)
│   │       ├── ComparisonView.tsx   # Multi-stock comparison
│   │       ├── IndexView.tsx        # Index overview
│   │       ├── IndexDetailsView.tsx # Index detail
│   │       ├── DcfView.tsx          # DCF calculator
│   │       └── SettingsView.tsx     # Settings
│   ├── services/                    # API client services
│   ├── utils/                       # Utility functions
│   ├── data/                        # Static data & mappings
│   └── __tests__/                   # Unit tests
├── scripts/
│   ├── fetch_quotes.py              # Daily quotes + valuation snapshot
│   ├── fetch_history.py             # Monthly K-line history (Twelve Data)
│   ├── fetch_earnings.py            # Quarterly EPS (Alpha Vantage + Finnhub fallback)
│   ├── calculate_pe_history.py      # PE percentile engine (rolling TTM EPS)
│   └── prebuild-api-data.sh         # Copy cache to api/_data/ for Vercel
├── stock_cache/                     # Cached data files
│   ├── daily_quotes.json            # Latest quotes + PE percentile stats
│   ├── historical.json              # 20-year monthly data (price + PE + pct)
│   ├── valuation_history.json       # Daily PE/PB/ROE timeline
│   └── earnings.json                # Quarterly/annual EPS (99 tickers)
├── vercel.json                      # Vercel deployment config
└── vite.config.ts
```

## How It Works

1. **Data Fetching** — Python scripts fetch from multiple free APIs with rate-limit-aware concurrent requests
2. **EPS Fallback** — Alpha Vantage primary + Finnhub fallback for tickers not supported (9 tickers)
3. **PE Percentile Engine** — Rolling TTM EPS × monthly prices → 10-year empirical percentile
4. **Serverless API** — Vercel Serverless Function serves cached data via REST endpoints, bundled at build time
5. **Visualization** — Interactive charts showing PE trends, percentile bands, and comparison data
6. **AI Insights** — (Optional) Gemini API provides AI-generated analysis and commentary
7. **Auto Update** — Cron jobs run daily to keep data fresh, git push triggers Vercel deployment

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/valuation?tickers=AAPL,NVDA` | GET | Company valuations with PE/PB/ROE + percentile stats |
| `/api/index-valuations` | GET | Index & ETF valuations |
| `/api/quotes?symbols=AAPL` | GET | Real-time quotes (from cache) |
| `/api/fundamentals?symbol=AAPL` | GET | Company fundamentals (from cache) |
| `/api/historical?symbol=AAPL` | GET | Historical price + PE + percentile data |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FINNHUB_API_KEY` | Yes | Finnhub API key (PE/PB/ROE + EPS fallback) |
| `ALPHA_VANTAGE_API_KEY` | Yes | Alpha Vantage API key (historical EPS) |
| `TWELVE_DATA_API_KEY` | Yes | Twelve Data API key (historical monthly data) |
| `EODHD_API_TOKEN` | No | EODHD API token for provider-direct ETF/index fundamentals |
| `GEMINI_API_KEY` | No | Google Gemini API key for AI analysis features |
| `SINA_ENABLED` | No | Enable Sina Finance primary source (`true`/`false`, default: `true`) |

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

**实时美股估值分析平台，10年PE百分位排名 + AI 驱动的投资洞察**

🌐 **在线访问：[https://us-stock-valuation-platform.vercel.app](https://us-stock-valuation-platform.vercel.app)**

</div>

- 🔍 **100+ 美股追踪** — 覆盖超大盘、大盘股和 ADR，包括 NVDA、AAPL、GOOGL、MSFT、AMZN、TSM、BABA 等
- 📈 **26 个主流指数和 ETF** — SPY、QQQ、DIA、IWM，行业 ETF（XLK、XLF、XLV...）以及主题 ETF（ARKK、KWEB、GDX...）
- 📐 **多维度估值分析** — PE（TTM/Forward）、PB、ROE 估值倍数，附带真实历史百分位排名
- 📊 **10年PE百分位** — 基于滚动 TTM EPS × 月末价格计算，展示当前 PE 在历史中的位置
- 📉 **交互式PE趋势图** — PE、股价、市值时间序列，带百分位叠加层（20年数据）
- 🤖 **AI 智能分析** — 集成 Gemini AI，提供智能股票分析和洞察
- 🏷️ **估值状态标识** — 基于 10 年 PE 百分位自动划分 低估(≤25%) / 中性 / 高估(≥75%)
- 💹 **市值与价格展示** — 通过新浪财经 API 获取实时市场数据（国内直连，100% 成功率）
- 🎨 **现代化界面** — 基于 React 19、Tailwind CSS 4、Recharts 构建，流畅动画效果
- 🚀 **一键部署** — Vercel 部署，GitHub 推送自动上线
- ⏰ **自动化数据管线** — 定时任务自动更新每日行情、PE百分位、历史数据

### PE 百分位计算方法

核心指标「10年PE百分位」的计算流程：

1. **滚动 TTM EPS**：每个月取最近 4 个季度的已报告 EPS 之和
2. **月度 PE(TTM)**：月末收盘价 ÷ 滚动 TTM EPS
3. **百分位排名**：当前 PE 在过去 10 年所有月度 PE 中的排名位置
4. **估值判断**：≤25% 低估 · 25-75% 中性 · ≥75% 高估

额外指标：5年百分位、10年PE最小/最大/中位数、10年区间涨跌幅

覆盖率：**99/100 家公司**有PE历史，**91% 月度数据点覆盖**

### 数据源架构

```
新浪财经 API（主数据源）    → 价格、名称、PE(TTM)、市值、OHLCV（免费无限制，国内直连）
Finnhub API（估值+EPS补充） → Forward PE、PB、ROE + 9只Alpha Vantage不支持个股的EPS
Twelve Data API（历史数据）  → 20年月线 OHLCV（免费，8次/分钟，800次/天）
Alpha Vantage API（EPS）    → 季度/年度 EPS（免费，25次/天，90/100只覆盖）
EODHD API（ETF/指数）       → ETF/指数供应商直给估值、股息率、费率、资产规模（不使用 Yahoo）
          ↓
  PE百分位引擎 (calculate_pe_history.py)
  最新股价 ÷ 最新滚动TTM EPS → 10年/5年/全历史百分位、最小/最大/中位数
          ↓
     stock_cache/ 本地缓存
          ↓
   Vercel 构建时打包 → 在线访问
```

### 自动化定时任务

| 任务 | 时间 | 脚本 | 说明 |
|------|------|------|------|
| **每日行情+PE** | 每天 05:00 | `fetch_quotes.py` → `calculate_pe_history.py` | 行情 + PE百分位 → 自动部署 |
| **历史月线** | 每月1号 05:30 | `fetch_history.py` | Twelve Data 20年月线 |
| **历史EPS** | 每天 02:00 | `fetch_earnings.py` | Alpha Vantage 季度EPS（每天25只）|

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
