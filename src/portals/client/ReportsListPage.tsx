import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Snackbar,
} from "@mui/material";
import {
  Assessment as AssessmentIcon,
  ArrowForward as ArrowForwardIcon,
  CalendarMonth as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon,
} from "@mui/icons-material";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import {
  getAvailableReportsConfig,
  getAvailableReportsConfigForClient,
  getAccountantClients,
  type AvailableReportConfig,
  type AccountantClient,
} from "../../services/reportService";
import { useAuth } from "../../auth/AuthContext";
import { useClientView } from "../../layouts/client/ClientViewContext";
import { canSelectReportClient } from "../../core/reportClientAccess";
import { ROUTES } from "../../core/constants";
import { GenerateBlueprintButton } from "./GenerateBlueprintButton";

export const ReportsListPage = () => {
  const { user } = useAuth();
  const { selectedClientCode, setSelectedClientCode } = useClientView();
  const navigate = useNavigate();
  const location = useLocation();
  const cameFromReport = !!(location.state as { fromReport?: boolean } | null)?.fromReport;

  const isClientPortal = user?.role === "client";
  const showClientDropdown = isClientPortal && canSelectReportClient(user);

  const [configs, setConfigs] = useState<AvailableReportConfig[]>([]);
  const [configsLoading, setConfigsLoading] = useState(true);
  const [configsError, setConfigsError] = useState<string | null>(null);

  const [accountantClients, setAccountantClients] = useState<AccountantClient[]>([]);
  const [accountantClientsLoading, setAccountantClientsLoading] = useState(false);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false, message: "", severity: "info",
  });

  // Load accountant clients for dropdown (accounting firm mode)
  useEffect(() => {
    if (!showClientDropdown) return;
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
  }, [showClientDropdown]);

  // Load report configs
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setConfigsLoading(true);
        setConfigsError(null);

        if (showClientDropdown) {
          if (!selectedClientCode) {
            if (!cancelled) setConfigs([]);
            return;
          }
          const config = await getAvailableReportsConfigForClient(selectedClientCode, {
            useSelectedClient: true,
          });
          if (!cancelled) setConfigs([config]);
        } else {
          const list = await getAvailableReportsConfig();
          if (!cancelled) setConfigs(list);
        }
      } catch {
        if (!cancelled) setConfigsError("Failed to load available reports. Please try again.");
      } finally {
        if (!cancelled) setConfigsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showClientDropdown, selectedClientCode]);

  // Auto-navigate to view on first load; skip when user clicked "Back to Reports"
  useEffect(() => {
    if (configsLoading) return;
    if (showClientDropdown) return;
    if (cameFromReport) return;

    if (configs.length === 1) {
      handleOpenReport(configs[0]);
    }
    // configs.length === 0 → show empty state, no redirect
  }, [configsLoading, configs, showClientDropdown, cameFromReport]);

  const handleOpenReport = (config: AvailableReportConfig) => {
    if (showClientDropdown) {
      setSelectedClientCode(config.clientCode);
    }
    navigate(ROUTES.CLIENT.REPORTS_VIEW, {
      state: { clientCode: config.clientCode },
    });
  };

  const clientNameFor = (code: string) => {
    const match = accountantClients.find((c) => c.clientCode === code);
    return match?.clientName ?? code;
  };

  const latestPeriod = (config: AvailableReportConfig): string | null => {
    if (!config.periods?.length) return null;
    return [...config.periods].sort().reverse()[0];
  };

  const formatPeriod = (period: string): string => {
    const [year, month] = period.split("-");
    if (!year || !month) return period;
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleString("default", { month: "long", year: "numeric" });
  };

  const isConfigured = (config: AvailableReportConfig) =>
    !!(config.powerBIReportId || config.powerBIDatasetId);

  if (isClientPortal && !showClientDropdown && !configsLoading && !user?.clientCode) {
    return (
      <Box>
        <Alert severity="warning" sx={{ mt: 2 }}>
          Your account is not linked to a client. Please contact support to configure client access.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h5" fontWeight={600}>
              Reports
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Select a report to view your embedded financial data
            </Typography>
          </Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            {configs.length > 0 && (
              <Chip
                label={`${configs.length} report${configs.length !== 1 ? "s" : ""} available`}
                color="primary"
                variant="outlined"
                size="small"
              />
            )}
            <GenerateBlueprintButton
              clientCode={user?.clientCode ?? selectedClientCode ?? ""}
              onSuccess={(msg) => setSnackbar({ open: true, message: msg, severity: "info" })}
              onError={(msg) => setSnackbar({ open: true, message: msg, severity: "error" })}
            />
          </Stack>
        </Stack>

        {showClientDropdown && (
          <FormControl size="small" sx={{ minWidth: 280, mb: 3, display: "block" }}>
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

        {showClientDropdown && !selectedClientCode && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Select a client to view their available reports.
          </Alert>
        )}

        {configsError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {configsError}
          </Alert>
        )}

        {configsLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        ) : configs.length === 0 && !showClientDropdown ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <Stack alignItems="center" spacing={1}>
              <AssessmentIcon sx={{ fontSize: 48, color: "text.disabled" }} />
              <Typography color="text.secondary">No reports are available for your account yet.</Typography>
            </Stack>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {configs.map((config) => (
              <Grid key={config.clientCode} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card
                  variant="outlined"
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    transition: "box-shadow 0.2s, border-color 0.2s",
                    "&:hover": {
                      boxShadow: 4,
                      borderColor: "primary.main",
                    },
                  }}
                >
                  <CardActionArea
                    onClick={() => handleOpenReport(config)}
                    sx={{ flexGrow: 1, alignItems: "flex-start", display: "flex", flexDirection: "column" }}
                  >
                    <CardContent sx={{ width: "100%" }}>
                      <Stack direction="row" alignItems="flex-start" spacing={2} sx={{ mb: 2 }}>
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            backgroundColor: "primary.main",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <AssessmentIcon sx={{ color: "white", fontSize: 26 }} />
                        </Box>
                        <Box flexGrow={1} minWidth={0}>
                          <Typography variant="h6" fontWeight={600} noWrap>
                            {showClientDropdown
                              ? clientNameFor(config.clientCode)
                              : "Financial Report"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {config.clientCode}
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack spacing={1}>
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                          {isConfigured(config) ? (
                            <CheckCircleIcon sx={{ fontSize: 16, color: "success.main" }} />
                          ) : (
                            <ErrorOutlineIcon sx={{ fontSize: 16, color: "warning.main" }} />
                          )}
                          <Typography variant="body2" color="text.secondary">
                            {isConfigured(config) ? "Report configured" : "Report not configured"}
                          </Typography>
                        </Stack>

                        {config.periods && config.periods.length > 0 && (
                          <Stack direction="row" alignItems="center" spacing={0.75}>
                            <CalendarIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                            <Typography variant="body2" color="text.secondary">
                              {config.periods.length} period
                              {config.periods.length !== 1 ? "s" : ""} available
                            </Typography>
                          </Stack>
                        )}

                        {latestPeriod(config) && (
                          <Chip
                            label={`Latest: ${formatPeriod(latestPeriod(config)!)}`}
                            size="small"
                            variant="outlined"
                            sx={{ alignSelf: "flex-start", mt: 0.5 }}
                          />
                        )}
                      </Stack>
                    </CardContent>
                  </CardActionArea>

                  <CardActions sx={{ px: 2, pb: 2 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => handleOpenReport(config)}
                      disabled={!isConfigured(config)}
                    >
                      View Report
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
