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

import { PowerBIEmbed } from "./PowerBIEmbed";

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
  
  const { user } = useAuth();
  
  const { viewMode, setViewMode, accountingFirmMode, selectedClientCode, setSelectedClientCode } = useClientView();
  
  const isClientPortal = user?.role === "client";
  /** UserType 0 = general client: single-client reports only (no accounting firm / Clients list). */
  const showAccountingWorkflow =
    isClientPortal && accountingFirmMode && user?.userType !== 0;

  /** When accounting firm mode: list from GET /api/reports/accountant-clients. */
  const [accountantClients, setAccountantClients] = useState<AccountantClient[]>([]);
  const [accountantClientsLoading, setAccountantClientsLoading] = useState(false);

  /** Report config from GET /api/reports/available or .../available/{clientCode}. */
  const [reportConfig, setReportConfig] = useState<AvailableReportConfig | null>(null);
  const [reportConfigLoading, setReportConfigLoading] = useState(true);

  /** Client code: when accounting mode use selected client; else from report config or JWT. */
  const clientCode = showAccountingWorkflow
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
    (showAccountingWorkflow && accountantClientsLoading);

  // Load accountant clients when accounting firm mode is on
  useEffect(() => {
    if (!showAccountingWorkflow) return;
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
  }, [showAccountingWorkflow]);

  // Step 1: Report config — when accounting mode use GET /api/reports/available/{clientCode}; else GET /api/reports/available
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setReportConfigLoading(true);
        if (showAccountingWorkflow) {
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
  }, [showAccountingWorkflow, selectedClientCode, user?.clientCode]);

  // If toggle is switched OFF, never reuse a previously embedded report from a selected client.
  useEffect(() => {
    if (!showAccountingWorkflow) {
      setSelectedReport(null);
      setEmbedError(null);
    }
  }, [showAccountingWorkflow]);

  const loadAvailableReports = async () => {
    try {
      setAvailableReportsLoading(true);

      if (showAccountingWorkflow) {
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
  }, [showAccountingWorkflow, selectedClientCode]);

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

        if (showAccountingWorkflow) {
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
    showAccountingWorkflow,
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
    const tokenClientCode = showAccountingWorkflow ? selectedClientCode : undefined;
    if (showAccountingWorkflow && !selectedClientCode) return;
    try {
      setLoading(true);
      setEmbedError(null);
      const period =
        selectedPeriodFolder ??
        (reportPeriodType === "monthly"
          ? (selectedMonths.length > 0 ? selectedMonths[0] : "2026-01")
          : (selectedAvailablePeriod ?? "2026-01"));
      const embed = await getEmbedToken(reportId, period, tokenClientCode, {
        useSelectedClient: showAccountingWorkflow,
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
  if (isClientPortal && !showAccountingWorkflow && !reportConfigLoading && !clientCode) {
    return (
      <Box>
        <Alert severity="warning" sx={{ mt: 2 }}>
          Your account is not linked to a client. Please contact support to configure client access.
        </Alert>
      </Box>
    );
  }

  if (showAccountingWorkflow && viewMode === "clients") {
    return (
      <Box>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={600}>
            Clients
          </Typography>
          <Typography color="text.secondary">
            Select a client to view their reports
          </Typography>
        </Box>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Client List
          </Typography>
          {accountantClientsLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : accountantClients.length === 0 ? (
            <Typography color="text.secondary">No clients available.</Typography>
          ) : (
            <List disablePadding>
              {accountantClients.map((client) => (
                <ListItemButton
                  key={client.clientId}
                  sx={{ borderRadius: 1, mb: 1 }}
                  onClick={() => {
                    setSelectedClientCode(client.clientCode);
                    setViewMode("reports");
                  }}
                >
                  <ListItemText
                    primary={client.clientName || client.clientCode}
                    secondary={client.clientCode}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Paper>
      </Box>
    );
  }
  
  if (reportConfigLoading && !clientCode && !showAccountingWorkflow) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
  <Box>
    <Paper sx={{ p: 3 }}>
      {showAccountingWorkflow && (
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
      {showAccountingWorkflow && !selectedClientCode && (
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
              (showAccountingWorkflow && !clientCode) ||
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
  
    </Paper>
  
  </Box>
  
  );
  
  };
  