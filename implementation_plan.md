# Implementation Plan - US Stock Valuation Platform Refactoring

## Phase 1: Data Contract & Type Safety
**Goal:** Establish a unified data contract between backend and frontend. Remove forced defaults (null -> 0).

- **[MODIFY]** [types.ts](file:///D:/Obsidian数字大脑/数字大脑/开发项目/us-stock-valuation-platform/src/types.ts): Update interfaces to allow `null | undefined` for financial metrics.
- **[MODIFY]** [server.ts](file:///D:/Obsidian数字大脑/数字大脑/开发项目/us-stock-valuation-platform/server.ts): Update API response structures to preserve `null`.
- **[MODIFY]** [valuationService.ts](file:///D:/Obsidian数字大脑/数字大脑/开发项目/us-stock-valuation-platform/src/services/valuationService.ts): Remove default `0` assignments in mappers.

## Phase 2: Historical Data Chain & Realism
**Goal:** Fix the historical data flow and ensure the UI only displays what actually exists.

- **[MODIFY]** [financeService.ts](file:///D:/Obsidian数字大脑/数字大脑/开发项目/us-stock-valuation-platform/src/services/financeService.ts): Refactor `fetchHistorical` to handle broader data fields and error states.
- **[MODIFY]** [App.tsx](file:///D:/Obsidian数字大脑/数字大脑/开发项目/us-stock-valuation-platform/src/App.tsx): (DetailsView/IndexDetailsView)
    - Add logic to hide charts if relevant historical data is missing.
    - Display "N/A" for missing fields.

## Phase 3: Real Comparison Data
**Goal:** Purge mock data generators and use real cached history.

- **[DELETE]** [generateHistoricalData.ts](file:///D:/Obsidian数字大脑/数字大脑/开发项目/us-stock-valuation-platform/src/utils/generateHistoricalData.ts).
- **[MODIFY]** [App.tsx](file:///D:/Obsidian数字大脑/数字大脑/开发项目/us-stock-valuation-platform/src/App.tsx): (ComparisonView) Update to fetch and align real historical sequences.

## Phase 4: Component Decoupling
**Goal:** Break down the monolithic `App.tsx` into a modular structure.

- **[NEW]** `src/components/`: Extract view-level components (`Overview`, `Details`, `Comparison`, etc.).
- **[NEW]** `src/components/common/`: Extract atomic UI components (`Metric`, `StatCard`, etc.).
- **[NEW]** `src/hooks/`: Extract logic for valuations and historical data.

## Phase 5: Robust DCF Refactoring
**Goal:** Add safety rails to the DCF calculator and handle missing data gracefully.

- **[NEW]** [dcfCalculator.ts](file:///D:/Obsidian数字大脑/数字大脑/开发项目/us-stock-valuation-platform/src/utils/dcfCalculator.ts): Pure calculation logic with validation.
- **[MODIFY]** `src/components/DcfView.tsx`: Add missing-data indicators and validation error UI.

## Phase 6: Backend Refinement & Testing
**Goal:** Clean up the backend and add verification.

- **[NEW]** `server/services/`: Extract service layers.
- **[NEW]** `server/mappers/`: Extract mappers.
- **[NEW]** `src/__tests__/`: Basic unit tests.

## Verification Plan

### Automated Verification
- `npm run lint` for type checking.
- New unit tests for DCF calculations.

### Manual Verification
1. Verify "N/A" display for missing data in Detail cards.
2. Verify Comparison page uses the same data as the Detail page.
3. Verify DCF validation prevents invalid inputs (e.g., Terminal Growth >= WACC).
