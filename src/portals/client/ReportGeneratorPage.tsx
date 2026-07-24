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
  Drawer,
  IconButton,
  Skeleton,
  Tooltip as MuiTooltip,
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  CheckCircle as CheckCircleIcon,
  FilterAlt as FilterIcon,
  Palette as PaletteIcon,
  Bolt as StrictIcon,
  AutoAwesome as AiModeIcon,
  WorkspacePremium as PremiumIcon,
  Lock as LockIcon,
  BarChart as BarFormatIcon,
  DonutLarge as DonutFormatIcon,
  FormatListNumbered as RankedFormatIcon,
  TrackChanges as RadarFormatIcon,
  ShowChart as LineFormatIcon,
  Timeline as AreaFormatIcon,
  SmartToy as AiConsentIcon,
  PictureAsPdf as PdfIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
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
  matchSchemaModel,
  recordDataUsageConsent,
  generateDashboardTemplate,
  type ExtractedSchemaDto,
  type GenerateReportModelResponse,
  type StarSchema,
  type TableInfo,
  type ReportMatchResult,
  type GenerateDashboardTemplateResponse,
  type AiProvider,
} from "../../api/reportDesignerApi";
import {
  generateReport,
  getReportAiSummary,
  exportReportPdf,
  type GeneratedReport,
  type ReportChart,
  type ReportAiSummary,
} from "../../api/reportGeneratorApi";
import { REPORT_THEMES, themeById, MiniReportPreview, type VisualTheme } from "./reportThemes";
import { getCreditBalance, type CreditBalance } from "../../api/creditsApi";
import { setPreferredThemeId } from "../../core/reportTheme";
import { TrustBadge, type TrustBadgeKind } from "../../components/common/TrustBadge";
import { Eyebrow } from "../../components/common/Eyebrow";
import { Accent } from "../../components/common/Accent";
import { MetricTile } from "../../components/common/MetricTile";

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
//
// Past AI_HARD_CEILING_SECONDS the call is genuinely taking longer than the
// client-side timeout (AI_MATCH_TIMEOUT_MS in apiClient.ts) allows for, so
// the caller should stop trusting this animation and offer a way out.

const AI_HARD_CEILING_SECONDS = 220;

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

// ── Schema/model/template library match (Story 3) ────────────────────────────

