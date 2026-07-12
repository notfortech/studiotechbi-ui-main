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
  CardActionArea,
  CardContent,
  Chip,
  Avatar,
  Alert,
  CircularProgress,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  CheckCircle as CheckCircleIcon,
  AutoGraph as ReportIcon,
  TrendingUp as KpiIcon,
  FilterAlt as FilterIcon,
  Palette as PaletteIcon,
  Bolt as StrictIcon,
  AutoAwesome as AiModeIcon,
  SmartToy as AiConsentIcon,
} from "@mui/icons-material";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
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
  extractSchemaFromExcel,
  generateReportModel,
  recordAiConsent,
  type ExtractedSchemaDto,
  type GenerateReportModelResponse,
  type StarSchema,
  type TableInfo,
} from "../../api/reportDesignerApi";
import {
  generateReport,
  type GeneratedReport,
  type ReportChart,
} from "../../api/reportGeneratorApi";
import { REPORT_THEMES, themeById, MiniReportPreview, type VisualTheme } from "./reportThemes";
import { setPreferredThemeId } from "../../core/reportTheme";
import { TrustBadge, type TrustBadgeKind } from "../../components/common/TrustBadge";

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

// ── Timed progress: the AI model call has no server-side progress signal,
// so this animates toward (not past) an asymptote over the expected
// duration rather than sitting on an indeterminate spinner for 1-3 minutes.
// It never claims to be finished before the real response arrives.

function useTimedProgress(active: boolean, timeConstantSeconds = 55, cap = 92) {
  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    if (!active) {
      setElapsedMs(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => setElapsedMs(Date.now() - start), 250);
    return () => clearInterval(id);
  }, [active]);
  const elapsedSeconds = elapsedMs / 1000;
  const pct = cap * (1 - Math.exp(-elapsedSeconds / timeConstantSeconds));
  return { elapsedSeconds, pct };
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Step 0: Connect Data ──────────────────────────────────────────────────────

function ConnectDataStep({ uploadedFile, onUpload }: { uploadedFile: File | null; onUpload: (f: File) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>Connect Your Data</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload an Excel or CSV file. We'll extract its schema, propose a data model, and generate your
        report from the same file — one upload, start to finish.
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

      <Alert severity="info" sx={{ mt: 3 }}>
        SQL Database and SharePoint connections are being re-added here soon — for now, upload a file directly.
      </Alert>
    </Box>
  );
}

// ── Step 1: Data Model ────────────────────────────────────────────────────────

const NODE_W = 158;
const HEADER_H = 26;
const ROW_H = 16;
const MAX_COLS = 6;
const CX = 350;
const CY = 200;
const RADIUS = 155;

function nodeHeight(colCount: number) {
  return HEADER_H + (Math.min(colCount, MAX_COLS) + 1) * ROW_H + 6;
}

function SchemaNode({ x, y, name, columns, isFact }: {
  x: number; y: number; name: string;
  columns: TableInfo["columns"]; isFact?: boolean;
}) {
  const shown = columns.slice(0, MAX_COLS);
  const h = nodeHeight(columns.length);
  const fill = isFact ? "#4F46E5" : "#3730A3";

  return (
    <g>
      <rect x={x} y={y} width={NODE_W} height={h} rx={5} fill="white" stroke="#c7d2fe" strokeWidth={1} />
      <rect x={x} y={y} width={NODE_W} height={HEADER_H} rx={5} fill={fill} />
      <rect x={x} y={y + HEADER_H - 5} width={NODE_W} height={5} fill={fill} />
      <text x={x + 8} y={y + 17} fontFamily="Inter,sans-serif" fontSize={10.5} fontWeight="bold" fill="white">{name}</text>
      {shown.map((col, i) => (
        <text key={col.columnName} x={x + 8} y={y + HEADER_H + ROW_H * (i + 1) + 2}
          fontFamily="Inter,sans-serif" fontSize={9} fill={i === 0 ? "#3730A3" : "#555"}
          fontWeight={i === 0 ? "600" : "normal"}>
          {i === 0 ? `🔑 ${col.columnName}` : col.columnName}
          <tspan fill="#aaa" fontSize={8}> {col.dataType}</tspan>
        </text>
      ))}
      {columns.length > MAX_COLS && (
        <text x={x + 8} y={y + HEADER_H + ROW_H * (MAX_COLS + 1) + 2}
          fontFamily="Inter,sans-serif" fontSize={8} fill="#aaa">
          +{columns.length - MAX_COLS} more…
        </text>
      )}
    </g>
  );
}

