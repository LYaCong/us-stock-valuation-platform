<div align="center">

# 📊 US Stock Valuation Platform

**Real-time US stock valuation analysis with AI-powered insights**

[English](#features) · [中文](#功能特性)

</div>

---

## Features

- 🔍 **100+ US Stocks Tracking** — Covers mega-cap, large-cap, and ADRs including NVDA, AAPL, GOOGL, MSFT, AMZN, TSM, BABA, etc.
- 📈 **26 Major Indices & ETFs** — SPY, QQQ, DIA, IWM, sector ETFs (XLK, XLF, XLV...), and thematic ETFs (ARKK, KWEB, GDX...)
- 📐 **Multi-dimensional Valuation** — PE (TTM/Forward), PB, PEG ratios, PE percentile ranking
- 📊 **Historical Trend Charts** — Visualize PE ratio trends over time with percentile reference lines
- 🤖 **AI-Powered Analysis** — Gemini AI integration for intelligent stock analysis and insights
- 🏷️ **Valuation Status Indicators** — Automatic Low / Neutral / High classification based on PE thresholds
- 💹 **Market Cap & Price Display** — Real-time market data via Sina Finance API (domestic China direct access)
- 🎨 **Modern UI** — Built with React 19, Tailwind CSS 4, Recharts, and smooth animations
- 🚀 **One-Click Deploy** — Vercel deployment with auto CI/CD

## Tech Stack

| Category | Technology |
|----------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS 4, Recharts |
| Backend | Vercel Serverless Functions |
| Primary Data Source | Sina Finance API (新浪财经) |
| Supplement Data Source | Yahoo Finance API (optional, for Forward PE / PB / ROE) |
| AI | Google Gemini API (`@google/genai`) |
| Build | Vite 6 |
| Deployment | Vercel (CI/CD via GitHub push) |
| Testing | Node.js built-in test runner |

## Live Demo

🌐 **[https://us-stock-valuation-platform.vercel.app](https://us-stock-valuation-platform.vercel.app)**

## Quick Start

### Prerequisites

- Node.js >= 18
- A Gemini API key (optional, for AI analysis features)

### Installation

```bash
# Clone the repository
git clone https://github.com/LYaCong/us-stock-valuation-platform.git
cd us-stock-valuation-platform

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local and add your GEMINI_API_KEY

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
│   ├── fetch_quotes.py              # Daily quotes fetcher (Sina Finance)
│   ├── fetch_history.py             # Historical data fetcher
│   └── prebuild-api-data.sh         # Copy cache to api/_data/ for Vercel
├── stock_cache/                     # Cached data files
│   ├── daily_quotes.json
│   └── historical.json
├── vercel.json                      # Vercel deployment config
├── vite.config.ts
└── tsconfig.json
```

## How It Works

1. **Data Fetching** — Python script (`scripts/fetch_quotes.py`) fetches data from **Sina Finance API** (primary, domestic direct access, 100% success rate) and optionally supplements with Yahoo Finance (forwardPE, PB, ROE)
2. **Serverless API** — Vercel Serverless Function (`api/[[...path]].ts`) serves cached data via REST endpoints. Data is bundled at build time via `vercel-build` script
3. **PE Percentile Calculation** — Computes PE percentile using empirical thresholds based on S&P 500 historical distribution
4. **Valuation Classification** — Classifies stocks as Low/Neutral/High based on current PE thresholds
5. **Visualization** — Renders interactive charts showing PE trends, percentile bands, and comparison data
6. **AI Insights** — (Optional) Uses Gemini API to provide AI-generated analysis and commentary

## Data Source Architecture

```
┌─────────────────┐     ┌──────────────────┐
│  Sina Finance    │────▶│  Primary Source   │  Price, Name, PE(TTM), Market Cap,
│  (新浪财经 API)  │     │  (100% coverage)  │  Change%, OHLCV
└─────────────────┘     └──────────────────┘

┌─────────────────┐     ┌──────────────────┐
│  Yahoo Finance   │────▶│  Supplement       │  Forward PE, PB, ROE
│  (yfinance)      │     │  (optional)       │  (env: YAHOO_ENABLED)
└─────────────────┘     └──────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │  stock_cache/     │
                    │  (local JSON)     │──▶ Vercel build ──▶ Online
                    └──────────────────┘
```

### Update Data Flow

```bash
# 1. Fetch fresh data (Sina primary + Yahoo supplement)
python3 scripts/fetch_quotes.py

# 2. Copy to api/_data/ for Vercel
bash scripts/prebuild-api-data.sh

# 3. Push to GitHub → Vercel auto-deploys
git add -A && git commit -m "update data" && git push
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/valuation?tickers=AAPL,NVDA` | GET | Company valuations with PE/PB/PEG |
| `/api/index-valuations` | GET | Index & ETF valuations |
| `/api/quotes?symbols=AAPL` | GET | Real-time quotes (from cache) |
| `/api/fundamentals?symbol=AAPL` | GET | Company fundamentals (from cache) |
| `/api/historical?symbol=AAPL` | GET | Historical price & PE data |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | No | Google Gemini API key for AI analysis features |
| `YAHOO_ENABLED` | No | Enable Yahoo Finance supplement (`true`/`false`, default: `true`) |

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
- 📐 **多维度估值分析** — PE（TTM/Forward）、PB、PEG 估值倍数，PE 百分位排名
- 📊 **历史趋势图表** — 可视化 PE 比率历史走势，附带百分位参考线
- 🤖 **AI 智能分析** — 集成 Gemini AI，提供智能股票分析和洞察
- 🏷️ **估值状态标识** — 基于历史百分位自动划分 低估 / 中性 / 高估
- 💹 **市值与价格展示** — 通过新浪财经 API 获取实时市场数据（国内直连，100% 成功率）
- 🎨 **现代化界面** — 基于 React 19、Tailwind CSS 4、Recharts 构建，流畅动画效果
- 🚀 **一键部署** — Vercel 部署，GitHub 推送自动上线

### 数据源架构

```
新浪财经 API（主数据源）  → 价格、名称、PE(TTM)、市值、涨跌幅、OHLCV（国内直连，免费无限制）
Yahoo Finance（可选补充） → Forward PE、PB、ROE（通过 YAHOO_ENABLED 环境变量控制）
          ↓
     本地 JSON 缓存
          ↓
   Vercel 构建时打包 → 在线访问
```

### 更新数据

```bash
python3 scripts/fetch_quotes.py        # 抓取最新数据（新浪主源 + Yahoo 可选补充）
bash scripts/prebuild-api-data.sh       # 复制缓存到 api/_data/
git add -A && git commit -m "update data" && git push   # 推送后 Vercel 自动部署
```

### 快速开始

```bash
git clone https://github.com/LYaCong/us-stock-valuation-platform.git
cd us-stock-valuation-platform
npm install
cp .env.example .env.local   # 编辑 .env.local 添加你的 GEMINI_API_KEY
npm run dev
```

应用将在 `http://localhost:3000` 启动。

### 项目架构

```
├── api/                 # Vercel Serverless API
│   ├── [[...path]].ts   # 统一 API 入口
│   └── _data/           # 构建时生成的数据文件
├── server/              # 本地开发用后端
│   ├── services/        # 数据服务
│   └── mappers/         # 数据映射
├── src/
│   ├── components/      # UI 组件
│   ├── hooks/           # React Hooks
│   ├── services/        # API 客户端
│   └── utils/           # 工具函数
├── scripts/             # 数据抓取脚本
├── stock_cache/         # 缓存数据
└── vercel.json          # Vercel 部署配置
```

### API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/valuation?tickers=AAPL` | GET | 公司估值数据 |
| `/api/index-valuations` | GET | 指数估值数据 |
| `/api/quotes?symbols=AAPL` | GET | 实时报价（缓存） |
| `/api/fundamentals?symbol=AAPL` | GET | 基本面数据（缓存） |
| `/api/historical?symbol=AAPL` | GET | 历史数据 |

### 工作原理

1. **数据获取** — Python 脚本从**新浪财经 API** 获取主数据（国内直连、免费无限制、100% 成功率），Yahoo Finance 作为可选补充
2. **Serverless API** — Vercel Serverless Function 提供缓存数据接口，构建时打包数据文件
3. **PE 百分位计算** — 基于 S&P 500 历史分布的经验阈值计算 PE 百分位
4. **估值分类** — 根据当前 PE 阈值，划分为低估 / 中性 / 高估
5. **可视化** — 渲染交互式图表，展示 PE 趋势、百分位带和对比数据
6. **AI 洞察** — （可选）使用 Gemini API 提供 AI 生成的分析和评论

### 部署（Vercel）

1. 在 [Vercel](https://vercel.com) 导入 GitHub 仓库
2. 框架自动识别为 **Vite**
3. 点击部署即可

`vercel-build` 脚本会自动：复制缓存数据 → `api/_data/` → 构建前端 → 上线

### 开源协议

MIT
