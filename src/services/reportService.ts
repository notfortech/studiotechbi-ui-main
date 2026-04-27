import { apiService } from "./api";

/** Response from GET /api/powerbi/embed-token/monthly (and variants). */
export interface EmbedTokenResponse {
  accessToken: string;
  embedUrl: string;
  reportId: string;
  period?: string;
}

export type ReportPeriodType =
  | "monthly"
  | "quarterly"
  | "biweekly"
  | "half-yearly"
  | "annually";

export const REPORT_PERIOD_TYPE_LABELS: Record<ReportPeriodType, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  biweekly: "Biweekly",
  "half-yearly": "Half-yearly",
  annually: "Annually",
};

export const DEFAULT_REPORT_PERIOD_TYPE: ReportPeriodType = "monthly";

export interface GenerateReportResponse {
  success: boolean;
  message?: string;
}

/**
 * Backend refresh: per-client when PowerBIDatasetId is set; workspace is optional (falls back to env POWERBI_WORKSPACE_ID).
 * Backend embed: per-client when PowerBIReportId is set; workspace from client or global PowerBI:WorkspaceId.
 */
/** Response from POST /api/reports/refresh/{clientCode}?period=YYYY-MM */
export interface ReportRefreshResponse {
  success: boolean;
  message?: string | null;
  error?: string | null;
  log?: string | null;
  datasetRefreshed: boolean;
  reportShouldRefresh: boolean;
}

export interface ReportPeriod {
  label: string;
  value: string;
}

/** Build list of month options (YYYY-MM) for the last N months */
export function getMonthOptions(count = 24): ReportPeriod[] {
  const options: ReportPeriod[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    options.unshift({
      label: d.toLocaleString("default", { month: "long", year: "numeric" }),
      value,
    });
  }
  return options;
}

/** Client from GET /api/reports/accountant-clients (when accounting firm toggle is on). */
export interface AccountantClient {
  clientId: string;
  clientCode: string;
  clientName: string;
}

/** Single report config from GET /api/reports/available (no path param). Backend returns list for current user. */
export interface AvailableReportConfig {
  /** Client code (e.g. "AU-001"); use as folder name. */
  clientCode: string;
  /** Blob/dataset path for this client's folder. */
  blobFolderPath: string;
  /** Power BI report ID when backend has configured embed. */
  powerBIReportId?: string;
  /** Power BI dataset ID when backend has configured embed. */
  powerBIDatasetId?: string;
  /** Optional period list (YYYY-MM) for this client. */
  periods?: string[];
}

export interface AvailableReportsResponse {
  periods?: string[];
  reports?: ReportPeriod[];
  /** New shape: list of report configs per client (backend returns only allowed for current user). */
  items?: AvailableReportConfig[];
}

/** Dataset filter target used in PowerBIEmbed */
export const POWERBI_MONTH_FILTER_TARGET = {
  table: "Transactions",
  column: "YearMonth",
} as const;

/** When true, monthly subscribers can refresh only once per month; after refresh, button is disabled until next month */
export const MONTHLY_REFRESH_LIMIT_ENABLED =
  typeof process !== "undefined" && process.env?.REACT_APP_MONTHLY_REFRESH_LIMIT !== "false";

const LAST_REFRESH_STORAGE_PREFIX = "reportRefresh_";

/** Keys used for report/embed cache that should be cleared on login/logout */
const REPORT_CACHE_KEY_PREFIXES = [LAST_REFRESH_STORAGE_PREFIX];

/**
 * Clear any cached report/embed state (e.g. last refresh month, embed URL/token if ever stored).
 * Call after login and after logout so the new session never reuses the previous session's data.
 */