function SchemaModelMatchPanel({
  matching, matchError, matchResult, dataConsentRecordedAt, dataConsentDeciding, dataConsentError, onOpenConsent,
}: {
  matching: boolean;
  matchError: string | null;
  matchResult: ReportMatchResult | null;
  dataConsentRecordedAt: string | null;
  dataConsentDeciding: boolean;
  dataConsentError: string | null;
  onOpenConsent: () => void;
}) {
  return (
    <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: "divider" }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>Matched Report Model</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Separately, your schema is checked against our library of pre-built industry report models —
        the model and dashboard template your report can eventually be published against.
      </Typography>

      {matchError && <Alert severity="error" sx={{ mb: 2 }}>{matchError}</Alert>}

      {matching ? (
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">Matching against the model library…</Typography>
        </Stack>
      ) : matchResult?.pendingSupportReview ? (
        <Alert severity="info">
          No confident match in the library — the AI proposed a new model, <strong>{matchResult.schemaModelName}</strong>,
          now pending internal review before it can be used. Check back once it's approved.
        </Alert>
      ) : matchResult?.schemaModelId ? (
        <Box>
          {matchResult.matchSource === "AiProposedNew" && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Nothing in the library was a good fit, so the AI proposed a new model and dashboard
              template below — added to the library immediately, no review step.
            </Alert>
          )}
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
            <Chip label={matchResult.industry || "Cross-Industry"} size="small" color="primary" />
            <Chip
              label={
                matchResult.matchSource === "AiProposedNew" ? "AI-proposed (new)"
                  : matchResult.matchSource === "AiMatched" ? "AI-matched"
                  : "Matched"
              }
              size="small" variant="outlined"
            />
            {matchResult.matchSource !== "AiProposedNew" && (
              <Chip label={`Confidence ${Math.round(matchResult.confidence * 100)}%`} size="small" variant="outlined" />
            )}
          </Stack>

          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>{matchResult.schemaModelName}</Typography>
            <Stack spacing={0.5}>
              {matchResult.columnMappings.map((m) => (
                <Stack key={m.fieldName} direction="row" spacing={1.5} alignItems="center"
                  sx={{ py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>
                  {m.included
                    ? <CheckCircleIcon color="success" fontSize="small" />
                    : <Box sx={{ width: 18, height: 18, borderRadius: "50%", border: "1px solid", borderColor: "divider", flexShrink: 0 }} />}
                  <Typography variant="body2" fontWeight={600} sx={{ minWidth: 170 }}>
                    {m.fieldName}{m.isRequired && <Typography component="span" color="error.main"> *</Typography>}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70 }}>{m.dataType}</Typography>
                  <Typography variant="body2" color={m.included ? "text.primary" : "text.disabled"}>
                    {m.clientColumnName ?? "— not found in your data —"}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>

          {matchResult.candidateTemplates.length > 0 && (
            <Stack direction="row" spacing={1.5} flexWrap="wrap" gap={1.5} sx={{ mb: 3 }}>
              {matchResult.candidateTemplates.map((t) => (
                <Card key={t.templateId} variant="outlined" sx={{ minWidth: 220 }}>
                  <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PaletteIcon fontSize="small" color="primary" />
                      <Typography variant="body2" fontWeight={700}>{t.templateName}</Typography>
                    </Stack>
                    <Chip
                      label={t.isPublishReady ? "Ready to publish" : "Not yet publish-ready"}
                      size="small" color={t.isPublishReady ? "success" : "default"}
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}

          {dataConsentError && <Alert severity="error" sx={{ mb: 2 }}>{dataConsentError}</Alert>}

          {dataConsentRecordedAt ? (
            <Alert severity="success">
              Data usage consent recorded at {new Date(dataConsentRecordedAt).toLocaleTimeString()}.
            </Alert>
          ) : (
            <Button
              variant="contained"
              onClick={onOpenConsent}
              disabled={dataConsentDeciding}
              startIcon={dataConsentDeciding ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              Confirm data usage &amp; continue
            </Button>
          )}
        </Box>
      ) : !matchError ? (
        <Alert severity="warning">No confident match found in the model library.</Alert>
      ) : null}
    </Box>
  );
}

// ── Dashboard Template Generator result (provenance log + visual log + deploy status) ──────────

function ProvenanceList({ provenance }: { provenance: GenerateDashboardTemplateResponse["provenance"] }) {
  if (provenance.length === 0) return null;
  return (
    <Stack spacing={0.5}>
      {provenance.map((p) => (
        <Stack key={`${p.table}.${p.column}`} direction="row" spacing={1.5} alignItems="center"
          sx={{ py: 0.5, borderBottom: "1px solid", borderColor: "divider" }}>
          <Chip
            label={p.source === "uploaded" ? "Uploaded" : "Mocked"}
            size="small"
            color={p.source === "uploaded" ? "success" : "warning"}
            sx={{ minWidth: 76 }}
          />
          <Typography variant="body2" fontWeight={600} sx={{ minWidth: 160 }}>
            {p.table}[{p.column}]
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70 }}>{p.dataType}</Typography>
          <Typography variant="caption" color="text.secondary">{p.rowCount} row{p.rowCount !== 1 ? "s" : ""}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

function DashboardTemplateResultPanel({ result }: { result: GenerateDashboardTemplateResponse }) {
  const uploadedCount = result.provenance.filter((p) => p.source === "uploaded").length;
  const mockedCount = result.provenance.filter((p) => p.source === "mocked").length;
  const powerBiUrl = result.deployed && result.workspaceId && result.reportId
    ? `https://app.powerbi.com/groups/${result.workspaceId}/reports/${result.reportId}`
    : null;

  return (
    <Box>
      <Alert severity={result.deployed ? "success" : "warning"} sx={{ mb: 2 }}>
        {result.summary}
      </Alert>

      {result.designBlueprintLabel && (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip size="small" color="primary" label={result.designBlueprintLabel} />
          {result.designBlueprintTier && (
            <Chip size="small" variant="outlined" label={result.designBlueprintTier} />
          )}
        </Stack>
      )}

      {powerBiUrl && (
        <Button
          variant="contained"
          color="success"
          href={powerBiUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ mb: 2 }}
        >
          Open in Power BI
        </Button>
      )}

      {result.deployed && (
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: "background.default" }}>
          <Stack direction="row" spacing={3} flexWrap="wrap" gap={1}>
            <Typography variant="caption" sx={{ fontFamily: "monospace" }}>Workspace: {result.workspaceId}</Typography>
            <Typography variant="caption" sx={{ fontFamily: "monospace" }}>Dataset: {result.datasetId}</Typography>
            <Typography variant="caption" sx={{ fontFamily: "monospace" }}>Report: {result.reportId}</Typography>
          </Stack>
        </Paper>
      )}

      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        Data provenance — {uploadedCount} from your file, {mockedCount} mocked
      </Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 2, maxHeight: 260, overflowY: "auto" }}>
        <ProvenanceList provenance={result.provenance} />
      </Paper>

      {result.visualGenerationLog.length > 0 && (
        <>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Generation log</Typography>
          <Paper variant="outlined" sx={{ p: 2, mb: 2, maxHeight: 220, overflowY: "auto" }}>
            <Stack spacing={0.75}>
              {result.visualGenerationLog.map((line, i) => (
                <Typography key={i} variant="caption" color="text.secondary">• {line}</Typography>
              ))}
            </Stack>
          </Paper>
        </>
      )}

      {result.blendedDatasetDownloadUrl && (
        <Button
          variant="outlined"
          size="small"
          href={result.blendedDatasetDownloadUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Download blended dataset
        </Button>
      )}
    </Box>
  );
}

function DataModelStep({
  extractedSchema, modelResult, generating, generateError, aiDeclined,
  matching, matchError, matchResult, dataConsentRecordedAt, dataConsentDeciding, dataConsentError, onOpenDataConsent,
  onCancelGeneration,
  generatingTemplate, templateError, templateResult, onGenerateTemplate,
}: {
  extractedSchema: ExtractedSchemaDto;
  modelResult: GenerateReportModelResponse | null;
  generating: boolean;
  generateError: string | null;
  aiDeclined: boolean;
  matching: boolean;
  matchError: string | null;
  matchResult: ReportMatchResult | null;
  dataConsentRecordedAt: string | null;
  dataConsentDeciding: boolean;
  dataConsentError: string | null;
  onOpenDataConsent: () => void;
  onCancelGeneration: () => void;
  generatingTemplate: boolean;
  templateError: string | null;
  templateResult: GenerateDashboardTemplateResponse | null;
  onGenerateTemplate: () => void;
}) {
  const { elapsedSeconds, pct } = useTimedProgress(generating);
  const pastHardCeiling = elapsedSeconds > AI_HARD_CEILING_SECONDS;

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
          {elapsedSeconds > 150 && !pastHardCeiling && (
            <Typography variant="caption" color="text.secondary" textAlign="center">
              Still working — complex datasets can take a little longer than usual.
            </Typography>
          )}
          {pastHardCeiling && (
            <Alert
              severity="warning"
              action={
                <Button color="inherit" size="small" onClick={onCancelGeneration}>
                  Cancel
                </Button>
              }
            >
              This is taking longer than expected — it may still complete, but you can cancel and
              try again, or pick a report template manually instead.
            </Alert>
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

          {modelResult.blueprint && (
            <Box sx={{ mt: 2 }}>
              {templateResult ? (
                <DashboardTemplateResultPanel result={templateResult} />
              ) : (
                <Stack spacing={1}>
                  {templateError && <Alert severity="error">{templateError}</Alert>}
                  <Button
                    variant="contained"
                    startIcon={generatingTemplate ? <CircularProgress size={16} color="inherit" /> : <AiConsentIcon />}
                    disabled={generatingTemplate}
                    onClick={onGenerateTemplate}
                    sx={{ alignSelf: "flex-start" }}
                  >
                    {generatingTemplate ? "Generating Dashboard Template…" : "Generate Dashboard Template"}
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Blends your uploaded data with mock data for any missing fields, generates a real
                    Power BI report with visuals, and publishes it to your workspace. This can take a
                    few minutes.
                  </Typography>
                </Stack>
              )}
            </Box>
          )}
        </Box>
      ) : null}

      {!aiDeclined && (
        <SchemaModelMatchPanel
          matching={matching}
          matchError={matchError}
          matchResult={matchResult}
          dataConsentRecordedAt={dataConsentRecordedAt}
          dataConsentDeciding={dataConsentDeciding}
          dataConsentError={dataConsentError}
          onOpenConsent={onOpenDataConsent}
        />
      )}
    </Box>
  );
}

// ── AI credit balance — same shared ledger as Blueprint generation ─────────────
// Plans that unlock the premium (dark dashboard) report templates. Matches the
// plan names seeded in stbi-agenthost (Trial/Starter/Professional/Enterprise) —
// gating is by plan tier, not a per-use credit charge, same as white-labeling.

const PREMIUM_TEMPLATE_PLANS = new Set(["Professional", "Enterprise"]);

function CreditBalanceBadge({ balance }: { balance: CreditBalance | null }) {
  if (!balance || (balance.creditsRemaining === null && !balance.isUnlimited)) return null;

  const low = !balance.isUnlimited && (balance.creditsRemaining ?? 0) <= 2;
  const label = balance.isUnlimited
    ? "Unlimited AI credits"
    : `${balance.creditsRemaining} AI credit${balance.creditsRemaining === 1 ? "" : "s"} left`;

  return (
    <Chip
      size="small"
      icon={<AiModeIcon sx={{ fontSize: 14 }} />}
      label={label}
      sx={{
        fontWeight: 700,
        bgcolor: low ? "error.light" : "secondary.light",
        color: low ? "#FFFFFF" : "#1A1204",
      }}
    />
  );
}

// ── Step 2: Report Template ───────────────────────────────────────────────────

function TemplateStep({
  modelResult, selected, onSelect, planTier,
}: {
  modelResult: GenerateReportModelResponse | null;
  selected: number | null;
  onSelect: (i: number) => void;
  planTier: string | null;
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
        {themes.map(({ visual, score, apiName }, i) => {
          const locked = visual.tier === "premium" && !!planTier && !PREMIUM_TEMPLATE_PLANS.has(planTier);
          return (
            <Grid key={visual.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined" sx={{
                borderColor: selected === i ? "primary.main" : "divider",
                borderWidth: selected === i ? 2 : 1,
                transition: "all 0.15s",
                height: "100%",
                opacity: locked ? 0.6 : 1,
              }}>
                <CardActionArea
                  disabled={locked}
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
                        {visual.tier === "premium" && (
                          <Chip
                            icon={locked ? <LockIcon sx={{ fontSize: 13 }} /> : <PremiumIcon sx={{ fontSize: 13 }} />}
                            label="Premium"
                            size="small"
                            sx={{ fontSize: 10, height: 20, bgcolor: "secondary.light", color: "#1A1204", fontWeight: 700 }}
                          />
                        )}
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
                    {locked && (
                      <Typography variant="caption" sx={{ display: "block", mt: 1, color: "warning.dark", fontWeight: 600 }}>
                        Upgrade to Professional or Enterprise to unlock
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}

// ── Step 3: Report ────────────────────────────────────────────────────────────

// Formats a raw KPI value per its (best-effort) unit hint from the engine — currency/percent/
// days get their own presentation, everything else falls back to a plain formatted number.
function formatKpiValue(value: number, unit?: string | null): string {
  switch (unit) {
    case "currency":
      return value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
    case "percent":
      return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
    case "days":
      return `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}d`;
    default:
      return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
}

function ChangeBadge({ change }: { change: number }) {
  const up = change >= 0;
  return (
    <Typography
      component="span"
      variant="caption"
      sx={{ color: up ? "success.main" : "error.main", fontWeight: 700, ml: 0.75 }}
    >
      {up ? "▲" : "▼"} {Math.abs(change).toLocaleString(undefined, { maximumFractionDigits: 1 })}%
    </Typography>
  );
}

function ReportKpiCard({ kpi, theme }: { kpi: GeneratedReport["kpis"][number]; theme: VisualTheme }) {
  const isDark = theme.mode === "dark";
  const value = formatKpiValue(kpi.value, kpi.unit);
  const caption = `${kpi.aggregation} of ${kpi.column}`;
  const changeNode = kpi.change != null ? <ChangeBadge change={kpi.change} /> : null;

  if (!isDark) {
    return (
      <MetricTile
        label={kpi.label}
        value={<>{value}{changeNode}</>}
        caption={caption}
        accent="blue"
      />
    );
  }

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: alpha(theme.light, 0.18),
        borderRadius: 2,
        p: 2.25,
        height: "100%",
        bgcolor: alpha(theme.dark, 0.55),
      }}
    >
      <Typography variant="overline" sx={{ color: alpha("#FFFFFF", 0.55), display: "block" }}>
        {kpi.label}
      </Typography>
      <Typography
        sx={{
          fontFamily: '"Newsreader", Georgia, serif',
          fontWeight: 700,
          fontSize: 30,
          lineHeight: 1.15,
          color: theme.primary,
          mt: 0.5,
        }}
      >
        {value}
        {changeNode}
      </Typography>
      <Typography variant="caption" sx={{ color: alpha("#FFFFFF", 0.55), mt: 0.5, display: "block" }}>
        {caption}
      </Typography>
    </Box>
  );
}

// ── Extra visual formats for the deterministic (non-AI) report charts ───────
// The backend only ever emits "line" or "bar" chart specs (categories/x +
// series of numbers) — everything below is purely a different presentation
// of that same data, chosen client-side, so it needs no API changes.

type BarFormat = "bar" | "donut" | "ranked" | "radar";
type LineFormat = "line" | "area";

const BAR_FORMATS: { value: BarFormat; label: string; Icon: typeof BarFormatIcon }[] = [
  { value: "bar", label: "Bar", Icon: BarFormatIcon },
  { value: "donut", label: "Donut", Icon: DonutFormatIcon },
  { value: "ranked", label: "Ranked list", Icon: RankedFormatIcon },
  { value: "radar", label: "Radar", Icon: RadarFormatIcon },
];

const LINE_FORMATS: { value: LineFormat; label: string; Icon: typeof LineFormatIcon }[] = [
  { value: "line", label: "Line", Icon: LineFormatIcon },
  { value: "area", label: "Area", Icon: AreaFormatIcon },
];

function RankedList({ chart, colors, isDark }: { chart: ReportChart; colors: string[]; isDark: boolean }) {
  const labels = chart.categories ?? chart.x ?? [];
  const primarySeries = chart.series[0];
  const rows = labels
    .map((label, i) => ({
      label,
      value: primarySeries?.values[i] ?? 0,
      percent: primarySeries?.percentOfTotal?.[i],
    }))
    .sort((a, b) => b.value - a.value);
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <Stack spacing={1.75} sx={{ px: 0.5, py: 1 }}>
      {rows.map((row, i) => (
        <Box key={row.label}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography
              variant="caption"
              sx={{ color: isDark ? alpha("#FFFFFF", 0.78) : "text.secondary", fontWeight: 600 }}
            >
              {i + 1}. {row.label}
            </Typography>
            <Typography variant="caption" sx={{ color: isDark ? "#FFFFFF" : "text.primary", fontWeight: 700 }}>
              {row.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              {row.percent != null && (
                <Typography component="span" variant="caption" sx={{ color: isDark ? alpha("#FFFFFF", 0.55) : "text.secondary", ml: 0.5 }}>
                  ({row.percent.toLocaleString(undefined, { maximumFractionDigits: 1 })}%)
                </Typography>
              )}
            </Typography>
          </Stack>
          <Box
            sx={{
              height: 6,
              borderRadius: 3,
              overflow: "hidden",
              bgcolor: isDark ? alpha("#FFFFFF", 0.08) : "action.hover",
            }}
          >
            <Box
              sx={{
                height: "100%",
                width: `${(row.value / max) * 100}%`,
                borderRadius: 3,
                bgcolor: colors[i % colors.length],
                transition: "width 400ms ease",
              }}
            />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

function ReportChartCard({ chart, theme }: { chart: ReportChart; theme: VisualTheme }) {
  const data = toChartData(chart);
  const colors = colorCycle(theme);
  const isDark = theme.mode === "dark";
  const isBarFamily = chart.type === "bar";
  const [barFormat, setBarFormat] = useState<BarFormat>("bar");
  const [lineFormat, setLineFormat] = useState<LineFormat>("line");

  const axisColor = isDark ? alpha("#FFFFFF", 0.55) : undefined;
  const gridColor = isDark ? alpha("#FFFFFF", 0.1) : undefined;
  const tooltipStyle = isDark
    ? { backgroundColor: theme.dark, border: `1px solid ${alpha("#FFFFFF", 0.12)}`, borderRadius: 8, color: "#FFFFFF" }
    : undefined;
  const legendStyle = isDark ? { color: "#FFFFFF" } : undefined;
  const toggleSx = {
    "& .MuiToggleButton-root": {
      color: isDark ? alpha("#FFFFFF", 0.6) : undefined,
      borderColor: isDark ? alpha("#FFFFFF", 0.16) : undefined,
    },
    "& .Mui-selected": {
      color: `${theme.primary} !important`,
      backgroundColor: isDark ? `${alpha(theme.primary, 0.18)} !important` : undefined,
    },
  };

  return (
    <Card
      variant="outlined"
      sx={isDark ? { bgcolor: alpha(theme.dark, 0.4), borderColor: alpha(theme.light, 0.16) } : undefined}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ color: isDark ? "#FFFFFF" : "text.primary" }}>
            {chart.title}
          </Typography>
          {isBarFamily ? (
            <ToggleButtonGroup size="small" exclusive value={barFormat}
              onChange={(_, v: BarFormat | null) => v && setBarFormat(v)} sx={toggleSx}>
              {BAR_FORMATS.map(({ value, label, Icon }) => (
                <ToggleButton key={value} value={value} aria-label={label}>
                  <Icon sx={{ fontSize: 16 }} />
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          ) : (
            <ToggleButtonGroup size="small" exclusive value={lineFormat}
              onChange={(_, v: LineFormat | null) => v && setLineFormat(v)} sx={toggleSx}>
              {LINE_FORMATS.map(({ value, label, Icon }) => (
                <ToggleButton key={value} value={value} aria-label={label}>
                  <Icon sx={{ fontSize: 16 }} />
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
        </Stack>

        {isBarFamily && barFormat === "ranked" ? (
          <RankedList chart={chart} colors={colors} isDark={isDark} />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            {!isBarFamily ? (
              lineFormat === "area" ? (
                <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="label" tick={axisColor ? { fill: axisColor } : undefined} />
                  <YAxis tick={axisColor ? { fill: axisColor } : undefined} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={legendStyle} />
                  {chart.series.map((s, i) => (
                    <Area key={s.name} type="monotone" dataKey={s.name} name={s.name}
                      stroke={colors[i % colors.length]} fill={colors[i % colors.length]} fillOpacity={0.25} />
                  ))}
                </AreaChart>
              ) : (
                <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="label" tick={axisColor ? { fill: axisColor } : undefined} />
                  <YAxis tick={axisColor ? { fill: axisColor } : undefined} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={legendStyle} />
                  {chart.series.map((s, i) => (
                    <Line key={s.name} type="monotone" dataKey={s.name} name={s.name}
                      stroke={colors[i % colors.length]} dot={false} />
                  ))}
                </LineChart>
              )
            ) : barFormat === "donut" ? (
              <PieChart>
                <Pie data={data} dataKey={chart.series[0]?.name} nameKey="label"
                  innerRadius="55%" outerRadius="85%" paddingAngle={2}>
                  {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={legendStyle} />
              </PieChart>
            ) : barFormat === "radar" ? (
              <RadarChart data={data}>
                <PolarGrid stroke={gridColor} />
                <PolarAngleAxis dataKey="label" tick={{ fill: axisColor ?? "#666", fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fill: axisColor ?? "#666", fontSize: 10 }} />
                {chart.series.map((s, i) => (
                  <Radar key={s.name} dataKey={s.name} name={s.name}
                    stroke={colors[i % colors.length]} fill={colors[i % colors.length]} fillOpacity={0.25} />
                ))}
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={legendStyle} />
              </RadarChart>
            ) : (
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="label" tick={axisColor ? { fill: axisColor } : undefined} />
                <YAxis tick={axisColor ? { fill: axisColor } : undefined} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={legendStyle} />
                {chart.series.map((s, i) => (
                  <Bar key={s.name} dataKey={s.name} name={s.name} fill={colors[i % colors.length]} />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
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
        <Typography variant="body2">Filter by (dimensions):</Typography>
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

function AiSummaryPanel({
  open, onClose, loading, summary, error,
}: {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  summary: ReportAiSummary | null;
  error: string | null;
}) {
  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: "100vw", sm: 420 }, p: 3 }} role="presentation">
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <AiModeIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>AI Summary</Typography>
          </Stack>
          <IconButton onClick={onClose} size="small" aria-label="Close AI summary">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        {loading && (
          <Stack spacing={1.5}>
            <Skeleton variant="text" height={24} />
            <Skeleton variant="text" height={24} />
            <Skeleton variant="text" height={24} width="80%" />
          </Stack>
        )}

        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && summary && !summary.enabled && (
          <Alert severity="info">{summary.message ?? "AI is not enabled for this client."}</Alert>
        )}

        {!loading && !error && summary?.enabled && (
          <Stack spacing={2.5}>
            {summary.summary && (
              <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{summary.summary}</Typography>
            )}
            {summary.insights && summary.insights.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Key Insights</Typography>
                <Stack spacing={1}>
                  {summary.insights.map((insight, i) => (
                    <Typography key={i} variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                      • {insight}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}
            {summary.followUps && summary.followUps.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>You might also ask</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {summary.followUps.map((q, i) => (
                    <Chip key={i} label={q} size="small" variant="outlined" />
                  ))}
                </Stack>
              </Box>
            )}
            {summary.provider && (
              <Typography variant="caption" color="text.secondary">Powered by {summary.provider}</Typography>
            )}
          </Stack>
        )}
      </Box>
    </Drawer>
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
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<ReportAiSummary | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [pdfExporting, setPdfExporting] = useState(false);

  // A newly generated/refreshed report (new file, filter, or template) invalidates any cached
  // AI summary — it was grounded on the previous result's numbers.
  useEffect(() => {
    setAiSummary(null);
    setAiError(null);
  }, [report]);

  const handleOpenAiSummary = async () => {
    setAiPanelOpen(true);
    if (aiSummary || aiLoading) return; // already fetched for this report — don't re-call
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await getReportAiSummary(report);
      setAiSummary(result);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to generate AI summary.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleExportPdf = async () => {
    setPdfExporting(true);
    try {
      const blob = await exportReportPdf(
        report,
        aiSummary?.enabled ? aiSummary.summary : undefined,
        aiSummary?.enabled ? aiSummary.insights : undefined
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(report.templateName ?? "report").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export report PDF.", err);
    } finally {
      setPdfExporting(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <MuiTooltip title="AI Summary — a plain-language read of this report">
            <IconButton
              size="small"
              onClick={handleOpenAiSummary}
              color="primary"
              aria-label="Open AI summary"
              sx={{ border: "1px solid", borderColor: "primary.main" }}
            >
              <AiModeIcon fontSize="small" />
            </IconButton>
          </MuiTooltip>
          <Typography variant="h6" fontWeight={700}>{report.templateName ?? "Report"}</Typography>
        </Stack>
        <Button
          size="small"
          variant="outlined"
          startIcon={<PdfIcon />}
          onClick={handleExportPdf}
          disabled={pdfExporting || refreshing}
        >
          {pdfExporting ? "Exporting…" : "Export PDF"}
        </Button>
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

      <Box
        sx={
          theme.mode === "dark"
            ? { bgcolor: theme.bg, borderRadius: 3, p: { xs: 2, md: 3 } }
            : undefined
        }
      >
        {report.kpis.length > 0 && (
          <>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              sx={{ mb: 1, color: theme.mode === "dark" ? alpha("#FFFFFF", 0.7) : "text.secondary" }}
            >
              Key Metrics
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {report.kpis.map((kpi) => (
                <Grid key={kpi.label} size={{ xs: 12, sm: 6, md: 3 }}>
                  <ReportKpiCard kpi={kpi} theme={theme} />
                </Grid>
              ))}
            </Grid>
          </>
        )}

        <Stack spacing={2}>
          {report.charts.map((chart) => (
            <ReportChartCard key={chart.title} chart={chart} theme={theme} />
          ))}
        </Stack>
      </Box>

      <AiSummaryPanel
        open={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        loading={aiLoading}
        summary={aiSummary}
        error={aiError}
      />
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
  const [aiProvider, setAiProvider] = useState<AiProvider>("anthropic");
  const [aiDeclined, setAiDeclined] = useState(false);

  // Schema/model/template library match (Story 3) — separate from the AI blueprint
  // generation above; matches against the pre-built model+template repository instead
  // of generating a brand-new custom blueprint.
  const [matchResult, setMatchResult] = useState<ReportMatchResult | null>(null);
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  // Consent #2 (data usage) — shown once a model+template match is available.
  const [dataConsentDialogOpen, setDataConsentDialogOpen] = useState(false);
  const [dataConsentDeciding, setDataConsentDeciding] = useState(false);
  const [dataConsentError, setDataConsentError] = useState<string | null>(null);
  const [dataConsentRecordedAt, setDataConsentRecordedAt] = useState<string | null>(null);

  // Dashboard Template Generator — blend + patch + generate visuals + PBIP import, chained
  // server-side. Only reachable once modelResult.blueprint exists (AI-assisted mode).
  const [templateGenerating, setTemplateGenerating] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateResult, setTemplateResult] = useState<GenerateDashboardTemplateResponse | null>(null);
  const templateAbortRef = useRef<AbortController | null>(null);

  const [selectedTheme, setSelectedTheme] = useState<number | null>(null);

  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // AbortControllers for the two AI-backed calls, so a stalled request (past
  // AI_HARD_CEILING_SECONDS) can be cancelled from the UI instead of leaving the
  // user stuck waiting on a request the client-side timeout will eventually kill anyway.
  const modelAbortRef = useRef<AbortController | null>(null);
  const matchAbortRef = useRef<AbortController | null>(null);

  const [creditBalance, setCreditBalance] = useState<CreditBalance | null>(null);
  useEffect(() => {
    let cancelled = false;
    getCreditBalance()
      .then((b) => { if (!cancelled) setCreditBalance(b); })
      .catch(() => { /* fail silent — a balance widget shouldn't block the page */ });
    return () => { cancelled = true; };
  }, []);

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

    // Fire the AI blueprint generation and the model/template library match
    // independently — a slow or failing blueprint call must not block the match.
    void runModelGeneration();
    void runSchemaModelMatch();
  }

  async function runModelGeneration() {
    if (!extractedSchema) return;
    setModelGenerating(true);
    setModelError(null);
    const controller = new AbortController();
    modelAbortRef.current = controller;
    try {
      const model = await generateReportModel(
        clientId,
        extractedSchema,
        undefined,
        aiProvider,
        controller.signal
      );
      setModelResult(model);
    } catch (err) {
      setModelError(err instanceof Error ? err.message : "Model generation failed.");
    } finally {
      setModelGenerating(false);
      modelAbortRef.current = null;
    }
  }

  async function runSchemaModelMatch() {
    if (!extractedSchema) return;
    setMatching(true);
    setMatchError(null);
    const controller = new AbortController();
    matchAbortRef.current = controller;
    try {
      const match = await matchSchemaModel(clientId, extractedSchema, controller.signal);
      setMatchResult(match);
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : "Failed to match against the model library.");
    } finally {
      setMatching(false);
      matchAbortRef.current = null;
    }
  }

  /** Cancels both in-flight AI calls — offered once either has run past AI_HARD_CEILING_SECONDS. */
  function handleCancelAiAnalysis() {
    modelAbortRef.current?.abort();
    matchAbortRef.current?.abort();
  }

  async function handleGenerateTemplate() {
    if (!modelResult?.blueprint || !uploadedFile) return;
    setTemplateGenerating(true);
    setTemplateError(null);
    const controller = new AbortController();
    templateAbortRef.current = controller;
    try {
      const result = await generateDashboardTemplate(clientId, uploadedFile, modelResult.blueprint, controller.signal);
      setTemplateResult(result);
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : "Failed to generate dashboard template.");
    } finally {
      setTemplateGenerating(false);
      templateAbortRef.current = null;
    }
  }

  function handleOpenDataConsent() {
    setDataConsentError(null);
    setDataConsentDialogOpen(true);
  }

  async function handleDataConsentDecision(granted: boolean) {
    setDataConsentDialogOpen(false);
    if (!granted || !matchResult) return;

    setDataConsentDeciding(true);
    setDataConsentError(null);
    try {
      const result = await recordDataUsageConsent(matchResult.draftId, clientId);
      setDataConsentRecordedAt(result.approvedAt);
    } catch (err) {
      setDataConsentError(err instanceof Error ? err.message : "Failed to record data usage consent.");
    } finally {
      setDataConsentDeciding(false);
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
    modelAbortRef.current?.abort();
    matchAbortRef.current?.abort();
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
    setMatchResult(null);
    setMatchError(null);
    setDataConsentRecordedAt(null);
    setDataConsentError(null);
    setTemplateResult(null);
    setTemplateError(null);
  }

  const theme = REPORT_THEMES[selectedTheme ?? 0];
  const canProceedConnect = !!uploadedFile && !extracting;
  const canProceedModel = !modelGenerating;
  const canProceedTemplate = selectedTheme !== null && !reportGenerating;
  const badgeKind: TrustBadgeKind = flowStep === "report" ? "deterministic" : mode === "strict" ? "deterministic" : "ai";

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 4 }} gap={2}>
          <Box>
            <Eyebrow>Report Generator</Eyebrow>
            <Typography variant="h4" sx={{ mb: 1 }}>
              Get a <Accent kind="blue">real</Accent> report from your data.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
              Connect your data and pick a theme — the report itself is always generated by a{" "}
              <Accent kind="blue">deterministic engine</Accent>, never <Accent kind="violet">AI</Accent>.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            {mode === "ai" && <CreditBalanceBadge balance={creditBalance} />}
            <TrustBadge kind={badgeKind} />
          </Stack>
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
            matching={matching}
            matchError={matchError}
            matchResult={matchResult}
            dataConsentRecordedAt={dataConsentRecordedAt}
            dataConsentDeciding={dataConsentDeciding}
            dataConsentError={dataConsentError}
            onOpenDataConsent={handleOpenDataConsent}
            onCancelGeneration={handleCancelAiAnalysis}
            generatingTemplate={templateGenerating}
            templateError={templateError}
            templateResult={templateResult}
            onGenerateTemplate={handleGenerateTemplate}
          />
        )}

        {flowStep === "template" && (
          <>
            <TemplateStep
              modelResult={modelResult}
              selected={selectedTheme}
              onSelect={setSelectedTheme}
              planTier={creditBalance?.subscriptionPlan ?? null}
            />
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
          <Typography variant="subtitle2" sx={{ mt: 2.5, mb: 1 }}>
            AI model
          </Typography>
          <ToggleButtonGroup
            value={aiProvider}
            exclusive
            size="small"
            fullWidth
            onChange={(_, value) => value && setAiProvider(value as AiProvider)}
          >
            <ToggleButton value="anthropic">Claude Sonnet</ToggleButton>
            <ToggleButton value="openai">OpenAI</ToggleButton>
          </ToggleButtonGroup>
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

      <Dialog open={dataConsentDialogOpen} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CheckCircleIcon color="primary" />
            <span>Use your data with this report model?</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Confirming means this report will use the columns matched above. A reference to
            this match is stored for audit and compliance purposes, retained for up to 18
            months. This is separate from the earlier AI-matching consent.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => handleDataConsentDecision(false)}>
            Not now
          </Button>
          <Button variant="contained" onClick={() => handleDataConsentDecision(true)}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
