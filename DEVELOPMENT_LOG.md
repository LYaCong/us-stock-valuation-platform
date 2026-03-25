# US Stock Valuation 项目开发日志

## 1. 项目概述

本项目是一款专注于美股及指数估值分析的 Web 应用程序，旨在为投资者提供直观的市盈率（PE）百分位走势、DCF 估值模型以及多维度对比功能。

### 1.1 开发背景
在美股投资中，投资者常面临"估值难"的问题：单纯看股价无法判断贵贱，而专业的金融终端（如 Bloomberg, Wind）门槛过高。本项目旨在打造一款轻量级、可视化、易上手的估值工具，帮助普通投资者通过历史百分位和现金流贴现（DCF）模型，快速判断当前市场及个股的风险与机会。

### 1.2 核心功能
- **公司估值总览**：实时展示 100 家核心美股公司的 PE (TTM)、PE (Forward)、PB 等关键指标，并根据历史百分位自动标注"低估/高估"状态。
- **指数估值分析**：涵盖标普 500、纳斯达克 100 等主流指数及行业指数的详细估值水位分析。
- **可视化时序图表**：提供近 20 年的 PE 走势图及百分位趋势图，支持多时间维度（1Y, 5Y, 10Y, MAX）切换。
- **DCF 估值模型**：内置交互式现金流贴现模型，用户可自定义 WACC、永续增长率等核心假设，实时计算内在价值。
- **多维度对比分析**：支持最多 5 家公司的估值走势同框对比，直观展现行业内公司的相对估值水平。
- **多语言与个性化**：支持中英文一键切换，并提供深色/浅色两种主题模式。

---

## 2. 技术栈

### 前端
- **框架**: React 19 + TypeScript
- **构建工具**: Vite 6
- **样式**: Tailwind CSS 4
- **状态管理**: React useState/useEffect（本地状态）
- **路由**: 无客户端路由（使用标签页切换）
- **组件结构**: 单文件组件（App.tsx 包含所有组件）
- **API 调用**: fetch API + 自定义服务层（financeService.ts、valuationService.ts）
- **图表**: Recharts
- **动画**: Motion（Framer Motion）
- **图标**: Lucide React
- **国际化**: 自定义翻译系统（中英文）

### 后端
- **框架**: Express.js + TypeScript
- **运行时**: Node.js（通过 tsx 运行 TypeScript）
- **数据源**: Yahoo Finance API（yahoo-finance2 库）
- **缓存机制**: 本地 JSON 文件（stock_cache/daily_quotes.json）
- **数据抓取**: Python 脚本（scripts/fetch_quotes.py）
- **API 设计**: RESTful API，共 5 个端点
- **认证机制**: 无（适合原型阶段）
- **中间件**: Express 基础中间件 + Vite 开发中间件

---

## 3. 项目结构

```
us-stock-valuation-platform/
├── src/
│   ├── App.tsx                  # 主应用组件（包含所有 UI 组件）
│   ├── main.tsx                 # 入口文件
│   ├── index.css                # 样式文件（Tailwind）
│   ├── data/
│   │   └── mockData.ts          # 模拟数据和类型定义
│   └── services/
│       ├── financeService.ts    # 金融数据服务
│       └── valuationService.ts  # 估值数据服务
├── server.ts                    # Express 后端服务器
├── scripts/
│   └── fetch_quotes.py          # Python 数据抓取脚本
├── stock_cache/
│   └── daily_quotes.json        # 每日缓存数据
├── package.json                 # 项目配置和依赖
├── vite.config.ts               # Vite 配置
├── tsconfig.json                # TypeScript 配置
└── index.html                   # HTML 入口文件
```

### API 端点
- `GET /api/valuation?tickers=` - 公司估值数据（基于缓存）
- `GET /api/index-valuations` - 指数估值数据（基于缓存）
- `GET /api/quotes?symbols=` - 实时报价
- `GET /api/fundamentals?symbol=` - 基本面数据
- `GET /api/historical?symbol=` - 历史数据

