import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Card,
  CardContent,
  Avatar,
  Alert,
  CircularProgress,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  alpha,
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  CheckCircle as CheckCircleIcon,
  AutoGraph as ReportIcon,
  TrendingUp as KpiIcon,
  FilterAlt as FilterIcon,
  Palette as PaletteIcon,
} from "@mui/icons-material";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import {
  generateReport,
  type GeneratedReport,
  type ReportChart,
} from "../../api/reportGeneratorApi";
import { themeById, type VisualTheme } from "./ReportDesignerPage";
import { getPreferredThemeId } from "../../core/reportTheme";
import { TrustBadge } from "../../components/common/TrustBadge";
import { ROUTES } from "../../core/constants";

// ── Theme color cycling for multi-series/category charts ────────────────────

function colorCycle(theme: VisualTheme): string[] {
  return [theme.dark, theme.primary, theme.light, `${theme.dark}99`, `${theme.primary}99`, `${theme.light}99`];
}

function toChartData(chart: ReportChart): Record<string, string | number>[] {
  const labels = chart.type === "line" ? chart.x ?? [] : chart.categories ?? [];
  return labels.map((label, i) => {
    const row: Record<string, string | number> = { label };
    chart.series.forEach((s) => {
      row[s.name] = s.values[i];
    });
    return row;
  });
}

// ── Step 1: upload + theme ───────────────────────────────────────────────────

