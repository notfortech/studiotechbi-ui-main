import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Checkbox,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Refresh } from "@mui/icons-material";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PowerBIEmbed } from "../client/PowerBIEmbed";
import { ReportAreaProgressBar } from "../../components/ReportAreaProgressBar";
import {
  generateReport,
  checkMasterAndRefreshReport,
  getAvailableReports,
  getEmbedToken,
  getEmbedTokenErrorMessage,
  getMonthOptions,
  canRefreshReportThisMonth,
  setLastRefreshMonth,
  getReportRefreshEligibility,
  getAccountantClients,
  type ReportPeriod,
  type ReportPeriodType,
  type EmbedTokenResponse,
  type AccountantClient,
  REPORT_PERIOD_TYPE_LABELS,
  DEFAULT_REPORT_PERIOD_TYPE,
} from "../../services/reportService";

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

export const AccountantReportsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [clients, setClients] = useState<AccountantClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  /** Selected client code for reporting APIs (e.g. AU-001). */
  const [selectedClientCode, setSelectedClientCode] = useState<string>("");
  const [availableReports, setAvailableReports] = useState<ReportPeriod[]>(DEFAULT_AVAILABLE_REPORTS);
  const [availableReportsLoading, setAvailableReportsLoading] = useState(true);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateInfo, setGenerateInfo] = useState<string | null>(null);
  const [reportPeriodType, setReportPeriodType] =
    useState<ReportPeriodType>(DEFAULT_REPORT_PERIOD_TYPE);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedAvailablePeriod, setSelectedAvailablePeriod] = useState<string | null>(null);
  const [refreshEligibility, setRefreshEligibility] = useState<{ canRefresh: boolean } | null>(null);
  const [selectedReport, setSelectedReport] = useState<EmbedTokenResponse | null>(null);
  /** When embed-token fails, show this instead of iframe (e.g. "No report configured for this client"). */
  const [embedError, setEmbedError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  /** Progress bar: Check for updates, or loading embed / periods after accountant picks or changes client. */
  const reportProgressActive =
    generateLoading ||
    (!!selectedClientCode && (loading || availableReportsLoading));

  // Load clients from GET /api/reports/accountant-clients
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setClientsLoading(true);
        const list = await getAccountantClients();
        if (!cancelled) setClients(list);
      } catch {
        if (!cancelled) setClients([]);
      } finally {
        if (!cancelled) setClientsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Pre-select client when navigating from Clients page (state.clientCode); clear state after so dropdown is source of truth
  useEffect(() => {
    const state = location.state as { clientCode?: string } | null;
    if (state?.clientCode) {
      setSelectedClientCode(state.clientCode);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const loadAvailableReports = async () => {
    if (!selectedClientCode) return;
    try {
      setAvailableReportsLoading(true);
      const list = await getAvailableReports(selectedClientCode, { useSelectedClient: true });
      setAvailableReports(list.length >= 14 ? list : DEFAULT_AVAILABLE_REPORTS);
    } catch {
      setAvailableReports(DEFAULT_AVAILABLE_REPORTS);
    } finally {
      setAvailableReportsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClientCode) loadAvailableReports();
    else {
      setAvailableReports(DEFAULT_AVAILABLE_REPORTS);
      setAvailableReportsLoading(false);
    }
  }, [selectedClientCode]);

  const loadReport = useCallback(async () => {
    if (!selectedClientCode) return;
    try {
      setLoading(true);
      setEmbedError(null);

      const { reportPeriodType: rpt, selectedMonths: sm, selectedAvailablePeriod: sap } =
        periodForEmbedRef.current;
      const period =
        rpt === "monthly"
          ? (sm.length > 0 ? sm[0] : "2026-01")
          : (sap ?? "2026-01");

      const data = await getEmbedToken("monthly", period, selectedClientCode, {
        useSelectedClient: true,
      });
      setSelectedReport(data);
      setEmbedError(null);
    } catch (err) {
      setSelectedReport(null);
      setEmbedError(getEmbedTokenErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [selectedClientCode]);

  // Use only the latest embed-token response; never reuse previous session's URL/token.
  // Re-fetch when client changes only (month/period uses in-report filters; Check for updates reloads token).
  useEffect(() => {
    if (!selectedClientCode) {
      setSelectedReport(null);
      setEmbedError(null);
      return;
    }
    setSelectedReport(null);
    setEmbedError(null);
    void loadReport();
  }, [selectedClientCode, loadReport]);

  const handleGenerateReport = async () => {
    setGenerateError(null);
    setGenerateSuccess(false);
    if (!selectedClientCode) {
      setGenerateError("Please select a client");
      return;
    }
    const periodFolder =
      reportPeriodType === "monthly"
        ? selectedMonths.length > 0
          ? selectedMonths[0]
          : availableReports[0]?.value ?? ""
        : selectedAvailablePeriod ?? availableReports[0]?.value ?? "";
    if (!periodFolder) {
      setGenerateError(
        reportPeriodType === "monthly"
          ? "Please select at least one month"
          : "Please select a period"
      );
      return;
    }
    try {
      setGenerateLoading(true);
      const res = await generateReport(
        selectedClientCode,
        reportPeriodType,
        periodFolder
      );
      if (res.success) {
        setGenerateSuccess(true);
        setLastRefreshMonth(selectedClientCode);
        await loadAvailableReports();
        await loadReport();
      } else {
        setGenerateError(res.message ?? "Report generation failed");
      }
    } catch (err: unknown) {
      setGenerateError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleRefreshReport = async () => {
    setGenerateError(null);
    setGenerateInfo(null);
    setGenerateSuccess(false);
    if (!selectedClientCode) {
      setGenerateError("Please select a client");
      return;
    }

    const period =
      reportPeriodType === "monthly"
        ? selectedMonths.length > 0
          ? selectedMonths[0]
          : undefined
        : selectedAvailablePeriod ?? undefined;

    try {
      setGenerateLoading(true);

      const res = await checkMasterAndRefreshReport(selectedClientCode, period);

      if (res.success) {
        if (res.datasetRefreshed) {
          setGenerateSuccess(true);
          setLastRefreshMonth(selectedClientCode);
          await loadAvailableReports();
          await loadReport();
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

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Financial Reports
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Generate and manage financial reports for clients
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <FormControl
            size="small"
            sx={{ minWidth: 280, mb: 2, display: "block" }}
          >
            <InputLabel>Client</InputLabel>
            <Select
              value={selectedClientCode}
              label="Client"
              onChange={(e: SelectChangeEvent<string>) =>
                setSelectedClientCode(e.target.value)
              }
              disabled={clientsLoading}
            >
              <MenuItem value="">
                <em>Select a client</em>
              </MenuItem>
              {clients.map((c) => (
                <MenuItem key={c.clientId} value={c.clientCode}>
                  {c.clientName || c.clientCode} ({c.clientCode})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {selectedClientCode && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Client: {clients.find((c) => c.clientCode === selectedClientCode)?.clientName ?? selectedClientCode}
            </Typography>
          )}
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Report period
          </Typography>
          <Box
            display="flex"
            alignItems="flex-start"
            justifyContent="space-between"
            flexWrap="wrap"
            gap={2}
            sx={{ mb: 0 }}
          >
            <Stack direction="row" flexWrap="wrap" alignItems="flex-start" gap={2}>
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
                  <MenuItem value="half-yearly">
                    {REPORT_PERIOD_TYPE_LABELS["half-yearly"]}
                  </MenuItem>
                  <MenuItem value="annually">{REPORT_PERIOD_TYPE_LABELS.annually}</MenuItem>
                </Select>
              </FormControl>

              {reportPeriodType === "monthly" && (() => {
                const monthOptions = availableReports.length > 0
                  ? availableReports
                  : getMonthOptions(24);
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
                  <Stack direction="row" flexWrap="wrap" gap={1}>
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
                        sx={{ textTransform: "none" }}
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
                startIcon={
                  generateLoading ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <Refresh />
                  )
                }
                disabled={
                  !selectedClientCode ||
                  generateLoading ||
                  (reportPeriodType === "monthly"
                    ? selectedMonths.length === 0
                    : !selectedAvailablePeriod)
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
            <Alert severity="success" sx={{ mt: 2 }} onClose={() => setGenerateSuccess(false)}>
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
        </Box>

        <Box
          sx={{
            minHeight: 500,
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
          }}
        >
          <ReportAreaProgressBar active={reportProgressActive} />

          {!loading && embedError && (
            <Alert severity="info" sx={{ mt: 2 }} onClose={() => setEmbedError(null)}>
              {embedError}
            </Alert>
          )}
          {!loading && !embedError && selectedReport && (
            <PowerBIEmbed
              accessToken={selectedReport.accessToken}
              embedUrl={selectedReport.embedUrl}
              reportId={selectedReport.reportId}
              monthFilter={null}
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
          {!loading && !embedError && !selectedReport && selectedClientCode && (
            <Box
              height="500px"
              display="flex"
              justifyContent="center"
              alignItems="center"
              bgcolor="action.hover"
            >
              <Typography color="text.secondary">Report will load here</Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};
