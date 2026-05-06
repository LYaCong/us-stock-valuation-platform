<div align="center">

# 📊 US Stock Valuation Platform

**Real-time US stock valuation analysis with AI-powered insights**

[English](#features) · [中文](#功能特性)

</div>

---

## Features

- 🔍 **100+ US Stocks Tracking** — Covers mega-cap, large-cap, and ADRs including NVDA, AAPL, GOOGL, MSFT, AMZN, TSM, BABA, etc.
- 📈 **26 Major Indices & ETFs** — SPY, QQQ, DIA, IWM, sector ETFs (XLK, XLF, XLV...), and thematic ETFs (ARKK, KWEB, GDX...)
- 📐 **Multi-dimensional Valuation** — PE (TTM/Forward), PB, PEG ratios, 10-year PE percentile ranking
- 📊 **Historical Trend Charts** — Visualize PE ratio trends over time with percentile reference lines
- 🤖 **AI-Powered Analysis** — Gemini AI integration for intelligent stock analysis and insights
- 🏷️ **Valuation Status Indicators** — Automatic Low / Neutral / High classification based on historical percentile
- 💹 **Market Cap & Price Display** — Real-time market data via Yahoo Finance API
- 🎨 **Modern UI** — Built with React 19, Tailwind CSS 4, Recharts, and smooth animations

## Tech Stack

| Category | Technology |
|----------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS 4, Recharts |
| Backend | Express.js, Vite Dev Server |
| Data Source | Yahoo Finance API (`yahoo-finance2`) |
| AI | Google Gemini API (`@google/genai`) |
| Build | Vite 6, tsx |

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

The app will be available at `http://localhost:5173` with the API server on port 3000.

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
us-stock-valuation-platform/
├── server.ts              # Express API server (Yahoo Finance proxy + PE percentile calc)
├── src/
│   ├── App.tsx            # Main application component
│   ├── types.ts           # TypeScript type definitions
│   ├── config/
│   │   └── tickers.ts     # Stock & index ticker lists
│   ├── services/
│   │   ├── financeService.ts    # Market data fetching
│   │   └── valuationService.ts  # Valuation calculation
│   ├── utils/
│   │   └── generateHistoricalData.ts
│   ├── data/              # Static data
│   ├── index.css          # Global styles
│   └── main.tsx           # Entry point
├── scripts/               # Utility scripts
├── vite.config.ts         # Vite configuration
└── tsconfig.json          # TypeScript configuration
```

## How It Works

1. **Data Fetching** — Fetches real-time quotes and fundamentals from Yahoo Finance API
2. **PE Percentile Calculation** — Computes 10-year historical PE percentile by analyzing monthly data
3. **Valuation Classification** — Classifies stocks as Low/Neutral/High based on their current PE relative to historical range
4. **Visualization** — Renders interactive charts showing PE trends, percentile bands, and comparison data
5. **AI Insights** — (Optional) Uses Gemini API to provide AI-generated analysis and commentary

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | No | Google Gemini API key for AI analysis features |
| `APP_URL` | No | Self-referential URL for callbacks |

## License

MIT

---

<div align="center">

## 功能特性

**实时美股估值分析平台，AI 驱动的投资洞察**

</div>

- 🔍 **100+ 美股追踪** — 覆盖超大盘、大盘股和 ADR，包括 NVDA、AAPL、GOOGL、MSFT、AMZN、TSM、BABA 等
- 📈 **26 个主流指数和 ETF** — SPY、QQQ、DIA、IWM，行业 ETF（XLK、XLF、XLV...）以及主题 ETF（ARKK、KWEB、GDX...）
- 📐 **多维度估值分析** — PE（TTM/Forward）、PB、PEG 估值倍数，10 年 PE 百分位排名
- 📊 **历史趋势图表** — 可视化 PE 比率历史走势，附带百分位参考线
- 🤖 **AI 智能分析** — 集成 Gemini AI，提供智能股票分析和洞察
- 🏷️ **估值状态标识** — 基于历史百分位自动划分 低估 / 中性 / 高估
- 💹 **市值与价格展示** — 通过雅虎财经 API 获取实时市场数据
- 🎨 **现代化界面** — 基于 React 19、Tailwind CSS 4、Recharts 构建，流畅动画效果

### 快速开始

```bash
git clone https://github.com/LYaCong/us-stock-valuation-platform.git
cd us-stock-valuation-platform
npm install
cp .env.example .env.local   # 编辑 .env.local 添加你的 GEMINI_API_KEY
npm run dev
```

应用将在 `http://localhost:5173` 启动，API 服务运行在 3000 端口。

### 工作原理

1. **数据获取** — 从雅虎财经 API 获取实时行情和基本面数据
2. **PE 百分位计算** — 通过分析 10 年月度数据计算历史 PE 百分位
3. **估值分类** — 根据当前 PE 在历史区间中的位置，划分为低估/中性/高估
4. **可视化** — 渲染交互式图表，展示 PE 趋势、百分位带和对比数据
5. **AI 洞察** — （可选）使用 Gemini API 提供 AI 生成的分析和评论

### 开源协议

MIT