function StarSchemaDiagram({ starSchema, tables }: { starSchema: StarSchema; tables: TableInfo[] }) {
  const tableMap = new Map(tables.map((t) => [t.tableName, t]));
  const factCols = tableMap.get(starSchema.factTable)?.columns ?? [];
  const dims = starSchema.dimensionTables.slice(0, 7);
  const N = dims.length;

  const dimPositions = dims.map((name, i) => {
    const angle = -Math.PI / 2 + (i / N) * 2 * Math.PI;
    const cx = CX + RADIUS * Math.cos(angle);
    const cy = CY + RADIUS * Math.sin(angle);
    return { name, cx, cy, cols: tableMap.get(name)?.columns ?? [] };
  });

  const factH = nodeHeight(factCols.length);
  const factX = CX - NODE_W / 2;
  const factY = CY - factH / 2;

  const allX = dimPositions.map((d) => d.cx - NODE_W / 2 - 8);
  const allY = dimPositions.map((d) => d.cy - nodeHeight(d.cols.length) / 2 - 8);
  const allX2 = dimPositions.map((d) => d.cx + NODE_W / 2 + 8);
  const allY2 = dimPositions.map((d) => d.cy + nodeHeight(d.cols.length) / 2 + 8);
  const vx = Math.min(...allX, factX - 8);
  const vy = Math.min(...allY, factY - 8);
  const vx2 = Math.max(...allX2, factX + NODE_W + 8);
  const vy2 = Math.max(...allY2, factY + factH + 8);
  const vw = vx2 - vx;
  const vh = vy2 - vy;

  const totalCols = tables.reduce((s, t) => s + t.columns.length, 0);

  return (
    <Box>
      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
        <Chip label="Star Schema" size="small" color="primary" />
        <Chip label={`1 Fact · ${dims.length} Dimensions`} size="small" variant="outlined" />
        <Chip label={`${tables.length} Tables · ${totalCols} Columns`} size="small" variant="outlined" />
      </Stack>
      <Paper variant="outlined" sx={{ p: 2, bgcolor: "background.default", overflowX: "auto" }}>
        <svg
          viewBox={`${vx} ${vy} ${vw} ${vh}`}
          style={{ width: "100%", minWidth: 380, maxWidth: 780, display: "block", margin: "0 auto" }}
        >
          <defs>
            <marker id="rg-arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#3730A3" opacity={0.5} />
            </marker>
          </defs>
          {dimPositions.map(({ name, cx, cy }) => (
            <line key={name} x1={cx} y1={cy} x2={CX} y2={CY}
              stroke="#3730A3" strokeWidth={1.5} strokeDasharray="5 3" opacity={0.45}
              markerEnd="url(#rg-arrow)" />
          ))}
          <SchemaNode x={factX} y={factY} name={starSchema.factTable} columns={factCols} isFact />
          {dimPositions.map(({ name, cx, cy, cols }) => (
            <SchemaNode key={name}
              x={cx - NODE_W / 2} y={cy - nodeHeight(cols.length) / 2}
              name={name} columns={cols} />
          ))}
        </svg>
      </Paper>
    </Box>
  );
}