function ConnectAndStyleStep({
  uploadedFile, onUpload, theme,
}: {
  uploadedFile: File | null; onUpload: (f: File) => void;
  theme: VisualTheme;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>Connect Your Data</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload an Excel or CSV file. No AI is involved anywhere in this screen — a deterministic
        engine profiles your columns and computes real KPI/chart values directly from the data.
      </Typography>

      <input ref={fileInputRef} type="file" accept=".xlsx,.csv" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
      <Box onClick={() => fileInputRef.current?.click()} sx={{
        border: "2px dashed", borderColor: uploadedFile ? "primary.main" : "divider",
        borderRadius: 2, p: 4, textAlign: "center", cursor: "pointer",
        bgcolor: uploadedFile ? (t) => alpha(t.palette.primary.main, 0.04) : "background.paper",
        transition: "all 0.2s",
        "&:hover": { borderColor: "primary.main", bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
      }}>
        {uploadedFile ? (
          <Stack alignItems="center" spacing={1}>
            <CheckCircleIcon color="primary" sx={{ fontSize: 40 }} />
            <Typography fontWeight={600}>{uploadedFile.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {(uploadedFile.size / 1024).toFixed(1)} KB · Click to replace
            </Typography>
          </Stack>
        ) : (
          <Stack alignItems="center" spacing={1}>
            <UploadIcon sx={{ fontSize: 40, color: "text.disabled" }} />
            <Typography fontWeight={600}>Click to upload</Typography>
            <Typography variant="body2" color="text.secondary">Supports .xlsx, .csv · max 50 MB</Typography>
          </Stack>
        )}
      </Box>

      <Card variant="outlined" sx={{ mt: 3 }}>
        <CardContent sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <PaletteIcon sx={{ color: theme.primary }} />
            <Box>
              <Typography variant="body2" color="text.secondary">Report theme</Typography>
              <Stack direction="row" spacing={0.75} alignItems="center">
                {[theme.dark, theme.primary, theme.light].map((c) => (
                  <Box key={c} sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: c }} />
                ))}
                <Typography fontWeight={600}>{theme.name}</Typography>
              </Stack>
            </Box>
          </Stack>
          <Button size="small" variant="outlined" onClick={() => navigate(ROUTES.CLIENT.REPORT_DESIGNER)}>
            Change in Report Designer
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}

// ── Step 2: generated report ─────────────────────────────────────────────────

function ReportKpiCard({ kpi, color }: { kpi: GeneratedReport["kpis"][number]; color: string }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ bgcolor: alpha(color, 0.15), color }}>
            <KpiIcon />
          </Avatar>
          <Box>
            <Typography variant="body2" color="text.secondary">{kpi.label}</Typography>
            <Typography variant="h6" fontWeight={700}>
              {kpi.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ReportChartCard({ chart, theme }: { chart: ReportChart; theme: VisualTheme }) {
  const data = toChartData(chart);
  const colors = colorCycle(theme);
  const dataKey = chart.type === "line" ? "label" : "label";

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>{chart.title}</Typography>
        <ResponsiveContainer width="100%" height={300}>
          {chart.type === "line" ? (
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={dataKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {chart.series.map((s, i) => (
                <Line key={s.name} type="monotone" dataKey={s.name} name={s.name}
                  stroke={colors[i % colors.length]} dot={false} />
              ))}
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={dataKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {chart.series.map((s, i) => (
                <Bar key={s.name} dataKey={s.name} name={s.name} fill={colors[i % colors.length]} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function FilterBar({
  slicers, activeFilters, onFilterChange, onClearFilters, disabled,
}: {
  slicers: GeneratedReport["slicers"];
  activeFilters: Record<string, string>;
  onFilterChange: (column: string, value: string) => void;
  onClearFilters: () => void;
  disabled: boolean;
}) {
  if (slicers.length === 0) return null;
  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  return (
    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 3 }}>
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: "text.secondary" }}>
        <FilterIcon fontSize="small" />
        <Typography variant="body2">Filters:</Typography>
      </Stack>
      {slicers.map((slicer) => (
        <FormControl key={slicer.column} size="small" sx={{ minWidth: 160 }} disabled={disabled}>
          <InputLabel>{slicer.column}</InputLabel>
          <Select
            label={slicer.column}
            value={activeFilters[slicer.column] ?? ""}
            onChange={(e) => onFilterChange(slicer.column, e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {slicer.values.map((v) => (
              <MenuItem key={v} value={v}>{v}</MenuItem>
            ))}
          </Select>
        </FormControl>
      ))}
      {hasActiveFilters && (
        <Button size="small" onClick={onClearFilters} disabled={disabled}>Clear filters</Button>
      )}
    </Stack>
  );
}

function ReportResultsStep({
  report, theme, onFilterChange, onClearFilters, refreshing,
}: {
  report: GeneratedReport;
  theme: VisualTheme;
  onFilterChange: (column: string, value: string) => void;
  onClearFilters: () => void;
  refreshing: boolean;
}) {
  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6" fontWeight={700}>{report.templateName ?? "Report"}</Typography>
      </Stack>
      {report.primaryTable && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Computed from <strong>{report.primaryTable}</strong>.
        </Typography>
      )}

      <FilterBar
        slicers={report.slicers}
        activeFilters={report.appliedFilters}
        onFilterChange={onFilterChange}
        onClearFilters={onClearFilters}
        disabled={refreshing}
      />
      {refreshing && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {report.warnings.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {report.warnings.join(" ")}
        </Alert>
      )}

      {report.kpis.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {report.kpis.map((kpi) => (
            <Grid key={kpi.label} size={{ xs: 12, sm: 6, md: 3 }}>
              <ReportKpiCard kpi={kpi} color={theme.primary} />
            </Grid>
          ))}
        </Grid>
      )}

      <Stack spacing={2}>
        {report.charts.map((chart) => (
          <ReportChartCard key={chart.title} chart={chart} theme={theme} />
        ))}
      </Stack>
    </Box>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

const STEPS = ["Connect & Style", "Report"];

export function ReportGeneratorPage() {
  const [step, setStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!uploadedFile) return;
    setError(null);
    setGenerating(true);
    try {
      const result = await generateReport(uploadedFile);
      setReport(result);
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report.");
    } finally {
      setGenerating(false);
    }
  }

  async function refetchWithFilters(filters: Record<string, string>) {
    if (!uploadedFile || !report?.templateId) return;
    setRefreshing(true);
    setError(null);
    try {
      const result = await generateReport(uploadedFile, report.templateId, filters);
      setReport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply filter.");
    } finally {
      setRefreshing(false);
    }
  }

  function handleFilterChange(column: string, value: string) {
    if (!report) return;
    const next = { ...report.appliedFilters };
    if (value === "") delete next[column];
    else next[column] = value;
    void refetchWithFilters(next);
  }

  function handleClearFilters() {
    void refetchWithFilters({});
  }

  function handleStartOver() {
    setStep(0);
    setUploadedFile(null);
    setReport(null);
    setError(null);
  }

  const theme = themeById(getPreferredThemeId());

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <ReportIcon color="primary" />
            <Box>
              <Typography variant="h5" fontWeight={600}>Report Generator</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Connect your data and get a real report, styled with your Report Designer theme.
              </Typography>
            </Box>
          </Stack>
          <TrustBadge kind="deterministic" />
        </Stack>

        <Stepper activeStep={step} sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        {step === 0 && (
          <>
            <ConnectAndStyleStep
              uploadedFile={uploadedFile} onUpload={setUploadedFile}
              theme={theme}
            />
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            {generating && (
              <Stack spacing={1} sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Profiling columns and computing your report…
                </Typography>
                <LinearProgress sx={{ borderRadius: 1 }} />
              </Stack>
            )}
          </>
        )}

        {step === 1 && report && (
          <ReportResultsStep
            report={report} theme={theme}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            refreshing={refreshing}
          />
        )}

        <Stack direction="row" justifyContent="flex-end" spacing={2}
          sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: "divider" }}>
          {step === 0 && (
            <Button variant="contained"
              disabled={!uploadedFile || generating}
              onClick={handleGenerate}
              startIcon={generating ? <CircularProgress size={16} color="inherit" /> : undefined}>
              {generating ? "Generating…" : "Generate Report"}
            </Button>
          )}
          {step === 1 && (
            <Button variant="outlined" onClick={handleStartOver}>Start Over</Button>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
