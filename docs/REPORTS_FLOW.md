# Reports & Power BI front-end flow

This document describes how the front end retrieves each client’s report and folder after login, and how it uses the embed-token API with or without `clientCode`.

## Backend dependency

- **GET /api/reports/available** (no path parameter) must be implemented and return the current user’s report config(s).
- **GET /api/powerbi/embed-token/monthly** (and other report types) must accept an optional `clientCode` and, when it is omitted, use the user’s JWT `client_code` claim.
- The user’s JWT must include the **client_code** claim (e.g. `"AU-001"`) for the client user, set at login or via claims transformation, so that when the front end does not send `clientCode`, the embed-token endpoint still uses the correct folder/report.

---

## Front-end flow

### 1. Get available reports and folder (client context)

- **Call:** `GET /api/reports/available` (no path parameter).
- **When:** After login, when the user opens the Reports area (e.g. Client Reports page). The front end calls `getAvailableReportsConfig()` which hits this endpoint.
- **Response usage:**
  - **clientCode** (e.g. `"AU-001"`) → used as the folder name and as the client identifier for all reporting APIs.
  - **blobFolderPath** → used for blob/dataset in that folder (backend uses this when generating/refreshing).
  - **powerBIReportId** / **powerBIDatasetId** → use when the UI or backend needs them directly (e.g. for embed or refresh).
- For a **client** user, the backend typically returns a single item (or the front end takes the first / matching entry). For an **accountant** user, the backend may return multiple configs (one per client they can access).

### 2. Get Power BI embed token

- **Call:** `GET /api/powerbi/embed-token/monthly?period=2026-01` **without** `clientCode`, or with `clientCode=AU-001` (same value as from step 1).
- **Behaviour:**
  - **Without `clientCode`:** Backend uses the authenticated user’s **JWT `client_code` claim** to resolve the client and return the correct embed token. Ensure the JWT is populated with `client_code` for client users.
  - **With `clientCode`:** Backend uses the given client (e.g. for accountants viewing a specific client). The front end passes the same `clientCode` from step 1 (or from the selected client in the accountant portal).
- The front end uses `getEmbedToken(reportType, period, clientCode?)` from `reportService`: omit `clientCode` to rely on JWT, or pass it for explicit client targeting.

### 3. JWT and login

- **client_code claim:** For the “no `clientCode`” embed-token flow to work, the backend must set the **client_code** claim on the JWT (e.g. from the user’s linked client at login or via claims transformation).
- The front end already stores `user.clientCode` from the login response (`data.user.clientCode` or `data.user.clientId`). This is used as a fallback when the report config from step 1 is not yet available or when the backend does not return a config. The backend should still set the JWT claim so that embed-token works even when the front end does not send `clientCode`.

---

## Summary

| Step | Action | Notes |
|------|--------|--------|
| 1 | Call `GET /api/reports/available` (no path param) | Use `clientCode`, `blobFolderPath`, and optionally `powerBIReportId` / `powerBIDatasetId` from the response. |
| 2 | Call `GET /api/powerbi/embed-token/monthly?period=YYYY-MM` with or without `clientCode` | Omit `clientCode` to use JWT `client_code`; or pass `clientCode` (e.g. from step 1 or selected client). |
| 3 | Ensure JWT has `client_code` | Backend sets this at login or via claims transformation so embed-token can resolve the client when `clientCode` is not sent. |
