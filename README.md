<div align="center">

# 📊 US Stock Valuation Platform

**Real-time US stock valuation analysis with PE percentile ranking and AI-powered insights**

[English](#features) · [中文](#功能特性)

</div>

---

## Features

- 🔍 **Top 100 US-Listed Companies Tracking** — Refreshed by market cap, covering mega-cap US stocks and ADRs including NVDA, GOOGL, AAPL, MSFT, AMZN, AVGO, TSM, etc.
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
| Supplement Data Sources | Finnhub (PE/PB/ROE), Twelve Data (history), Alpha Vantage (EPS), EODHD (ETF/index fundamentals), SEC companyfacts (DCF fundamentals) |
| AI | Google Gemini API (`@google/genai`) |
| Build | Vite 6 |
| Deployment | Vercel (CI/CD via GitHub push) |
| Automation | OpenClaw Cron Jobs |
| Testing | Node.js built-in test runner |

## Live Demo

🌐 **[https://us-stock-valuation-platform.vercel.app](https://us-stock-valuation-platform.vercel.app)**

## Latest DCF Upgrade (2026-05-27)

This release makes the DCF page stricter and easier to use for beginners:

- **SEC filing-based DCF inputs**: `scripts/fetch_sec_dcf_fundamentals.py` fetches operating cash flow, capital expenditures, free cash flow, cash, debt, net debt, shares outstanding, fiscal year, filing date, accession number, and source tags from SEC `companyfacts`.
- **Field-level DCF source periods**: `annualCashFlow.freeCashFlow` is explicitly tagged as `periodType: annual` for the latest annual filing, while `latestBalanceSheet.cashAndEquivalents`, `latestBalanceSheet.totalDebt`, and `latestBalanceSheet.netDebt` are tagged as `periodType: latestInstant`. `latestShares` uses `periodType: latestDisclosure`. Each field carries fiscal period metadata and source tags so the UI can say exactly which reporting period is being used.
- **Supplemental DCF fallback**: `scripts/enrich_dcf_alpha_vantage.py` fills only fields that SEC `companyfacts` leaves missing, using Alpha Vantage `CASH_FLOW`, `BALANCE_SHEET`, and `OVERVIEW`. Supplemental values are marked in `supplementalSources` and do not overwrite SEC values. After the 2026-05-27 run, DCF input coverage is **99/100 companies**; `ISRG` still lacks a supported total-debt / net-debt field.
- **Chinese DCF terminology**: the Chinese UI now spells out free cash flow as `自由现金流` instead of using the English acronym `FCF`, while the English UI keeps the standard abbreviation where appropriate.
- **No silent DCF estimates**: the DCF page no longer backs into FCF from PE, shares from market cap / price, or net debt from market-cap heuristics. Missing filing data stays missing and blocks the calculation when it is required.
- **Company assumptions with browser fallback**: `dcf_assumptions.json` stores committed per-ticker defaults for deployed builds. Local development can still write project defaults from the DCF page; if a deployed serverless environment rejects project-file writes, the UI now saves the assumption in the current browser and reuses it for that ticker on the same device.
- **Beginner guidance**: the page now explains each DCF term with expanded help icons, adds scenario presets, shows a simple calculation flow, separates year 1-10 cash flow from terminal value, shows formula breakdowns for enterprise value / equity value / implied price, and adds plain-language sections for inputs, assumptions, and result interpretation.
- **Refresh cadence**: market quotes remain daily data; SEC DCF fundamentals are quarterly / filing-driven and should be refreshed after new 10-Q / 10-K filings; DCF assumptions are human judgments and only change when saved or edited. Cache metadata keeps the SEC generation time separate from any local schema backfill time.

## Latest Optimization (2026-05-27)

This release adds the DCF supplemental-data layer while keeping SEC as the primary source of truth:

- **SEC remains the primary DCF source**: `scripts/fetch_sec_dcf_fundamentals.py` still uses SEC `companyfacts` first and preserves field-level reporting periods. Free cash flow uses the latest annual filing; cash, total debt, and net debt use the latest reported instant; shares use the latest disclosure.
- **Alpha Vantage only fills gaps**: `scripts/enrich_dcf_alpha_vantage.py` fills fields that SEC leaves missing with Alpha Vantage `CASH_FLOW`, `BALANCE_SHEET`, and `OVERVIEW`, without overwriting SEC-sourced values.
- **Transparent supplemental lineage**: supplemental fields are recorded in `supplementalSources`, and the DCF page displays the supplemental provider so Alpha Vantage values are not mistaken for SEC originals.
- **DCF coverage improved**: DCF input coverage is now **99/100 companies**. `BAC` is backfilled, while `ISRG` still lacks a supported total-debt / net-debt field.
- **Chinese DCF terminology**: the Chinese UI spells out free cash flow as `自由现金流` instead of showing the English acronym `FCF`.
- **DCF page usability**: beginner guidance now walks through filing inputs, assumptions, and result interpretation in plain language. Hover help explains what each input means, why it matters, and how higher / lower assumptions affect valuation. Saving company assumptions also falls back to browser-local storage when deployed serverless builds cannot write project files.

## Latest Optimization (2026-05-21)

This release refreshes the company universe to the latest top 100 US-listed companies by market cap and keeps the valuation pipeline deploy-safe:

- **Top 100 refresh**: `DEFAULT_TICKERS` and all data scripts now use the refreshed U.S.-listed 100-company list, adding SPCX and ETN while removing ISRG and UBER from the default universe.
- **Dropped company cleanup**: daily quote merging and historical/EPS cache loading now retain only the active tracking universe, preventing old top-100 constituents from reappearing after a refresh.
- **Current data refresh**: Twelve Data historical prices and daily quote caches have been refreshed for 100 companies + 26 indices. New constituents SPCX and ETN require the next data refresh before their local caches are fully populated.
- **Secret-safe logs**: Alpha Vantage and other API keys are redacted from future script limit/error messages.
- **Company overview fixes**: BRK-B and INTC now get PE(TTM) from the latest price divided by the latest rolling 4-quarter EPS, so their PE and 10-year PE percentile are no longer blank when supplier PE fields are missing.
- **BRK-B market cap fallback**: Finnhub `marketCapitalization` is now used to fill missing market cap values, with million-USD values converted to display-ready dollars.
- **Daily PE refresh**: `fetch_quotes.py` now runs `calculate_pe_history.py` after daily quotes are saved, ensuring PE(TTM), 10-year percentile, 5-year percentile, all-history percentile, and 10-year range stats refresh every day.
- **Company details PE stats**: the bottom metric cards are now explicitly PE valuation stats and follow only the PE chart range, even when the main chart is switched to price or market cap.
- **PE-only chart sync**: the right-side **PE Percentile Trend** appears only when the main detail chart is set to PE. PE chart hover is synchronized both ways, with matching reference lines, dots, and value labels on both charts.
- **Detail chart clarity**: linked value labels now stay inside the chart near right-edge data points, and PE percentile trend values are recalculated for the selected range instead of reusing a fixed cached percentile.
- **Comparison workflow controls**: comparison analysis now supports MAX/20Y/10Y/5Y/3Y/1Y range selection, PE vs. price metric switching, shared-date alignment, visible X-axis dates, and a narrower current cross-section panel.
- **Comparison add-company entry**: the previous median-percentile card was replaced with an add-company search dropdown, avoiding a confusing metric that did not match the selected comparison chart.
- **Index / ETF fundamentals**: index valuation uses provider-direct EODHD fields only, including PE, forward PE, PB, dividend yield, expense ratio, and AUM where available. Missing supplier fields are not fabricated.
- **No Yahoo API dependency**: runtime code and dependency manifests no longer use `yahoo-finance2`; old Yahoo fallback code was removed to avoid accidental rate-limit issues.
- **Cross-platform build scripts**: Vercel prebuild data copying now runs through `scripts/prebuild-api-data.mjs`, so local Windows development no longer needs Bash for this step. The npm scripts call local Node entrypoints directly and the `clean` script no longer uses `rm -rf`.
- **Verification**: `npm run test`, `npm run lint`, and `npm run build` pass with WSL2 Node.js 22.

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

On Windows, if PowerShell blocks `npm` because of execution policy, use `npm.cmd` for the same commands, for example `npm.cmd run dev`. If the checkout was previously installed from WSL and Vite reports a missing Rollup package such as `@rollup/rollup-win32-x64-msvc`, run `npm.cmd install` once from Windows so platform-specific optional dependencies are restored. Success sign: `node_modules/@rollup/rollup-win32-x64-msvc` exists.

### Build for Production

```bash
npm run build
npm run preview
```

`npm run vercel-build` copies `stock_cache/` into `api/_data/` with a cross-platform Node script before building. Npm scripts call local Node entrypoints directly, which is more reliable when a checkout moves between WSL and Windows. `npm run clean` avoids recursive deletion and only removes an empty `dist` directory.

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
│  Finnhub API          │────▶│  Valuation Supplement                  │
│  Free, 60 req/min     │     │  Forward PE, PB, ROE, 52-week H/L,   │
│                       │     │  Beta, Dividend Yield, market cap     │
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
│                       │     │  92/100 tickers covered               │
│                       │     │  Backfilled across daily quota windows│
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

Coverage after the 2026-05-21 refresh: **92/100 tickers** with PE history, **94% monthly data point coverage**. The remaining 8 tickers are waiting for the next Alpha Vantage EPS quota window.

## Automated Data Pipeline (Cron Jobs)

All data updates are automated via OpenClaw cron jobs:

| Job | Schedule | Script | Description |
|-----|----------|--------|-------------|
| **Daily Quotes + PE** | Every day 05:00 CST | `fetch_quotes.py` → `calculate_pe_history.py` | Sina (price) + Finnhub (PE/PB/ROE) → PE percentile → git push → Vercel deploy |
| **Monthly History** | 1st of month 05:30 CST | `fetch_history.py` | Twelve Data monthly K-line (20 years, 240 pts) |
| **Historical EPS** | Every day 02:00 CST | `fetch_earnings.py` | Alpha Vantage quarterly/annual EPS (25 tickers/day) |
| **DCF supplemental fallback** | After SEC DCF refresh, as needed | `enrich_dcf_alpha_vantage.py` | Fill only SEC-missing DCF fields and mark `supplementalSources` |

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

**Coverage after the 2026-05-21 refresh**: Price 100% | Forward PE 99/100 | PB 100/100 | ROE 100/100 | PE Percentile 92/100

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
│   ├── fetch_earnings.py            # Quarterly EPS (Alpha Vantage)
│   ├── enrich_dcf_alpha_vantage.py  # DCF supplemental fallback (Alpha Vantage)
│   ├── calculate_pe_history.py      # PE percentile engine (rolling TTM EPS)
│   ├── prebuild-api-data.mjs        # Copy cache to api/_data/ for Vercel
│   └── clean-dist.mjs               # Safe cross-platform dist cleanup helper
├── stock_cache/                     # Cached data files
│   ├── daily_quotes.json            # Latest quotes + PE percentile stats
│   ├── historical.json              # 20-year monthly data (price + PE + pct)
│   ├── valuation_history.json       # Daily PE/PB/ROE timeline
│   └── earnings.json                # Quarterly/annual EPS (92 tickers)
├── vercel.json                      # Vercel deployment config
└── vite.config.ts
```

## How It Works

1. **Data Fetching** — Python scripts fetch from multiple free APIs with rate-limit-aware concurrent requests
2. **EPS Backfill** — Alpha Vantage accumulates quarterly/annual EPS within the 25 requests/day free quota
3. **PE Percentile Engine** — Rolling TTM EPS × monthly prices → 10-year empirical percentile
4. **Serverless API** — Vercel Serverless Function serves cached data via REST endpoints, bundled at build time
5. **Visualization** — Interactive charts showing PE trends, percentile bands, and comparison data
6. **AI Insights** — (Optional) Gemini API provides AI-generated analysis and commentary
7. **Auto Update** — Cron jobs run daily to keep data fresh, git push triggers Vercel deployment

## API Endpoints

### DCF Data Files

- `scripts/fetch_sec_dcf_fundamentals.py`: OpenClaw-facing SEC companyfacts fetcher. It writes real DCF inputs and does not estimate missing fields.
- `scripts/enrich_dcf_alpha_vantage.py`: optional supplemental fetcher. Run it after the SEC fetcher to fill missing DCF fields from Alpha Vantage without overwriting SEC-sourced values.
- `stock_cache/dcf_fundamentals.json`: local cache for SEC filing-based FCF, debt, cash, shares, filing dates, source tags, and field-level period metadata. FCF uses the latest annual filing; cash, total debt, and net debt use the latest reported instant; shares use the latest disclosure.
- `stock_cache/dcf_assumptions.json`: project-level per-company DCF assumptions. Commit this file to make saved assumptions available online. In deployed read-only environments, the DCF page falls back to browser-local saved assumptions for the current device.
- `api/_data/dcf_fundamentals.json` and `api/_data/dcf_assumptions.json`: Vercel runtime copies used by the serverless API.

Run the SEC fetcher with Python standard library only; it does not require `requests` or extra packages. For best reliability, set `SEC_USER_AGENT` to a descriptive value with contact info before OpenClaw runs it, for example `LiYacong us-stock-valuation-platform dcf-data your-email@example.com`. A vague or missing SEC user agent can return HTTP 403.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/valuation?tickers=AAPL,NVDA` | GET | Company valuations with PE/PB/ROE + percentile stats |
| `/api/index-valuations` | GET | Index & ETF valuations |
| `/api/quotes?symbols=AAPL` | GET | Real-time quotes (from cache) |
| `/api/fundamentals?symbol=AAPL` | GET | Company fundamentals + SEC DCF inputs + project DCF assumptions (from cache) |
| `/api/dcf-assumptions` | POST | Local-dev only: save project-level company DCF assumptions; deployed UI falls back to browser-local storage |
| `/api/historical?symbol=AAPL` | GET | Historical price + PE + percentile data |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FINNHUB_API_KEY` | Yes | Finnhub API key (PE/PB/ROE + EPS fallback) |
| `ALPHA_VANTAGE_API_KEY` | Yes | Alpha Vantage API key (historical EPS + DCF supplemental fallback) |
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

- 🔍 **美国上市市值前100追踪** — 按市值刷新，覆盖超大盘美股和 ADR，包括 NVDA、GOOGL、AAPL、MSFT、AMZN、AVGO、TSM 等
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

### 最近优化（2026-05-27）

这次更新把 DCF 数据链路改成“SEC 主源 + Alpha Vantage 补充层”，在不伪造数据的前提下补齐绝大多数缺口：

- **SEC 仍是主口径**：`scripts/fetch_sec_dcf_fundamentals.py` 继续优先使用 SEC `companyfacts`，并保留字段级期间信息。自由现金流来自最近年报；现金、总债务、净债务来自最近披露期；总股本来自最近披露期。
- **Alpha Vantage 只做补缺**：新增 `scripts/enrich_dcf_alpha_vantage.py`，只在 SEC 缺字段时调用 Alpha Vantage `CASH_FLOW`、`BALANCE_SHEET`、`OVERVIEW`，不会覆盖 SEC 已有值。
- **来源透明**：所有补充字段都会写入 `supplementalSources`，页面会显示补充来源，例如 `Alpha Vantage supplemental`，避免把补充数据误认为 SEC 原始数据。
- **DCF 覆盖率提升**：补充后 DCF 输入覆盖率提升到 **99/100 家公司**，`BAC` 已补回完整记录，目前仅 `ISRG` 仍缺可支持的总债务 / 净债务字段。
- **中文术语优化**：中文页面不再直接显示 `FCF`，统一改为“自由现金流”，包括来源、图例、现值和计算说明。
- **DCF 页面更适合小白**：新增“输入、假设、结果”三段式解释，问号悬停说明也扩展为“是什么、为什么重要、调高/调低会怎样”；线上环境不能写项目文件时，保存公司默认假设会自动落到当前浏览器，下次在同一设备打开该公司会继续使用。

### 最近优化（2026-05-21）

这次更新把公司池刷新为最新美国上市市值前100，并让估值数据管线继续保持可部署、可复用：

- **市值前100刷新**：`DEFAULT_TICKERS` 和所有数据脚本已同步到新的美股上市公司市值前 100 名单，新增 SPCX、ETN，并从默认股票池移除 ISRG、UBER。
- **旧公司清理**：每日行情合并、历史缓存和 EPS 缓存现在只保留当前跟踪名单，避免旧的前100成分在刷新后混回页面。
- **当前数据刷新**：已刷新 100 家公司 + 26 个指数的 Twelve Data 历史月线和每日行情缓存。新增成分 SPCX、ETN 需要在下一次数据刷新后补齐本地缓存。
- **日志脱敏**：后续脚本遇到限额或错误提示时，会隐藏 API key。
- **公司总览修复**：BRK-B、INTC 在供应商 PE 字段缺失时，会用“最新股价 ÷ 最新滚动 4 季度 EPS”计算 PE(TTM)，因此市盈率和 10 年 PE 百分位不再空白。
- **BRK-B 市值补齐**：当缓存市值缺失时，使用 Finnhub `marketCapitalization` 补齐，并按百万美元口径转换成展示用美元市值。
- **PE 每日刷新**：`fetch_quotes.py` 保存每日行情后会继续执行 `calculate_pe_history.py`，确保 PE(TTM)、10 年百分位、5 年百分位、全历史百分位和 10 年区间统计每天更新。
- **公司详情页 PE 指标口径**：详情页下方 8 个指标框明确作为 PE 估值统计，只跟随 PE 图的 1Y/3Y/5Y/10Y/20Y/MAX 区间变化，切到股价或市值图时不再误变。
- **PE 图专属双向联动**：右侧“市盈率百分位走势”只在主图为市盈率时展示；PE 双图 hover 时，两张图都会显示同一月份的竖线、圆点和数据框。
- **详情页图表说明优化**：联动数据框在靠近图表右边缘时会留在图表内；PE 百分位走势会按当前选择区间重新计算，不再复用固定缓存百分位。
- **对比分析交互优化**：对比分析支持 MAX/20Y/10Y/5Y/3Y/1Y 区间选择、PE/股价指标切换、共同日期对齐、X 轴时间显示，并缩窄右侧当前横截面区域。
- **添加对比公司入口**：“中位百分位”卡片已替换成添加对比公司的搜索下拉框，避免与当前 PE/股价趋势图口径不一致。
- **指数 / ETF 估值修复**：指数估值只使用 EODHD 直给字段，包括 PE、Forward PE、PB、股息率、费率、资产规模等；供应商没有给的数据不会伪造。
- **移除 Yahoo 依赖**：运行代码和依赖清单已移除 `yahoo-finance2`，旧 Yahoo 备用脚本也已删除，避免再次遇到访问限制。
- **跨平台构建脚本**：Vercel 预构建数据复制改为 `scripts/prebuild-api-data.mjs`，Windows 本地开发不再需要 Bash；npm scripts 直接调用本地 Node 入口，`clean` 脚本也不再使用 `rm -rf`。
- **验证结果**：已在 WSL2 Node.js 22 环境通过 `npm run test`、`npm run lint` 和 `npm run build`。

### PE 百分位计算方法

核心指标「10年PE百分位」的计算流程：

1. **滚动 TTM EPS**：每个月取最近 4 个季度的已报告 EPS 之和
2. **月度 PE(TTM)**：月末收盘价 ÷ 滚动 TTM EPS
3. **百分位排名**：当前 PE 在过去 10 年所有月度 PE 中的排名位置
4. **估值判断**：≤25% 低估 · 25-75% 中性 · ≥75% 高估

额外指标：5年百分位、10年PE最小/最大/中位数、10年区间涨跌幅

覆盖率（2026-05-21 刷新后）：**92/100 家公司**有 PE 历史，**94% 月度数据点覆盖**。剩余 8 家等待下一次 Alpha Vantage EPS 每日额度恢复后补齐。

### 数据源架构

```
新浪财经 API（主数据源）    → 价格、名称、PE(TTM)、市值、OHLCV（免费无限制，国内直连）
Finnhub API（估值补充）     → Forward PE、PB、ROE、52周高低、Beta、市值补齐
Twelve Data API（历史数据）  → 20年月线 OHLCV（免费，8次/分钟，800次/天）
Alpha Vantage API（EPS + DCF补缺） → 季度/年度 EPS；补充 SEC 缺失的 DCF 现金流、债务和股本字段
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
| **DCF 补缺** | SEC DCF 刷新后按需运行 | `enrich_dcf_alpha_vantage.py` | 只补 SEC 缺失字段，并标记 `supplementalSources` |

### 快速开始

```bash
git clone https://github.com/LYaCong/us-stock-valuation-platform.git
cd us-stock-valuation-platform
npm install
cp .env.example .env.local   # 编辑 .env.local 添加你的 API keys
npm run dev
```

Windows PowerShell 如果因为执行策略拦截 `npm`，可以改用 `npm.cmd`，例如 `npm.cmd run dev`。如果这个项目之前在 WSL 里装过依赖，切回 Windows 后 Vite 可能提示缺少 `@rollup/rollup-win32-x64-msvc`，在 Windows 侧运行一次 `npm.cmd install` 即可恢复平台可选依赖。成功标志：`node_modules/@rollup/rollup-win32-x64-msvc` 存在。

### 部署（Vercel）

1. 在 [Vercel](https://vercel.com) 导入 GitHub 仓库
2. 框架自动识别为 **Vite**
3. 点击部署即可

`vercel-build` 脚本会自动：复制缓存数据 → `api/_data/` → 构建前端 → 上线

本地 Windows、WSL 和 Vercel 都使用同一个 Node 预构建脚本；npm scripts 直接调用本地 Node 入口，减少 WSL/Windows `.bin` 链接差异带来的问题；`npm run clean` 遵守安全规则，不会递归批量删除非空目录。

### 开源协议

MIT
