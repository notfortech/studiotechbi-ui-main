import {
  Box,
  Typography,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Button,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Checkbox,
  ListItemIcon,
  IconButton,
  Tooltip,
} from "@mui/material";

import { Refresh } from "@mui/icons-material";

import { useEffect, useRef, useState } from "react";

import type { Report } from "powerbi-client";

import { PowerBIEmbed } from "./PowerBIEmbed";
import { collectVisualTitlesFromReport } from "./powerBiVisualTitles";

import {
  generateReport,
  checkMasterAndRefreshReport,
  getAvailableReports,
  getAvailableReportsConfig,
  getAvailableReportsConfigForClient,
  getAccountantClients,
  getEmbedToken,
  getEmbedTokenErrorMessage,
  canRefreshReportThisMonth,
  setLastRefreshMonth,
  getReportRefreshEligibility,
  getAiInsightsForReportPage,
  type ReportAiInsightsResponse,
  type ReportPeriod,
  type ReportPeriodType,
  type AvailableReportConfig,
  type EmbedTokenResponse,
  type AccountantClient,
  REPORT_PERIOD_TYPE_LABELS,
  DEFAULT_REPORT_PERIOD_TYPE,
} from "../../services/reportService";

import { useAuth } from "../../auth/AuthContext";

import { useClientView } from "../../layouts/client/ClientViewContext";
import { canSelectReportClient } from "../../core/reportClientAccess";