### 数据流程
```
Python 脚本（每天运行一次）
  ├── 调用 Yahoo Finance 获取价格/PE/PB
  ├── 调用 Yahoo Finance 获取历史价格
  ├── 计算百分位
  └── 写入 stock_cache/daily_quotes.json

后端 Express（常驻）
  └── 读取缓存文件 → 返回 JSON

前端 React
  └── 调用 /api/valuation → 渲染 UI
```

---

## 4. 开发历程

### 第一阶段：基础架构搭建（2026-03-24）
- 建立了响应式的侧边栏/顶部导航布局。
- 实现了多页签切换逻辑（总览、详情、对比、指数、DCF、设置）。
- 引入了中英文双语切换系统（i18n 自研轻量方案）。

### 第二阶段：数据层与估值逻辑（2026-03-24）
- 设计了 `CompanyValuation` 和 `IndexValuation` 数据接口。
- 实现了 PE 百分位计算逻辑，用于判断当前股价处于历史的哪个水位（低估/高估）。
- 集成了 DCF（现金流贴现）模型，支持用户手动调整假设参数（WACC、增长率等）。

### 第三阶段：UI/UX 深度优化（2026-03-24）
- **导航栏重构**：解决了在小屏幕或中英文切换时按钮掉行的问题。
- **主题系统**：实现了深色/浅色模式切换，并将默认模式设为浅色。
- **卡片系统统一**：将指数卡片的视觉风格与公司卡片完全对齐，提升了品牌一致性。

### 第四阶段：接入真实数据与性能优化（2026-03-25）
- 接入 Yahoo Finance 真实数据
- 修复前端数据加载问题
- 优化 API 性能（Python 预计算）

---

## 5. 遇到的问题及解决方案

### 问题 A：导航栏按钮换行导致排版错乱
- **现象**：当窗口变窄或切换到英文（字符较长）时，"偏好设置"等按钮会掉到第二行，遮挡下方内容。
- **解决**：
  - 使用 `flex-nowrap` 强制单行排列。
  - 为导航容器添加 `overflow-x-auto` 和 `scrollbar-hide`，支持横向滑动。
  - 为按钮添加 `min-w-max` 和 `whitespace-nowrap`，确保文字不被挤压。

### 问题 B：中文模式下公司名称显示不全或为英文
- **现象**：部分公司在中文模式下依然显示英文全称，且部分动态生成的公司没有中文对应。
- **解决**：
  - 在 `mockData.ts` 中建立了完整的 `tickerNames` 映射表，补全了 100 家真实公司的中文译名。
  - 优化了渲染逻辑：`lang === 'zh' ? (company.nameZh || company.name) : company.name`。

### 问题 C：指数卡片信息过载且布局不统一
- **现象**：指数卡片包含"数据区间"字段，导致 4 列布局下中文指标（如"市盈率 TTM"）显示非常拥挤，且视觉风格与公司卡片不一致。
- **解决**：
  - **精简内容**：移除了卡片上的"数据区间"显示。
  - **重构布局**：将 4 列改为 3 列，增加单个指标的宽度。
  - **视觉对齐**：复制了公司卡片的 Hover 阴影、彩色状态标签（Status Label）和右下角背景装饰样式。

### 问题 D：主题模式默认偏好
- **现象**：初始版本默认为深色模式，部分用户反馈浅色模式更适合长时间阅读财务数据。
- **解决**：将 `useState<Theme>('light')` 设为初始状态。