function DataModelStep({
  extractedSchema, modelResult, generating, generateError, aiDeclined,
}: {
  extractedSchema: ExtractedSchemaDto;
  modelResult: GenerateReportModelResponse | null;
  generating: boolean;
  generateError: string | null;
  aiDeclined: boolean;
}) {
  const { elapsedSeconds, pct } = useTimedProgress(generating);

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>Generated Data Model</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Based on <strong>{extractedSchema.fileName}</strong> ({extractedSchema.tables.length} table{extractedSchema.tables.length !== 1 ? "s" : ""}
        {" "}· extracted {new Date(extractedSchema.extractedAt).toLocaleTimeString()}),
        the AI is inferring a star schema and scoring report templates.
      </Typography>

      {generateError && <Alert severity="error" sx={{ mb: 2 }}>{generateError}</Alert>}

      {aiDeclined ? (
        <Alert severity="info">
          AI matching was skipped, as you chose not to share your schema with it. Pick a report
          template manually on the next step.
        </Alert>
      ) : generating ? (
        <Stack spacing={1.5} sx={{ py: 4 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline">
            <Typography variant="body2" color="text.secondary">
              Analysing schema and generating your model — usually takes 1–3 minutes.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {formatElapsed(elapsedSeconds)} elapsed
            </Typography>
          </Stack>
          <LinearProgress variant="determinate" value={pct} sx={{ borderRadius: 1, height: 8 }} />
          {elapsedSeconds > 150 && (
            <Typography variant="caption" color="text.secondary" textAlign="center">
              Still working — complex datasets can take a little longer than usual.
            </Typography>
          )}
        </Stack>
      ) : modelResult ? (
        <Box>
          {modelResult.starSchema ? (
            <StarSchemaDiagram starSchema={modelResult.starSchema} tables={extractedSchema.tables} />
          ) : (
            <Alert severity="warning">
              Couldn't infer a star schema for this dataset — template selection and report generation
              will still work, just without the schema preview above.
            </Alert>
          )}
          <Alert severity="info" sx={{ mt: 2 }}>
            Model generated in {modelResult.durationMs.toLocaleString()} ms.
          </Alert>
        </Box>
      ) : null}
    </Box>
  );
}

// ── Step 2: Report Template ───────────────────────────────────────────────────

function TemplateStep({
  modelResult, selected, onSelect,
}: {
  modelResult: GenerateReportModelResponse | null;
  selected: number | null;
  onSelect: (i: number) => void;
}) {
  const apiTemplates = modelResult?.templates;
  const themes = apiTemplates?.length
    ? apiTemplates.map((t) => ({ visual: themeById(t.themeId), score: t.score, apiName: t.themeName }))
    : REPORT_THEMES.map((t) => ({ visual: t, score: 0, apiName: t.name }));

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>Choose a Report Template</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Each template applies a colour theme to your KPI tiles, charts, and tables across every report page.
        {modelResult && " Templates are scored by the AI based on your data's characteristics."}
      </Typography>

      <Grid container spacing={2}>
        {themes.map(({ visual, score, apiName }, i) => (
          <Grid key={visual.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card variant="outlined" sx={{
              borderColor: selected === i ? "primary.main" : "divider",
              borderWidth: selected === i ? 2 : 1,
              transition: "all 0.15s",
              height: "100%",
            }}>
              <CardActionArea
                onClick={() => { onSelect(i); setPreferredThemeId(visual.id); }}
                sx={{ height: "100%" }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <PaletteIcon sx={{ fontSize: 16, color: visual.primary }} />
                      <Typography variant="subtitle2" fontWeight={700}>{apiName}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {score >= 0.8 && (
                        <Chip label="Recommended" size="small" color="primary" sx={{ fontSize: 10, height: 20 }} />
                      )}
                      {selected === i && <CheckCircleIcon color="primary" fontSize="small" />}
                    </Stack>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                    {visual.label}{score > 0 ? ` · match ${Math.round(score * 100)}%` : ""}
                  </Typography>
                  <MiniReportPreview theme={visual} />
                  <Stack direction="row" spacing={0.5} sx={{ mt: 1.5 }}>
                    {[visual.dark, visual.primary, visual.light, visual.bg].map((color) => (
                      <Box key={color} sx={{
                        width: 18, height: 18, borderRadius: "50%", bgcolor: color,
                        border: "1px solid", borderColor: "divider",
                      }} />
                    ))}
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, alignSelf: "center" }}>
                      {visual.primary}
                    </Typography>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

// ── Step 3: Report ────────────────────────────────────────────────────────────

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

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>{chart.title}</Typography>
        <ResponsiveContainer width="100%" height={300}>
          {chart.type === "line" ? (
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
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
              <XAxis dataKey="label" />
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

type Mode = "strict" | "ai";
type FlowStep = "connect" | "model" | "template" | "report";

const STEPS_BY_MODE: Record<Mode, { key: FlowStep; label: string }[]> = {
  strict: [
    { key: "connect", label: "Connect Data" },
    { key: "template", label: "Report Template" },
    { key: "report", label: "Report" },
  ],
  ai: [
    { key: "connect", label: "Connect Data" },
    { key: "model", label: "Data Model" },
    { key: "template", label: "Report Template" },
    { key: "report", label: "Report" },
  ],
};

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>How do you want to generate your report?</Typography>
      <ToggleButtonGroup
        exclusive
        value={mode}
        onChange={(_, v) => v && onChange(v)}
        sx={{ mb: 1 }}
      >
        <ToggleButton value="strict" sx={{ textTransform: "none", px: 2, py: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <StrictIcon fontSize="small" />
            <Box textAlign="left">
              <Typography variant="body2" fontWeight={700}>Strict Python Report</Typography>
              <Typography variant="caption" color="text.secondary">Fastest — no AI involved anywhere</Typography>
            </Box>
          </Stack>
        </ToggleButton>
        <ToggleButton value="ai" sx={{ textTransform: "none", px: 2, py: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <AiModeIcon fontSize="small" />
            <Box textAlign="left">
              <Typography variant="body2" fontWeight={700}>AI-Assisted</Typography>
              <Typography variant="caption" color="text.secondary">AI proposes a model &amp; template match</Typography>
            </Box>
          </Stack>
        </ToggleButton>
      </ToggleButtonGroup>
      <Typography variant="caption" color="text.secondary" display="block">
        {mode === "strict"
          ? "Skips schema analysis entirely — you'll pick a theme and get a report in one pass."
          : "AI compares your schema against report templates and proposes a data model. The report itself is always generated by the deterministic Python/.NET engine below — never AI."}
      </Typography>
    </Box>
  );
}

export function ReportGeneratorPage() {
  const { user } = useAuth();
  const clientId = user?.clientCode ?? "";

  const [mode, setMode] = useState<Mode>("strict");
  const [flowStep, setFlowStep] = useState<FlowStep>("connect");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const [extractedSchema, setExtractedSchema] = useState<ExtractedSchemaDto | null>(null);
  const [modelResult, setModelResult] = useState<GenerateReportModelResponse | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [modelGenerating, setModelGenerating] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  // AI consent gate — shown after schema extraction, before any AI call is made.
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [consentDeciding, setConsentDeciding] = useState(false);
  const [aiDeclined, setAiDeclined] = useState(false);

  const [selectedTheme, setSelectedTheme] = useState<number | null>(null);

  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const steps = STEPS_BY_MODE[mode];
  const activeIndex = steps.findIndex((s) => s.key === flowStep);

  async function handleConnectNext() {
    if (!uploadedFile) return;

    if (mode === "strict") {
      setFlowStep("template");
      return;
    }

    setExtractError(null);
    setExtracting(true);
    try {
      const schema = await extractSchemaFromExcel(uploadedFile);
      setExtractedSchema(schema);
      setFlowStep("model");
      setAiDeclined(false);

      // Ask before the schema is ever sent to AI — generation only starts once
      // the user responds to the consent dialog.
      setConsentDialogOpen(true);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Failed to extract schema.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleConsentDecision(granted: boolean) {
    if (!extractedSchema) return;

    setConsentDeciding(true);
    try {
      await recordAiConsent(clientId, extractedSchema.schemaHash, granted);
    } catch (err) {
      if (granted) {
        // Can't proceed to generation without a recorded grant — the backend
        // will reject it anyway. Surface the error and let the user retry.
        setConsentDeciding(false);
        setConsentDialogOpen(false);
        setModelError(err instanceof Error ? err.message : "Failed to record consent.");
        return;
      }
      // Decline is logged server-side on a best-effort basis; still honour the
      // user's choice locally even if the request itself failed.
    }

    setConsentDeciding(false);
    setConsentDialogOpen(false);

    if (!granted) {
      setAiDeclined(true);
      return;
    }

    setModelGenerating(true);
    setModelError(null);
    try {
      const model = await generateReportModel(clientId, extractedSchema);
      setModelResult(model);
    } catch (err) {
      setModelError(err instanceof Error ? err.message : "Model generation failed.");
    } finally {
      setModelGenerating(false);
    }
  }

  async function handleGenerateReport() {
    if (!uploadedFile) return;
    setReportError(null);
    setReportGenerating(true);
    try {
      const result = await generateReport(uploadedFile);
      setReport(result);
      setFlowStep("report");
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Failed to generate report.");
    } finally {
      setReportGenerating(false);
    }
  }

  async function refetchWithFilters(filters: Record<string, string>) {
    if (!uploadedFile || !report?.templateId) return;
    setRefreshing(true);
    setReportError(null);
    try {
      const result = await generateReport(uploadedFile, report.templateId, filters);
      setReport(result);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Failed to apply filter.");
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

  function handleBack() {
    if (activeIndex > 0) setFlowStep(steps[activeIndex - 1].key);
  }

  function handleStartOver() {
    setFlowStep("connect");
    setUploadedFile(null);
    setExtractedSchema(null);
    setModelResult(null);
    setSelectedTheme(null);
    setReport(null);
    setExtractError(null);
    setModelError(null);
    setReportError(null);
    setAiDeclined(false);
  }

  const theme = REPORT_THEMES[selectedTheme ?? 0];
  const canProceedConnect = !!uploadedFile && !extracting;
  const canProceedModel = !modelGenerating;
  const canProceedTemplate = selectedTheme !== null && !reportGenerating;
  const badgeKind: TrustBadgeKind = flowStep === "report" ? "deterministic" : mode === "strict" ? "deterministic" : "ai";

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <ReportIcon color="primary" />
            <Box>
              <Typography variant="h5" fontWeight={600}>Report Generator</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Connect your data, pick a theme, and get a real report — generated by a deterministic engine, never AI.
              </Typography>
            </Box>
          </Stack>
          <TrustBadge kind={badgeKind} />
        </Stack>

        <Stepper activeStep={activeIndex} sx={{ mb: 4 }}>
          {steps.map((s) => (
            <Step key={s.key}><StepLabel>{s.label}</StepLabel></Step>
          ))}
        </Stepper>

        {flowStep === "connect" && (
          <>
            <ModeToggle mode={mode} onChange={setMode} />
            <ConnectDataStep uploadedFile={uploadedFile} onUpload={setUploadedFile} />
            {extractError && <Alert severity="error" sx={{ mt: 2 }}>{extractError}</Alert>}
          </>
        )}

        {flowStep === "model" && extractedSchema && (
          <DataModelStep
            extractedSchema={extractedSchema}
            modelResult={modelResult}
            generating={modelGenerating}
            generateError={modelError}
            aiDeclined={aiDeclined}
          />
        )}

        {flowStep === "template" && (
          <>
            <TemplateStep modelResult={modelResult} selected={selectedTheme} onSelect={setSelectedTheme} />
            {reportError && <Alert severity="error" sx={{ mt: 2 }}>{reportError}</Alert>}
          </>
        )}

        {flowStep === "report" && report && (
          <ReportResultsStep
            report={report} theme={theme}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            refreshing={refreshing}
          />
        )}

        <Stack direction="row" justifyContent="flex-end" spacing={2}
          sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: "divider" }}>
          {activeIndex > 0 && flowStep !== "report" && (
            <Button variant="outlined" onClick={handleBack}
              disabled={(flowStep === "model" && modelGenerating) || reportGenerating}>
              Back
            </Button>
          )}
          {flowStep === "connect" && (
            <Button variant="contained"
              disabled={!canProceedConnect}
              onClick={handleConnectNext}
              startIcon={extracting ? <CircularProgress size={16} color="inherit" /> : undefined}>
              {extracting ? "Extracting schema…" : "Next"}
            </Button>
          )}
          {flowStep === "model" && (
            <Button variant="contained" disabled={!canProceedModel} onClick={() => setFlowStep("template")}>
              {modelGenerating ? "Generating model…" : "Next"}
            </Button>
          )}
          {flowStep === "template" && (
            <Button variant="contained"
              disabled={!canProceedTemplate}
              onClick={handleGenerateReport}
              startIcon={reportGenerating ? <CircularProgress size={16} color="inherit" /> : undefined}>
              {reportGenerating ? "Generating report…" : "Generate Report"}
            </Button>
          )}
          {flowStep === "report" && (
            <Button variant="outlined" onClick={handleStartOver}>Start Over</Button>
          )}
        </Stack>
      </Paper>

      <Dialog open={consentDialogOpen} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AiConsentIcon color="primary" />
            <span>Use AI to analyse your data's structure?</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            We'll send only your column names and data types — never the data itself — to
            recommend the closest-matching report model and template. You can decline and
            choose a template manually instead.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => handleConsentDecision(false)} disabled={consentDeciding}>
            Not now
          </Button>
          <Button
            variant="contained"
            onClick={() => handleConsentDecision(true)}
            disabled={consentDeciding}
            startIcon={consentDeciding ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Allow AI matching
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