import { ReportAreaProgressBar } from "../../components/ReportAreaProgressBar";

  const DEFAULT_AVAILABLE_REPORTS: ReportPeriod[] = [
    { label: "April 2025", value: "2025-04" },
    { label: "May 2025", value: "2025-05" },
    { label: "June 2025", value: "2025-06" },
    { label: "July 2025", value: "2025-07" },
    { label: "August 2025", value: "2025-08" },
    { label: "September 2025", value: "2025-09" },
    { label: "October 2025", value: "2025-10" },
    { label: "November 2025", value: "2025-11" },
    { label: "December 2025", value: "2025-12" },
    { label: "January 2026", value: "2026-01" },
    { label: "February 2026", value: "2026-02" },
    { label: "March 2026", value: "2026-03" },
    { label: "April 2026", value: "2026-04" },
    { label: "May 2026", value: "2026-05" },
  ];

  export const ClientReportsPage = () => {
  
  const { user, hasAIInsights } = useAuth();
  
  const { selectedClientCode, setSelectedClientCode } = useClientView();
  
  const isClientPortal = user?.role === "client";
  /** Client dropdown: backend accountant (userType 1 / isAccountant), not general clients. */
  const showReportClientDropdown = isClientPortal && canSelectReportClient(user);

  /** When accounting firm mode: list from GET /api/reports/accountant-clients. */
  const [accountantClients, setAccountantClients] = useState<AccountantClient[]>([]);
  const [accountantClientsLoading, setAccountantClientsLoading] = useState(false);

  /** Report config from GET /api/reports/available or .../available/{clientCode}. */
  const [reportConfig, setReportConfig] = useState<AvailableReportConfig | null>(null);
  const [reportConfigLoading, setReportConfigLoading] = useState(true);

  /** Client code: when accounting mode use selected client; else from report config or JWT. */
  const clientCode = showReportClientDropdown
    ? selectedClientCode
    : (reportConfig?.clientCode ?? user?.clientCode ?? "");

  const [selectedPeriodFolder, setSelectedPeriodFolder] =
    useState<string | null>(null);

  const [selectedReport, setSelectedReport] =
    useState<EmbedTokenResponse | null>(null);
  /** When embed-token fails (4xx/5xx or "no report" body), show this instead of iframe. */
  const [embedError, setEmbedError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  /** True while initial / reactive embed-token fetch runs (useEffect). */
  const [embedTokenLoading, setEmbedTokenLoading] = useState(false);
  
  const [availableReports, setAvailableReports] =
  useState<ReportPeriod[]>(DEFAULT_AVAILABLE_REPORTS);
  
  const [availableReportsLoading, setAvailableReportsLoading] =
  useState(true);
  
  const [generateLoading, setGenerateLoading] =
  useState(false);
  
  const [generateSuccess, setGenerateSuccess] =
  useState(false);
  
  const [generateError, setGenerateError] =
  useState<string | null>(null);
  const [generateInfo, setGenerateInfo] = useState<string | null>(null);

  const [reportPeriodType, setReportPeriodType] =
    useState<ReportPeriodType>(DEFAULT_REPORT_PERIOD_TYPE);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedAvailablePeriod, setSelectedAvailablePeriod] =
    useState<string | null>(null);
  const [refreshEligibility, setRefreshEligibility] = useState<{
    canRefresh: boolean;
  } | null>(null);
  const [aiPaneOpen, setAiPaneOpen] = useState(false);
  const [activePageName, setActivePageName] = useState<string>("");
  const [aiVisualTitles, setAiVisualTitles] = useState<string[]>([]);
  /** Bumps when `PowerBIEmbed` calls `onLoaded` so we refresh titles even before `activePageName` updates. */
  const [reportBindVersion, setReportBindVersion] = useState(0);
  const embeddedReportRef = useRef<Report | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<ReportAiInsightsResponse | null>(null);

  /** Latest period picker values for embed-token (ref so month changes do not re-fetch token). */
  const periodForEmbedRef = useRef({
    reportPeriodType,
    selectedMonths,
    selectedAvailablePeriod,
  });
  periodForEmbedRef.current = {
    reportPeriodType,
    selectedMonths,
    selectedAvailablePeriod,
  };

  /** Progress bar: Check for updates; config / periods / embed on first load and refetch (toggle ON or OFF). Accounting client list only when toggle ON. */
  const reportProgressActive =
    generateLoading ||
    reportConfigLoading ||
    availableReportsLoading ||
    embedTokenLoading ||
    (showReportClientDropdown && accountantClientsLoading);

  // Load clients for multi-client dropdown
  useEffect(() => {
    if (!showReportClientDropdown) return;
    let cancelled = false;
    (async () => {
      try {
        setAccountantClientsLoading(true);
        const list = await getAccountantClients();
        if (!cancelled) setAccountantClients(list);
      } catch {
        if (!cancelled) setAccountantClients([]);
      } finally {
        if (!cancelled) setAccountantClientsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showReportClientDropdown]);

  // Step 1: Report config — when accounting mode use GET /api/reports/available/{clientCode}; else GET /api/reports/available
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setReportConfigLoading(true);
        if (showReportClientDropdown) {
          if (selectedClientCode) {
            const config = await getAvailableReportsConfigForClient(selectedClientCode, {
              useSelectedClient: true,
            });
            if (!cancelled) setReportConfig(config);
          } else {
            if (!cancelled) setReportConfig(null);
          }
        } else {
          const configs = await getAvailableReportsConfig();
          if (cancelled) return;
          const match = configs.find((c) => c.clientCode === user?.clientCode) ?? configs[0];
          setReportConfig(match ?? null);
        }
      } catch {
        if (!cancelled) setReportConfig(null);
      } finally {
        if (!cancelled) setReportConfigLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showReportClientDropdown, selectedClientCode, user?.clientCode]);

  // If toggle is switched OFF, never reuse a previously embedded report from a selected client.
  useEffect(() => {
    if (!showReportClientDropdown) {
      setSelectedReport(null);
      setEmbedError(null);
    }
  }, [showReportClientDropdown]);

  useEffect(() => {
    embeddedReportRef.current = null;
    setAiVisualTitles([]);
  }, [selectedReport]);

  useEffect(() => {
    let cancelled = false;
    const report = embeddedReportRef.current;
    if (!report || !selectedReport) return;

    void (async () => {
      const titles = await collectVisualTitlesFromReport(report);
      if (!cancelled) setAiVisualTitles(titles);
    })();

    return () => {
      cancelled = true;
    };
  }, [activePageName, selectedReport?.reportId, reportBindVersion]);

  const loadAvailableReports = async () => {
    try {
      setAvailableReportsLoading(true);

      if (showReportClientDropdown) {
        if (!selectedClientCode) {
          setAvailableReports(DEFAULT_AVAILABLE_REPORTS);
          return;
        }
        const list = await getAvailableReports(selectedClientCode, { useSelectedClient: true });
        setAvailableReports(list.length >= 14 ? list : DEFAULT_AVAILABLE_REPORTS);
      } else {
        // Single-client mode: backend uses JWT client_code; do not pass a clientCode param.
        const list = await getAvailableReports();
        setAvailableReports(list.length >= 14 ? list : DEFAULT_AVAILABLE_REPORTS);
      }
    } catch {
      setAvailableReports(DEFAULT_AVAILABLE_REPORTS);
    } finally {
      setAvailableReportsLoading(false);
    }
  };

  useEffect(() => {
    loadAvailableReports();
  }, [showReportClientDropdown, selectedClientCode]);

  const loadRefreshEligibility = async () => {
    const eligibility = await getReportRefreshEligibility(clientCode);
    setRefreshEligibility(eligibility);
  };

  // Step 2: Embed token
  // - Accounting firm toggle OFF: call single-client endpoint (no clientCode)
  // - Accounting firm toggle ON: pass clientCode and set useSelectedClient=true
  // Does not re-run when only months/period dropdown changes (Power BI filters client-side).
  useEffect(() => {
    let cancelled = false;
    setSelectedReport(null);
    setEmbedError(null);
    setEmbedTokenLoading(true);

    (async () => {
      try {
        // Optional optimization: if config already says "no Power BI IDs", skip embed-token call.
        if (
          !reportConfigLoading &&
          reportConfig &&
          !reportConfig.powerBIReportId &&
          !reportConfig.powerBIDatasetId
        ) {
          if (!cancelled) setEmbedError("No report configured for this client");
          return;
        }

        const { reportPeriodType: rpt, selectedMonths: sm, selectedAvailablePeriod: sap } =
          periodForEmbedRef.current;
        const period =
          rpt === "monthly"
            ? (sm.length > 0 ? sm[0] : "2026-01")
            : (sap ?? "2026-01");

        if (showReportClientDropdown) {
          if (!selectedClientCode) return;
          const data = await getEmbedToken("monthly", period, selectedClientCode, {
            useSelectedClient: true,
          });
          if (!cancelled) {
            setSelectedReport(data);
            setEmbedError(null);
          }
        } else {
          const data = await getEmbedToken("monthly", period, undefined, {
            useSelectedClient: false,
          });
          if (!cancelled) {
            setSelectedReport(data);
            setEmbedError(null);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setSelectedReport(null);
          setEmbedError(getEmbedTokenErrorMessage(err));
        }
      } finally {
        if (!cancelled) setEmbedTokenLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      setEmbedTokenLoading(false);
    };
  }, [
    showReportClientDropdown,
    selectedClientCode,
    reportConfigLoading,
    reportConfig?.powerBIReportId,
    reportConfig?.powerBIDatasetId,
  ]);
  
  const handleGenerateReport = async () => {
    setGenerateError(null);
    setGenerateSuccess(false);

    const periodFolder =
      reportPeriodType === "monthly"
        ? selectedMonths.length > 0
          ? selectedMonths[0]
          : null
        : selectedAvailablePeriod;

    if (!periodFolder) {
      setGenerateError(
        reportPeriodType === "monthly"
          ? "Please select at least one month"
          : "Please select a period"
      );
      return;
    }
  
    setSelectedPeriodFolder(periodFolder);

    try {
      setGenerateLoading(true);

      const res = await generateReport(
        clientCode,
        reportPeriodType,
        periodFolder
      );

      if (res.success) {
        setGenerateSuccess(true);
        setLastRefreshMonth(clientCode);
        //await loadRefreshEligibility();
        await loadReport("monthly");
      } else {
        setGenerateError(res.message || "Generation failed");
      }
    } catch {
      setGenerateError("Generation failed");
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleRefreshReport = async () => {
    setGenerateError(null);
    setGenerateInfo(null);
    setGenerateSuccess(false);

    const period =
      reportPeriodType === "monthly"
        ? selectedMonths.length > 0
          ? selectedMonths[0]
          : undefined
        : selectedAvailablePeriod ?? undefined;

    try {
      setGenerateLoading(true);

      const res = await checkMasterAndRefreshReport(clientCode, period);

      if (res.success) {
        if (res.datasetRefreshed) {
          setGenerateSuccess(true);
          setLastRefreshMonth(clientCode);
          await loadAvailableReports();
          await loadReport("monthly");
        } else {
          const info = res.log?.trim() || res.message?.trim() || "No data found for this period.";
          setGenerateInfo(info);
        }
      } else {
        setGenerateError(res.message ?? res.log ?? "Refresh failed.");
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed to refresh report");
    } finally {
      setGenerateLoading(false);
    }
  };
  
  const loadReport = async (reportId: string): Promise<void> => {
    const tokenClientCode = showReportClientDropdown ? selectedClientCode : undefined;
    if (showReportClientDropdown && !selectedClientCode) return;
    try {
      setLoading(true);
      setEmbedError(null);
      const period =
        selectedPeriodFolder ??
        (reportPeriodType === "monthly"
          ? (selectedMonths.length > 0 ? selectedMonths[0] : "2026-01")
          : (selectedAvailablePeriod ?? "2026-01"));
      const embed = await getEmbedToken(reportId, period, tokenClientCode, {
        useSelectedClient: showReportClientDropdown,
      });
      setSelectedReport(embed);
      setEmbedError(null);
    } catch (err) {
      setSelectedReport(null);
      setEmbedError(getEmbedTokenErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };
  
  /** Client users (non–accounting mode) must have clientCode; wait for config load before showing warning. */
  if (isClientPortal && !showReportClientDropdown && !reportConfigLoading && !clientCode) {
    return (
      <Box>
        <Alert severity="warning" sx={{ mt: 2 }}>
          Your account is not linked to a client. Please contact support to configure client access.
        </Alert>
      </Box>
    );
  }

  if (reportConfigLoading && !clientCode && !showReportClientDropdown) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
  <Box>
    <Paper sx={{ p: 3 }}>
      {showReportClientDropdown && (
        <FormControl size="small" sx={{ minWidth: 280, mb: 2, display: "block" }}>
          <InputLabel>Client</InputLabel>
          <Select
            value={selectedClientCode}
            label="Client"
            onChange={(e: SelectChangeEvent<string>) => setSelectedClientCode(e.target.value)}
            disabled={accountantClientsLoading}
          >
            <MenuItem value="">
              <em>Select a client</em>
            </MenuItem>
            {accountantClients.map((c) => (
              <MenuItem key={c.clientId} value={c.clientCode}>
                {c.clientName || c.clientCode} ({c.clientCode})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
      {showReportClientDropdown && !selectedClientCode && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Select a client to view and manage their reports.
        </Alert>
      )}
      <Typography variant="h6" gutterBottom>
        Report period
      </Typography>

      <Box
        display="flex"
        flexWrap="wrap"
        alignItems="flex-start"
        gap={3}
        sx={{ mb: 0, width: "100%" }}
      >
        <Stack direction="row" flexWrap="wrap" alignItems="flex-start" gap={3}>
        <FormControl
          size="small"
          sx={{
            minWidth: 160,
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#f3e5f5",
              "& fieldset": { borderColor: "#ce93d8" },
              "&:hover fieldset": { borderColor: "#ba68c8" },
            },
          }}
        >
          <InputLabel>Period type</InputLabel>
          <Select
            value={reportPeriodType}
            label="Period type"
            onChange={(e: SelectChangeEvent<ReportPeriodType>) =>
              setReportPeriodType(e.target.value as ReportPeriodType)
            }
          >
            <MenuItem value="monthly">{REPORT_PERIOD_TYPE_LABELS.monthly}</MenuItem>
            <MenuItem value="quarterly">{REPORT_PERIOD_TYPE_LABELS.quarterly}</MenuItem>
            <MenuItem value="biweekly">{REPORT_PERIOD_TYPE_LABELS.biweekly}</MenuItem>
            <MenuItem value="half-yearly">{REPORT_PERIOD_TYPE_LABELS["half-yearly"]}</MenuItem>
            <MenuItem value="annually">{REPORT_PERIOD_TYPE_LABELS.annually}</MenuItem>
          </Select>
        </FormControl>

        {reportPeriodType === "monthly" && (() => {
          const monthOptions = availableReports;
          const allSelected = monthOptions.length > 0 && selectedMonths.length === monthOptions.length;
          const someSelected = selectedMonths.length > 0;
          return (
            <FormControl
              size="small"
              sx={{
                minWidth: 280,
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#f3e5f5",
                  "& fieldset": { borderColor: "#ce93d8" },
                  "&:hover fieldset": { borderColor: "#ba68c8" },
                },
              }}
            >
              <InputLabel>Months</InputLabel>
              <Select
                multiple
                value={selectedMonths}
                label="Months"
                onChange={(e) => {
                  const v = e.target.value as string[];
                  if (v.includes("__select_all__")) {
                    setSelectedMonths(allSelected ? [] : monthOptions.map((m) => m.value));
                    return;
                  }
                  setSelectedMonths(v);
                }}
                renderValue={(v) =>
                  v.length === 0
                    ? "Select months"
                    : v.length <= 2
                      ? v.join(", ")
                      : `${v.length} months`
                }
              >
                <MenuItem value="__select_all__">
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      size="small"
                    />
                  </ListItemIcon>
                  <ListItemText primary="Select all" />
                </MenuItem>
                {monthOptions.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox
                        checked={selectedMonths.indexOf(m.value) > -1}
                        size="small"
                      />
                    </ListItemIcon>
                    <ListItemText primary={m.label} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        })()}

        {reportPeriodType !== "monthly" && (
          availableReportsLoading ? (
            <CircularProgress size={24} />
          ) : (
            <Stack direction="row" gap={1} flexWrap="wrap">
              {availableReports.map((p) => (
                <Button
                  key={p.value}
                  variant={
                    selectedAvailablePeriod === p.value ? "contained" : "outlined"
                  }
                  size="small"
                  onClick={() =>
                    setSelectedAvailablePeriod(
                      selectedAvailablePeriod === p.value ? null : p.value
                    )
                  }
                >
                  {p.label}
                </Button>
              ))}
            </Stack>
          )
        )}
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1} sx={{ ml: "auto" }}>
          <Button
            variant="contained"
            disabled={
              (showReportClientDropdown && !clientCode) ||
              generateLoading ||
              (reportPeriodType === "monthly"
                ? selectedMonths.length === 0
                : !selectedAvailablePeriod)
            }
            startIcon={
              generateLoading ? (
                <CircularProgress size={18} />
              ) : (
                <Refresh />
              )
            }
            onClick={handleRefreshReport}
          >
            Check for updates
          </Button>
          <Tooltip title="Refresh page">
            <IconButton
              size="small"
              onClick={() => window.location.reload()}
              aria-label="Refresh page"
            >
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
  
      {generateSuccess && (
        <Alert severity="success" onClose={() => setGenerateSuccess(false)}>
          Dataset refreshed — refresh the application using the refresh icon or the browser.
        </Alert>
      )}

      {generateInfo && (
        <Alert severity="info" sx={{ mt: 2 }} onClose={() => setGenerateInfo(null)}>
          {generateInfo}
        </Alert>
      )}

      {generateError && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setGenerateError(null)}>
          {generateError}
        </Alert>
      )}
  
      <Box
        mt={3}
        minHeight={500}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
        }}
      >
        <ReportAreaProgressBar active={reportProgressActive} />

        {!loading && !embedTokenLoading && embedError && (
          <Alert severity="info" onClose={() => setEmbedError(null)}>
            {embedError}
          </Alert>
        )}

        {!loading && !embedTokenLoading && !embedError && selectedReport && (
          <PowerBIEmbed
            accessToken={selectedReport.accessToken}
            embedUrl={selectedReport.embedUrl}
            reportId={selectedReport.reportId}
            onLoaded={(r) => {
              embeddedReportRef.current = r;
              setReportBindVersion((v) => v + 1);
            }}
            onActivePageChanged={(name) => setActivePageName(name)}
            periodFolder={
              reportPeriodType === "monthly" ? null : selectedAvailablePeriod
            }
            periodValues={
              reportPeriodType === "monthly" && selectedMonths.length > 0
                ? selectedMonths
                : null
            }
          />
        )}
      </Box>

      {hasAIInsights && (
        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            disabled={showReportClientDropdown ? !selectedClientCode : !clientCode}
            onClick={() => {
              setAiPaneOpen(true);
              setAiError(null);
              setAiResult(null);
            }}
          >
            Generate AI Insights
          </Button>
        </Stack>
      )}
  
    </Paper>

    <Dialog open={aiPaneOpen} onClose={() => setAiPaneOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>AI insights — current report</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Summarises the embedded report view you have open (active page, period filters, and chart
          titles). Insights reflect report data only.
        </Typography>
        <Stack spacing={1}>
          <Typography variant="body2">
            Client: <strong>{(showReportClientDropdown ? selectedClientCode : clientCode) || "—"}</strong>
          </Typography>
          <Typography variant="body2">
            Period type: <strong>{reportPeriodType}</strong>
          </Typography>
          <Typography variant="body2">
            Selected period:{" "}
            <strong>
              {reportPeriodType === "monthly"
                ? (selectedMonths[0] ?? "—")
                : (selectedAvailablePeriod ?? "—")}
            </strong>
          </Typography>
          <Typography variant="body2">
            Active page: <strong>{activePageName || "—"}</strong>
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Visuals on active page (for API): {aiVisualTitles.length}
          </Typography>
        </Stack>

        {aiError && (
          <Alert severity="warning" sx={{ mt: 2 }} onClose={() => setAiError(null)}>
            {aiError}
          </Alert>
        )}

        {aiResult && aiResult.enabled === false && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {aiResult.message || "AI is not enabled for this client."}
          </Alert>
        )}

        {aiResult && aiResult.enabled && (
          <Box sx={{ mt: 2 }}>
            {aiResult.summary && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                {aiResult.summary}
              </Typography>
            )}
            {aiResult.insights?.length ? (
              <List dense>
                {aiResult.insights.slice(0, 10).map((t, i) => (
                  <ListItemText key={i} primary={`• ${t}`} />
                ))}
              </List>
            ) : null}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          disabled={aiLoading || (showReportClientDropdown ? !selectedClientCode : !clientCode)}
          onClick={async () => {
            const cc = showReportClientDropdown ? selectedClientCode : clientCode;
            if (!cc) return;
            const report = embeddedReportRef.current;
            if (!report) {
              setAiError(
                "Report is not loaded yet. Wait for the report to finish rendering, then try again."
              );
              return;
            }
            setAiLoading(true);
            setAiError(null);
            setAiResult(null);
            try {
              const period =
                reportPeriodType === "monthly"
                  ? (selectedMonths[0] ?? undefined)
                  : (selectedAvailablePeriod ?? undefined);
              const visualTitles = await collectVisualTitlesFromReport(report);
              setAiVisualTitles(visualTitles);
              const res = await getAiInsightsForReportPage({
                clientCode: cc,
                useSelectedClient: showReportClientDropdown || undefined,
                reportType: reportPeriodType,
                period,
                activePageName: activePageName || undefined,
                visualTitles,
              });
              setAiResult(res);
            } catch (e) {
              setAiError(getEmbedTokenErrorMessage(e));
            } finally {
              setAiLoading(false);
            }
          }}
        >
          {aiLoading ? "Generating…" : "Generate"}
        </Button>
        <Button onClick={() => setAiPaneOpen(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  </Box>

  );

  };

  