export function clearReportEmbedCache(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && REPORT_CACHE_KEY_PREFIXES.some((p) => key.startsWith(p))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Last refresh month (YYYY-MM) for this client, or null if never refreshed this month */
export function getLastRefreshMonth(clientCode: string): string | null {
  try {
    const key = LAST_REFRESH_STORAGE_PREFIX + (clientCode || "default");
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Record that report was refreshed now (call after successful refresh) */
export function setLastRefreshMonth(clientCode: string): void {
  try {
    const key = LAST_REFRESH_STORAGE_PREFIX + (clientCode || "default");
    localStorage.setItem(key, getCurrentMonthKey());
  } catch {
    // ignore
  }
}

/** True if the user is allowed to click Refresh Report (for monthly: only once per month when limit is enabled) */
export function canRefreshReportThisMonth(
  clientCode: string,
  periodType: ReportPeriodType
): boolean {
  if (!MONTHLY_REFRESH_LIMIT_ENABLED || periodType !== "monthly") {
    return true;
  }
  const last = getLastRefreshMonth(clientCode);
  const current = getCurrentMonthKey();
  return last !== current;
}

export interface ReportRefreshEligibilityResponse {
  canRefresh: boolean;
}

/**
 * Backend returns canRefresh: true when the dataset has been refreshed (e.g. new data in blob
 * validated or master xlsx appended) and the user has not yet clicked Refresh Report since then.
 * When the user refreshes, backend marks it and returns canRefresh: false until the next dataset refresh.
 * Returns null if the endpoint is not implemented or errors (frontend falls back to monthly logic).
 */
export async function getReportRefreshEligibility(
  clientCode?: string
): Promise<ReportRefreshEligibilityResponse | null> {
  try {
    const params = clientCode ? `?clientCode=${encodeURIComponent(clientCode)}` : "";
    const data = await apiService.get<ReportRefreshEligibilityResponse>(
      `/reports/refresh-eligible${params}`
    );
    return data ?? null;
  } catch {
    return null;
  }
}

/** Trigger backend report generation. Uses clientCode for multi-tenant blob folder resolution. */
export const generateReport = async (
  clientCode: string,
  periodType: string,
  period: string
): Promise<GenerateReportResponse> => {
  const response = await apiService.post<GenerateReportResponse>(
    `/reports/generate/${clientCode}`,
    { clientCode, periodType, period }
  );
  return response ?? {
    success: false,
    message: "No response from server",
  };
};

/**
 * Refresh report: check for Master xlsx updates, update dataset, and refresh.
 * Calls POST /api/reports/refresh/{clientCode}?period=YYYY-MM. Backend resolves client folder from DB.
 */
export async function checkMasterAndRefreshReport(
  clientCode: string,
  period?: string
): Promise<ReportRefreshResponse> {
  const params = period ? `?period=${encodeURIComponent(period)}` : "";
  const response = await apiService.post<ReportRefreshResponse>(
    `/reports/refresh/${clientCode}${params}`
  );
  return response ?? {
    success: false,
    message: "No response from server",
    datasetRefreshed: false,
    reportShouldRefresh: false,
  };
}

/**
 * Call GET /api/reports/accountant-clients.
 * Returns all clients the current user can access (via companies or single client).
 * Use when the accounting firm toggle is on to drive the clients list.
 */
export async function getAccountantClients(): Promise<AccountantClient[]> {
  const data = await apiService.get<AccountantClient[]>(
    "/reports/accountant-clients"
  );
  return Array.isArray(data) ? data : [];
}

/**
 * Call GET /api/reports/available/{clientCode}.
 * Returns report config for that client when the user has access.
 */
export async function getAvailableReportsConfigForClient(
  clientCode: string,
  options?: { useSelectedClient?: boolean }
): Promise<AvailableReportConfig | null> {
  const params = new URLSearchParams();
  if (options?.useSelectedClient) {
    params.set("useSelectedClient", "true");
  }

  const baseUrl = `/reports/available/${encodeURIComponent(clientCode)}`;
  const url = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;

  const data = await apiService.get<
    AvailableReportConfig | AvailableReportConfig[] | { items?: AvailableReportConfig[] }
  >(url);
  if (data && typeof data === "object" && "clientCode" in data && "blobFolderPath" in data) {
    return data as AvailableReportConfig;
  }
  if (Array.isArray(data) && data.length > 0) {
    return data[0];
  }
  const res = data as { items?: AvailableReportConfig[] };
  return res.items?.[0] ?? null;
}

/**
 * Call GET /api/reports/available (no path parameter).
 * Backend returns report config(s) for the current user (JWT). For clients, typically one item.
 * Use clientCode as folder name, blobFolderPath for blob/dataset, powerBIReportId/powerBIDatasetId if needed.
 */
export async function getAvailableReportsConfig(): Promise<AvailableReportConfig[]> {
  const data = await apiService.get<AvailableReportConfig[] | { items?: AvailableReportConfig[] }>(
    "/reports/available"
  );
  if (Array.isArray(data)) {
    return data;
  }
  const res = data as { items?: AvailableReportConfig[] };
  return res.items ?? [];
}

const NO_REPORT_MESSAGE = "No report configured for this client";

const NO_PUBLISHED_TEMPLATE_REPORT =
  "No published report for this template yet.";

function isEmbedTokenResponse(data: unknown): data is EmbedTokenResponse {
  return (
    !!data &&
    typeof data === "object" &&
    "accessToken" in data &&
    "embedUrl" in data &&
    "reportId" in data &&
    typeof (data as EmbedTokenResponse).accessToken === "string" &&
    typeof (data as EmbedTokenResponse).embedUrl === "string" &&
    typeof (data as EmbedTokenResponse).reportId === "string"
  );
}

function bodySuggestsPowerBiNotConfigured(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  const blob = [o.title, o.detail, o.message, o.type]
    .filter((x): x is string => typeof x === "string")
    .join(" ");
  if (/PowerBiNotConfigured/i.test(blob)) return true;
  const errs = o.errors;
  if (Array.isArray(errs) && errs.some((e) => typeof e === "string" && /PowerBiNotConfigured/i.test(e))) {
    return true;
  }
  try {
    return JSON.stringify(data).includes("PowerBiNotConfigured");
  } catch {
    return false;
  }
}

/**
 * Extract a user-facing message from an embed-token API error (4xx/5xx or failure body).
 * Use in catch blocks when getEmbedToken fails.
 */
export function getEmbedTokenErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const ax = error as { response?: { data?: unknown; status?: number } };
    const status = ax.response?.status;
    const data = ax.response?.data;
    if (status === 422 && bodySuggestsPowerBiNotConfigured(data)) {
      return NO_PUBLISHED_TEMPLATE_REPORT;
    }
    if (data && typeof data === "object" && "message" in data && typeof (data as { message: unknown }).message === "string") {
      return (data as { message: string }).message;
    }
  }
  if (error instanceof Error && error.message) {
    if (/PowerBiNotConfigured/i.test(error.message)) {
      return NO_PUBLISHED_TEMPLATE_REPORT;
    }
    return error.message;
  }
  return NO_REPORT_MESSAGE;
}

/**
 * Call GET /api/powerbi/embed-token/{reportType}?period=YYYY-MM.
 * Omit clientCode to use the user's JWT client_code claim (backend resolves client from token).
 * Pass clientCode (e.g. from AvailableReportConfig or user.clientCode) to target a specific client.
 * Throws on 4xx/5xx or when the response body indicates failure (e.g. no accessToken / message only).
 */
export async function getEmbedToken(
  reportType: string,
  period: string,
  clientCode?: string,
  options?: { useSelectedClient?: boolean }
): Promise<EmbedTokenResponse> {
  const params = new URLSearchParams({ period });
  if (clientCode) {
    params.set("clientCode", clientCode);
  }
  if (options?.useSelectedClient) {
    params.set("useSelectedClient", "true");
  }
  const data = await apiService.get<EmbedTokenResponse | { message?: string }>(
    `/powerbi/embed-token/${reportType}?${params.toString()}`
  );
  if (isEmbedTokenResponse(data)) {
    return data;
  }
  const message =
    data && typeof data === "object" && "message" in data && typeof (data as { message: unknown }).message === "string"
      ? (data as { message: string }).message
      : NO_REPORT_MESSAGE;
  throw new Error(message);
}

/**
 * GET /api/powerbi/embed-token-by-template — resolves embed for a catalog template when the backend supports it.
 * Query: templateId, reportType, period, clientCode?, useSelectedClient?
 */
export async function getEmbedTokenByTemplate(args: {
  templateId: string;
  reportType: string;
  period: string;
  clientCode?: string;
  useSelectedClient?: boolean;
}): Promise<EmbedTokenResponse> {
  const params = new URLSearchParams({
    templateId: args.templateId,
    reportType: args.reportType,
    period: args.period,
  });
  if (args.clientCode) {
    params.set("clientCode", args.clientCode);
  }
  if (args.useSelectedClient) {
    params.set("useSelectedClient", "true");
  }
  const data = await apiService.get<EmbedTokenResponse | { message?: string }>(
    `/powerbi/embed-token-by-template?${params.toString()}`
  );
  if (isEmbedTokenResponse(data)) {
    return data;
  }
  const message =
    data && typeof data === "object" && "message" in data && typeof (data as { message: unknown }).message === "string"
      ? (data as { message: string }).message
      : NO_REPORT_MESSAGE;
  throw new Error(message);
}

/** Default YYYY-MM for Insights embed when the report config has no periods list. */
export function getDefaultEmbedPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Prefer template-scoped embed; fall back to the existing client active report embed when the by-template route is missing or fails.
 */
export async function getEmbedTokenForInsightsWithTemplateFallback(args: {
  templateId: string;
  period: string;
  clientCode: string;
  useSelectedClient?: boolean;
}): Promise<EmbedTokenResponse> {
  try {
    return await getEmbedTokenByTemplate({
      templateId: args.templateId,
      reportType: "monthly",
      period: args.period,
      clientCode: args.clientCode,
      useSelectedClient: args.useSelectedClient,
    });
  } catch {
    return await getEmbedToken("monthly", args.period, args.clientCode, {
      useSelectedClient: args.useSelectedClient,
    });
  }
}

/** Fetch available reporting periods for a client. Uses clientCode for multi-tenant. */
export const getAvailableReports = async (
  clientCode?: string,
  options?: { useSelectedClient?: boolean }
): Promise<ReportPeriod[]> => {
  const baseUrl = clientCode
    ? `/reports/available/${encodeURIComponent(clientCode)}`
    : "/reports/available";

  const params = new URLSearchParams();
  if (options?.useSelectedClient) {
    params.set("useSelectedClient", "true");
  }
  const url = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;

  const data =
    await apiService.get<AvailableReportsResponse | ReportPeriod[] | AvailableReportConfig[]>(url);

  if (Array.isArray(data)) {
    const first = data[0];
    if (first && typeof first === "object" && "clientCode" in first && "blobFolderPath" in first) {
      const configs = data as AvailableReportConfig[];
      const periods = configs.flatMap((c) => c.periods ?? []);
      return [...new Set(periods)].map((p) => ({
        label: formatPeriodLabel(p),
        value: p,
      }));
    }
    return data as ReportPeriod[];
  }

  const res = data as AvailableReportsResponse;

  if (res.reports?.length) {
    return res.reports;
  }

  if (res.periods?.length) {
    return res.periods.map((p) => ({
      label: formatPeriodLabel(p),
      value: p,
    }));
  }

  if (res.items?.length) {
    const periods = res.items.flatMap((c) => c.periods ?? []);
    return [...new Set(periods)].map((p) => ({
      label: formatPeriodLabel(p),
      value: p,
    }));
  }

  return [];
};

function formatPeriodLabel(period: string): string {

const [y, m] = period.split("-").map(Number);

if (!y || !m) return period;

const date = new Date(y, m - 1, 1);

return date.toLocaleString("default", {
month: "long",
year: "numeric",
});

}