### 问题 E：前端数据加载后显示 N/A/mock 数据（2026-03-25）
- **现象**：API 工作正常（curl 测试返回正确数据），但前端始终显示 mock 数据。
- **根因**：
  1. **Vite 代理端口不匹配**：`vite.config.ts` 代理指向 `localhost:3001`，但服务器实际运行在 `localhost:3000`。
  2. **useMemo 依赖数组缺失**：`filteredCompanies` 的 `useMemo` 缺少 `companies` 依赖，导致状态更新后组件不重新渲染。
  3. **状态 vs 常量混用**：`filteredIndices` 直接使用了常量 `INDICES` 而非状态 `indices`。
- **解决**：
  1. 修改 `vite.config.ts` 代理端口：`3001` → `3000`。
  2. 修改 `filteredCompanies` 依赖数组：添加 `companies`。
  3. 修改 `filteredIndices`：使用 `indices` 状态并添加依赖。

### 问题 F：API 请求时间过长（2026-03-25）
- **现象**：20 个股票请求需要 8+ 秒，26 个指数请求也很慢。
- **根因**：后端每次请求都实时调用 Yahoo Finance 获取历史数据计算 PE 百分位：
  - `/api/valuation`：100 个股票 × 1 次 API 调用 = 100 次串行请求
  - `/api/index-valuations`：26 个指数 × 2 次 API 调用 = 52 次串行请求
- **解决**：
  1. 修改 Python 脚本 `fetch_quotes.py`，添加百分位预计算功能。
  2. 扩展指数列表到 26 个，与后端保持一致。
  3. 修改后端两个端点，改为读取缓存文件而非实时调用 API。
- **效果**：
  - 公司数据：8 秒 → 0.06 秒
  - 指数数据：很慢 → 0.027 秒

### 问题 G：刷新页面时显示 mock 数据（2026-03-25）
- **现象**：数据加载需要时间，加载完成前显示 mock 数据。
- **解决**：
  1. 修改初始状态为空数组而非 mock 数据。
  2. 添加 loading 状态显示（旋转动画 + 提示文字）。
  3. 修改 `selectedCompany` 处理空数组情况。

---

## 6. 依赖关系

### 前端依赖
- **react**: ^19.0.0 - 前端 UI 框架
- **react-dom**: ^19.0.0 - React DOM 渲染器
- **recharts**: ^3.8.0 - 图表库
- **lucide-react**: ^0.546.0 - 图标库
- **motion**: ^12.23.24 - 动画库
- **clsx**: ^2.1.1 - 条件类名工具
- **tailwind-merge**: ^3.5.0 - Tailwind 类名合并
- **date-fns**: ^4.1.0 - 日期处理库

### 后端依赖
- **express**: ^4.22.1 - Web 服务器框架
- **yahoo-finance2**: ^3.13.2 - Yahoo Finance API 客户端
- **dotenv**: ^17.2.3 - 环境变量管理
- **@google/genai**: ^1.29.0 - Google Gemini AI API

### 构建工具
- **vite**: ^6.2.0 - 前端构建工具
- **@vitejs/plugin-react**: ^5.0.4 - React 插件
- **@tailwindcss/vite**: ^4.1.14 - Tailwind CSS Vite 插件
- **typescript**: ~5.8.2 - TypeScript 编译器
- **tsx**: ^4.21.0 - TypeScript 执行器

---

## 7. 运行与部署

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build

# 生产运行
npm start

# 更新缓存数据
python3 scripts/fetch_quotes.py
```

### 环境变量
- `GEMINI_API_KEY`: Gemini AI API 密钥
- `APP_URL`: 应用 URL

---

## 8. 后续规划

- **更多估值模型**：计划加入 PB-ROE 估值模型及股息率估值模型。
- **用户自选股**：增加本地存储功能，允许用户保存关注的股票列表。
- **代码质量**：加强 TypeScript 类型安全，减少 any 类型使用。
- **测试覆盖**：添加单元测试和集成测试。
- **认证机制**：添加 JWT 或 OAuth2 认证。
- **数据库集成**：考虑添加 PostgreSQL 或 MongoDB。

---

**最后更新**：2026-03-25
**记录人**：AI 助手
