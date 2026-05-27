# Archived modules (v2)

Code under `src/_archived/` is **not part of the production app** for v2 (May 2026). It is kept for reference and possible restoration.

## Contents

| Path | Former location | Description |
|------|-----------------|-------------|
| `property/` | `src/pages`, `components`, `hooks`, `services`, `types` | Domain property market dashboard |
| `features/insights/` | `src/features/insights/` | Blob upload, template matching, canonical plans |
| `features/modeling-studio/` | `src/features/modeling-studio/` | Data studio / model approval |
| `portals/accountant/InsightsPage.tsx` | Re-export shim for Insights |
| `services/aiService.ts` | Legacy AI helper (if unused by active app) |

## Active product (v2)

- **Reports** with **Generate AI Insights** (`POST /reports/ai-insights`) — insights based on embedded Power BI report context only.
- See `docs/AI_REPORT_INSIGHTS.md` for the target Copilot + OpenAI architecture.

## Restore

1. Move folders back to their original `src/` paths.
2. Re-add routes in `src/core/routes.tsx` and `ROUTES` in `src/core/constants.ts`.
3. Re-add sidebar items in client/accountant layouts.
4. Remove `src/_archived` from `tsconfig.app.json` `exclude` if compiling archived code.
