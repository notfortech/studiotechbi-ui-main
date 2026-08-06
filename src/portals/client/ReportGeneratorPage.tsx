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
  BookmarkAddOutlined as SaveReportIcon,
  FactCheck as VerifyMatchIcon,
  VerifiedOutlined as ValidateReportIcon,
  SupportAgent as CustomReportIcon,
  PictureAsPdf as PdfExportIcon,
  FileDownloadOutlined as DownloadDatasetIcon,
} from "@mui/icons-material";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { ROUTES } from "../../core/constants";
import { startReportValidation } from "../../api/reportValidationApi";
import { saveReport } from "../../api/savedReportsApi";
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
  type ExtractedSchemaDto,
  type GenerateReportModelResponse,
  type StarSchema,
  type TableInfo,
  type ReportMatchResult,
  type AiProvider,
} from "../../api/reportDesignerApi";
import { requestCustomPowerBiReport, type CustomReportRequestReason } from "../../api/reportRequestsApi";
import {
  generateReport,
  getReportAiSummary,
  verifyHtmlTemplateMatch,
  getUploadLimits,
  initReportUpload,
  completeReportUpload,
  pollReportGenerationJobUntilDone,
  downloadBlendedDataset,
  type GeneratedReport,
  type ReportChart,
  type ReportAiSummary,
  type HtmlTemplateCandidate,
} from "../../api/reportGeneratorApi";
import { uploadFileToBlob } from "../../services/reportUploadService";
import { REPORT_THEMES, themeById, MiniReportPreview, type VisualTheme } from "./reportThemes";
import { REPORT_PALETTES, applyReportPalette } from "../../utils/reportPaletteOverride";
import { getCreditBalance, type CreditBalance } from "../../api/creditsApi";
import { setPreferredThemeId } from "../../core/reportTheme";
import { TrustBadge, type TrustBadgeKind } from "../../components/common/TrustBadge";
import { Eyebrow } from "../../components/common/Eyebrow";
import { Accent } from "../../components/common/Accent";
import { MetricTile } from "../../components/common/MetricTile";
import { AiSummaryPanel } from "../../components/common/AiSummaryPanel";
import { LowCreditsAlert, LOW_CREDIT_BALANCE_THRESHOLD } from "../../components/common/LowCreditsAlert";

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

const DEFAULT_MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // fallback only, used if the server call fails

function ConnectDataStep({
  uploadedFile,
  onUpload,
  maxUploadBytes,
  maxAsyncUploadBytes,
}: {
  uploadedFile: File | null;
  onUpload: (f: File) => void;
  maxUploadBytes: number;
  maxAsyncUploadBytes: number;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);

  const maxAsyncUploadMb = Math.round(maxAsyncUploadBytes / (1024 * 1024));

  const handleFileSelected = (f: File) => {
    if (f.size > maxAsyncUploadBytes) {
      setSizeError(
        `"${f.name}" is ${(f.size / (1024 * 1024)).toFixed(1)} MB, which exceeds the ${maxAsyncUploadMb} MB limit. ` +
        `Please upload a smaller file.`
      );
      return;
    }
    setSizeError(null);
    onUpload(f);
  };

  // Files at/above this go through direct-to-blob background processing instead of the instant
  // path -- purely informational, not a size rejection (handled above, against the real ceiling).
  const willProcessInBackground = uploadedFile !== null && uploadedFile.size > maxUploadBytes;

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>Connect Your Data</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload an Excel or CSV file. We'll extract its schema, propose a data model, and generate your
        report from the same file — one upload, start to finish.
      </Typography>

      <input ref={fileInputRef} type="file" accept=".xlsx,.csv" style={{ display: "none" }}
        data-testid="report-file-input"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); }} />
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
            <Typography variant="body2" color="text.secondary">Supports .xlsx, .csv · max {maxAsyncUploadMb} MB</Typography>
          </Stack>
        )}
      </Box>

      {sizeError && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setSizeError(null)} data-testid="report-file-size-error">
          {sizeError}
        </Alert>
      )}

      {willProcessInBackground && !sizeError && (
        <Alert severity="info" sx={{ mt: 2 }} data-testid="report-file-background-processing-note">
          This file is large enough that it'll upload directly and process in the background —
          you'll see progress on the next step, and the report will be ready shortly after.
        </Alert>
      )}

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

// Below this, a library match isn't confident enough to hand straight to the client -- treated
// the same as no match at all (custom Power BI request path). Matches the 0.85 threshold already
// used elsewhere in this wizard (HtmlMatchConfidenceThreshold) for the same "protect report
// accuracy" reason.
const SCHEMA_MODEL_MATCH_CONFIDENCE_THRESHOLD = 0.85;

function SchemaModelMatchPanel({
  matching, matchError, matchResult, dataConsentRecordedAt, dataConsentDeciding, dataConsentError, onOpenConsent,
  requestingCustomReport, customReportError, customReportFiled, filedRequestId, onRequestCustomReport,
}: {
  matching: boolean;
  matchError: string | null;
  matchResult: ReportMatchResult | null;
  dataConsentRecordedAt: string | null;
  dataConsentDeciding: boolean;
  dataConsentError: string | null;
  onOpenConsent: () => void;
  requestingCustomReport: boolean;
  customReportError: string | null;
  customReportFiled: boolean;
  filedRequestId: string | null;
  onRequestCustomReport: () => void;
}) {
  // "AiProposedNew" means nothing in the library fit, so the AI drafted a brand-new model on the
  // spot -- exactly the repeated-AI-credit-spend case we want to avoid. Treated as "no confident
  // match" here rather than presented as ready to use: the client gets the custom-report path,
  // and (via the request they file) a schema an admin can build a real template from once,
  // instead of the AI re-authoring a one-off model for every similar dataset that comes through.
  const isConfidentLibraryMatch =
    !!matchResult?.schemaModelId
    && !matchResult.pendingSupportReview
    && matchResult.matchSource !== "AiProposedNew"
    && matchResult.confidence >= SCHEMA_MODEL_MATCH_CONFIDENCE_THRESHOLD;

  const customReportAction = (
    <Stack spacing={1} sx={{ mt: 2 }}>
      <Button
        variant="outlined"
        color="secondary"
        startIcon={requestingCustomReport ? <CircularProgress size={16} color="inherit" /> : <CustomReportIcon />}
        disabled={requestingCustomReport || customReportFiled}
        onClick={onRequestCustomReport}
        sx={{ alignSelf: "flex-start" }}
      >
        {customReportFiled
          ? "Custom report requested"
          : requestingCustomReport
          ? "Filing request…"
          : "Request a custom Power BI report"}
      </Button>
      {customReportError && <Alert severity="error">{customReportError}</Alert>}
      {customReportFiled && (
        <Alert severity="success">
          Request {filedRequestId && `#${filedRequestId.slice(0, 8)} `}filed, with your data's
          schema attached — our support team will review it and reach out once your custom report
          is ready.
        </Alert>
      )}
    </Stack>
  );

  return (
    <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: "divider" }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>Matched Report Model</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Your schema is checked against our library of pre-built industry report models — the model
        and dashboard template your report can eventually be published against.
      </Typography>

      {matchError && <Alert severity="error" sx={{ mb: 2 }}>{matchError}</Alert>}

      {matching ? (
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">Matching against the model library…</Typography>
        </Stack>
      ) : matchResult?.pendingSupportReview ? (
        <Box>
          <Alert severity="info" sx={{ mb: 1 }}>
            No confident match in the library — your data's schema has been logged for our team to
            build a template from, so this same shape won't need AI again next time.
          </Alert>
          {customReportAction}
        </Box>
      ) : isConfidentLibraryMatch && matchResult ? (
        <Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
            <Chip label={matchResult.industry || "Cross-Industry"} size="small" color="primary" />
            <Chip
              label={matchResult.matchSource === "AiMatched" ? "AI-matched" : "Matched"}
              size="small" variant="outlined"
            />
            <Chip label={`Confidence ${Math.round(matchResult.confidence * 100)}%`} size="small" variant="outlined" />
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
        <Box>
          <Alert severity="warning" sx={{ mb: 1 }}>
            No confident match found in the model library
            {matchResult ? ` (best match was ${Math.round(matchResult.confidence * 100)}% — below our ${Math.round(SCHEMA_MODEL_MATCH_CONFIDENCE_THRESHOLD * 100)}% bar for report accuracy)` : ""}.
          </Alert>
          {customReportAction}
        </Box>
      ) : null}
    </Box>
  );
}

function DataModelStep({
  extractedSchema, modelResult, generating, generateError, aiDeclined,
  matching, matchError, matchResult, dataConsentRecordedAt, dataConsentDeciding, dataConsentError, onOpenDataConsent,
  onCancelGeneration,
  requestingCustomReport, customReportError, customReportFiled, filedRequestId, onRequestCustomReport,
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
  requestingCustomReport: boolean;
  customReportError: string | null;
  customReportFiled: boolean;
  filedRequestId: string | null;
  onRequestCustomReport: () => void;
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
          requestingCustomReport={requestingCustomReport}
          customReportError={customReportError}
          customReportFiled={customReportFiled}
          filedRequestId={filedRequestId}
          onRequestCustomReport={onRequestCustomReport}
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

  const low = !balance.isUnlimited && (balance.creditsRemaining ?? 0) < LOW_CREDIT_BALANCE_THRESHOLD;
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
      {slicers.map((slicer) => {
        // Passed as a variable (not an inline literal) so TS's excess-property check doesn't
        // reject the data-testid hook Playwright uses to drive this control in rendering-health
        // checks (DashboardAgents.ReportValidationApi).
        const selectDisplayProps: Record<string, string> = { "data-testid": `filter-${slicer.column}` };
        return (
          <FormControl key={slicer.column} size="small" sx={{ minWidth: 160 }} disabled={disabled}>
            <InputLabel>{slicer.column}</InputLabel>
            <Select
              label={slicer.column}
              value={activeFilters[slicer.column] ?? ""}
              onChange={(e) => onFilterChange(slicer.column, e.target.value)}
              SelectDisplayProps={selectDisplayProps}
            >
              <MenuItem value="">All</MenuItem>
              {slicer.values.map((v) => (
                <MenuItem key={v} value={v}>{v}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      })}
      {hasActiveFilters && (
        <Button size="small" onClick={onClearFilters} disabled={disabled}>Clear filters</Button>
      )}
    </Stack>
  );
}

function ReportResultsStep({
  report, theme, onFilterChange, onClearFilters, refreshing, sourceFileName,
  showValidateReport, validating, validateError, onValidateReport,
  requestingCustomReport, customReportError, customReportFiled, filedRequestId, onRequestCustomReport,
}: {
  report: GeneratedReport;
  theme: VisualTheme;
  onFilterChange: (column: string, value: string) => void;
  onClearFilters: () => void;
  refreshing: boolean;
  sourceFileName?: string;
  showValidateReport: boolean;
  validating: boolean;
  validateError: string | null;
  onValidateReport: () => void;
  requestingCustomReport: boolean;
  customReportError: string | null;
  customReportFiled: boolean;
  filedRequestId: string | null;
  onRequestCustomReport: () => void;
}) {
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<ReportAiSummary | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportPdfError, setExportPdfError] = useState<string | null>(null);
  const [downloadBlendError, setDownloadBlendError] = useState<string | null>(null);
  const [selectedPaletteIndex, setSelectedPaletteIndex] = useState<number | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // A newly generated/refreshed report (new file, filter, or template) invalidates any cached
  // AI summary and the "already saved" state — both were grounded on the previous result. The
  // palette choice is a per-report view preference too, not something that should carry over to
  // an unrelated file/filter/template.
  useEffect(() => {
    setAiSummary(null);
    setAiError(null);
    setSavedReportId(null);
    setSaveError(null);
    setExportPdfError(null);
    setSelectedPaletteIndex(null);
  }, [report]);

  // Frontend-only -- no backend round-trip, no re-generation. Recomputed only when the report's
  // own HTML or the palette choice changes, not on every render (rebuilding the string on every
  // keystroke elsewhere on the page would otherwise force the iframe to reload needlessly).
  const displayedHtml = useMemo(() => {
    if (!report.htmlReport) return report.htmlReport;
    if (selectedPaletteIndex === null) return report.htmlReport;
    return applyReportPalette(report.htmlReport, report.htmlTemplateId ?? null, REPORT_PALETTES[selectedPaletteIndex]);
  }, [report.htmlReport, report.htmlTemplateId, selectedPaletteIndex]);

  // Mutating an <iframe>'s srcDoc in place on an already-mounted element isn't reliably picked up
  // by the browser as a fresh navigation past the first load -- switching palettes a second time
  // would silently keep showing the first-picked one. Forcing a real remount (a distinct `key`
  // per report+palette combination) sidesteps that entirely: every palette change gets a brand
  // new iframe element, guaranteeing a fresh load every time.
  const iframeKey = `${report.htmlTemplateId ?? "none"}:${selectedPaletteIndex ?? "default"}:${report.htmlReport?.length ?? 0}`;

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

  // No HTML template matched, so there's no "Save Report" option (that requires report.htmlReport)
  // and nothing to print natively either -- this is the only export path for that fallback view.
  // Reuses whatever AI summary is already cached (e.g. the client opened "Ask AI Assistant"
  // already); otherwise fetches one fresh so the PDF always ships with a description, not just
  // raw numbers.
  const handleExportPdf = async () => {
    if (!resultsRef.current) return;
    setExportingPdf(true);
    setExportPdfError(null);
    try {
      let summaryText = aiSummary?.summary ?? null;
      if (summaryText === null) {
        try {
          const result = await getReportAiSummary(report);
          setAiSummary(result);
          summaryText = result.summary ?? null;
        } catch {
          // Best-effort -- a failed AI summary must never block the PDF the client asked for.
        }
      }

      const canvas = await html2canvas(resultsRef.current, { scale: 2, backgroundColor: null });

      // Always render the exported PDF in black-and-white, regardless of the report's active
      // color theme/palette -- keeps the data and visuals unambiguous on paper. Desaturating the
      // captured canvas pixels (rather than mutating the live DOM/CSS before capture) guarantees a
      // true grayscale image regardless of what on-screen palette was active.
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          data[i] = data[i + 1] = data[i + 2] = gray;
        }
        ctx.putImageData(imageData, 0, 0);
      }
      const imgData = canvas.toDataURL("image/png");

      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;

      doc.setFontSize(18);
      doc.text(report.templateName ?? "Report", margin, margin + 10);
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`Generated ${new Date().toLocaleString()}`, margin, margin + 32);
      doc.setTextColor(0);

      // AI-assisted "closest template" blend fallback only: bake the blend disclaimer into the
      // PDF text itself (page 1, a dedicated text-only page) rather than relying on the on-screen
      // banner being inside the screenshotted region (it isn't) -- this way the note survives into
      // any PDF a client exports and keeps/shares from this fallback view.
      if (report.blendNote) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Note: this report includes proposed sample data", margin, margin + 56);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const noteLines = doc.splitTextToSize(report.blendNote, pageWidth - margin * 2);
        doc.text(noteLines, margin, margin + 72);

        const mockedColumns = Array.from(
          new Set((report.blendProvenance ?? []).filter((p) => p.source === "mocked").map((p) => p.column))
        );
        if (mockedColumns.length > 0) {
          const colLines = doc.splitTextToSize(
            `Proposed columns: ${mockedColumns.join(", ")}`,
            pageWidth - margin * 2
          );
          doc.text(colLines, margin, margin + 72 + noteLines.length * 11 + 12);
        }
        doc.setFontSize(10);
      }

      // Paginate the captured KPI/chart grid across as many pages as it needs, by redrawing the
      // same full-height image at a rising negative offset each page -- jsPDF clips anything
      // outside the page bounds, so each page just reveals the next slice.
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const usableHeight = pageHeight - margin * 2;
      let heightLeft = imgHeight;
      let position = 0;

      doc.addPage();
      doc.addImage(imgData, "PNG", margin, margin - position, imgWidth, imgHeight);
      heightLeft -= usableHeight;
      while (heightLeft > 0) {
        position += usableHeight;
        doc.addPage();
        doc.addImage(imgData, "PNG", margin, margin - position, imgWidth, imgHeight);
        heightLeft -= usableHeight;
      }

      if (summaryText) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text("AI Summary", margin, margin);
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(summaryText, pageWidth - margin * 2);
        doc.text(lines, margin, margin + 24);
      }

      const fileSlug = (report.templateName ?? "report").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      doc.save(`${fileSlug}.pdf`);
    } catch (err) {
      setExportPdfError(err instanceof Error ? err.message : "Failed to export PDF.");
    } finally {
      setExportingPdf(false);
    }
  };

  // Manual re-trigger for the closest-template blend fallback's proposed dataset -- the automatic
  // download already fires once from handleGenerateReport; this covers a blocked popup/download or
  // the client wanting the file again later in the same session.
  const handleDownloadBlendedDataset = () => {
    if (!report.blendedDatasetFileBase64 || !report.closestTemplateId) return;
    setDownloadBlendError(null);
    try {
      downloadBlendedDataset(report.blendedDatasetFileBase64, report.closestTemplateId);
    } catch (err) {
      setDownloadBlendError(err instanceof Error ? err.message : "Failed to download the proposed dataset.");
    }
  };

  const handleSaveReport = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      // Saves whatever is actually on screen, including any client-side palette override --
      // "what you see is what gets saved," consistent with how this save has always worked
      // (the exact on-screen string, per HtmlReportAssemblyService's own design intent).
      const result = await saveReport({ ...report, htmlReport: displayedHtml }, sourceFileName);
      setSavedReportId(result.savedReportId);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save report.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
        <Typography variant="h6" fontWeight={700}>{report.templateName ?? "Report"}</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <MuiTooltip title="A plain-language read of this report, generated by AI">
            <Button
              size="small"
              variant="outlined"
              startIcon={<AiModeIcon fontSize="small" />}
              onClick={handleOpenAiSummary}
            >
              Ask AI Assistant
            </Button>
          </MuiTooltip>
          <Button
            size="small"
            variant="outlined"
            startIcon={<SaveReportIcon />}
            onClick={handleSaveReport}
            disabled={saving || refreshing || !report.htmlReport || !!savedReportId}
          >
            {saving ? "Saving…" : savedReportId ? "Saved" : "Save Report"}
          </Button>
          {showValidateReport && (
            <MuiTooltip title="Run an automated check confirming this report rendered correctly and its data looks trustworthy">
              <Button
                size="small"
                variant="outlined"
                startIcon={<ValidateReportIcon />}
                onClick={onValidateReport}
                disabled={validating || refreshing}
              >
                {validating ? "Validating…" : "Validate Report"}
              </Button>
            </MuiTooltip>
          )}
        </Stack>
      </Stack>
      {report.primaryTable && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Computed from <strong>{report.primaryTable}</strong>.
        </Typography>
      )}
      {validateError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {validateError}
        </Alert>
      )}
      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {saveError}
        </Alert>
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

      {!report.htmlTemplateId && (
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Alert severity="info">
            {report.blendNote ??
              "No confident interactive template match yet for this data shape — showing the standard metrics view below instead. Our team has been notified so we can add coverage."}
          </Alert>
          {report.blendedDatasetFileBase64 && report.blendProvenance && report.blendProvenance.some((p) => p.source === "mocked") && (
            <Typography variant="body2" color="text.secondary">
              Proposed additional columns:{" "}
              {Array.from(
                new Set(report.blendProvenance.filter((p) => p.source === "mocked").map((p) => p.column))
              ).join(", ")}
            </Typography>
          )}
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" gap={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={exportingPdf ? <CircularProgress size={16} color="inherit" /> : <PdfExportIcon />}
              disabled={exportingPdf}
              onClick={() => void handleExportPdf()}
            >
              {exportingPdf ? "Exporting…" : "Export PDF"}
            </Button>
            {report.blendedDatasetFileBase64 && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadDatasetIcon />}
                onClick={handleDownloadBlendedDataset}
              >
                Download Proposed Dataset
              </Button>
            )}
            <Button
              size="small"
              variant="text"
              color="secondary"
              startIcon={requestingCustomReport ? <CircularProgress size={16} color="inherit" /> : <CustomReportIcon />}
              disabled={requestingCustomReport || customReportFiled}
              onClick={onRequestCustomReport}
            >
              {customReportFiled
                ? "Custom report requested"
                : requestingCustomReport
                ? "Filing request…"
                : "Request a custom Power BI report"}
            </Button>
          </Stack>
          {exportPdfError && <Alert severity="error">{exportPdfError}</Alert>}
          {downloadBlendError && <Alert severity="error">{downloadBlendError}</Alert>}
          {customReportError && <Alert severity="error">{customReportError}</Alert>}
          {customReportFiled && (
            <Alert severity="success">
              Request {filedRequestId && `#${filedRequestId.slice(0, 8)} `}filed, with your data's
              schema attached — our support team will review it and reach out once your custom
              report is ready.
            </Alert>
          )}
        </Stack>
      )}

      <Box
        ref={resultsRef}
        data-testid="report-results-loaded"
        sx={
          theme.mode === "dark"
            ? { bgcolor: theme.bg, borderRadius: 3, p: { xs: 2, md: 3 } }
            : undefined
        }
      >
        {report.htmlReport ? (
          <>
            {/* Frontend-only, ephemeral view preference — never re-generates or hits the
                backend; see reportPaletteOverride.ts for how this rewrites the HTML string. */}
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
              <MuiTooltip title="Change this report's colors — a display preference only, doesn't affect the underlying data">
                <PaletteIcon fontSize="small" sx={{ color: "text.secondary" }} />
              </MuiTooltip>
              <MuiTooltip title="Template default">
                <Box
                  onClick={() => setSelectedPaletteIndex(null)}
                  data-testid="report-palette-swatch-default"
                  sx={{
                    width: 24, height: 24, borderRadius: "50%", cursor: "pointer",
                    border: (t) => `2px solid ${selectedPaletteIndex === null ? t.palette.text.primary : "transparent"}`,
                    background: "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 10px 10px",
                    boxShadow: "0 0 0 1px rgba(0,0,0,0.12) inset",
                  }}
                />
              </MuiTooltip>
              {REPORT_PALETTES.map((p, i) => (
                <MuiTooltip key={p.name} title={p.name}>
                  <Box
                    onClick={() => setSelectedPaletteIndex(i)}
                    data-testid={`report-palette-swatch-${i}`}
                    sx={{
                      width: 24, height: 24, borderRadius: "50%", cursor: "pointer",
                      background: `linear-gradient(135deg, ${p.primary} 50%, ${p.accent} 50%)`,
                      border: (t) => `2px solid ${selectedPaletteIndex === i ? t.palette.text.primary : "transparent"}`,
                      boxShadow: "0 0 0 1px rgba(0,0,0,0.12) inset",
                    }}
                  />
                </MuiTooltip>
              ))}
            </Stack>
            {/* Interactive HTML report template, primary format — sandboxed iframe with srcDoc
                (never dangerouslySetInnerHTML, which would execute the template's inline
                <script> in this document's own origin, with access to authToken/cookies).
                "allow-scripts" without "allow-same-origin" means the iframe's own JS can drive
                its own client-side filtering but can't read anything of this app's. */}
            <iframe
              key={iframeKey}
              title={report.templateName ?? "Report"}
              srcDoc={displayedHtml ?? undefined}
              sandbox="allow-scripts"
              style={{ width: "100%", height: "80vh", border: "none", borderRadius: 8 }}
              data-testid="report-html-frame"
            />
          </>
        ) : (
          // Fallback: no HTML template matched this dataset at all — the original KPI/chart grid,
          // unchanged, so a report is never a hard failure just because nothing in the (still-
          // growing) HTML template library covers this schema shape yet.
          <>
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
                    <Grid key={kpi.label} data-testid={`kpi-tile-${kpi.label}`} size={{ xs: 12, sm: 6, md: 3 }}>
                      <ReportKpiCard kpi={kpi} theme={theme} />
                    </Grid>
                  ))}
                </Grid>
              </>
            )}

            <Stack spacing={2}>
              {report.charts.map((chart) => (
                <Box key={chart.title} data-testid={`chart-${chart.title}`}>
                  <ReportChartCard chart={chart} theme={theme} />
                </Box>
              ))}
            </Stack>
          </>
        )}
      </Box>

      <AiSummaryPanel
        open={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        loading={aiLoading}
        summary={aiSummary}
        error={aiError}
        onAskFollowUp={(question) => getReportAiSummary(report, question)}
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
  const { user, hasReportValidationAddOn } = useAuth();
  const navigate = useNavigate();
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

  // HTML template match — checks the interactive HTML report template library (>=85%
  // confidence only) before generation, so the wizard can auto-select the right template.
  const [verifyingHtmlMatch, setVerifyingHtmlMatch] = useState(false);
  const [htmlMatchError, setHtmlMatchError] = useState<string | null>(null);
  const [htmlMatchCandidates, setHtmlMatchCandidates] = useState<HtmlTemplateCandidate[] | null>(null);
  const [selectedHtmlTemplateId, setSelectedHtmlTemplateId] = useState<string | null>(null);
  const htmlMatchAbortRef = useRef<AbortController | null>(null);

  // "Request a custom Power BI report" — files a ticket for an analyst to build one by hand;
  // the fulfilled report later appears in Saved Reports.
  const [requestingCustomReport, setRequestingCustomReport] = useState(false);
  const [customReportError, setCustomReportError] = useState<string | null>(null);
  const [customReportFiled, setCustomReportFiled] = useState(false);
  const [filedRequestId, setFiledRequestId] = useState<string | null>(null);

  const [selectedTheme, setSelectedTheme] = useState<number | null>(null);

  // Large-file (direct-to-blob async) upload thresholds — fetched once, used both to route
  // handleGenerateReport/refetchWithFilters and to gate ConnectDataStep's own client-side check.
  const [maxUploadBytes, setMaxUploadBytes] = useState(DEFAULT_MAX_UPLOAD_BYTES);
  const [maxAsyncUploadBytes, setMaxAsyncUploadBytes] = useState(DEFAULT_MAX_UPLOAD_BYTES);
  const [uploadProgressPct, setUploadProgressPct] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getUploadLimits()
      .then((limits) => {
        if (cancelled) return;
        setMaxUploadBytes(limits.maxUploadBytes);
        setMaxAsyncUploadBytes(limits.maxAsyncUploadBytes);
      })
      .catch(() => { /* keep the defaults */ });
    return () => { cancelled = true; };
  }, []);

  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [validating, setValidating] = useState(false);
  const [validateError, setValidateError] = useState<string | null>(null);

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
      // The one call in this wizard that actually costs an AI credit -- but koru-main only debits
      // the ledger after a confirmed success (see GenerateReportModelAsync's try/catch), so a
      // thrown error here is guaranteed to mean nothing was charged. Safe to state unconditionally.
      const message = err instanceof Error ? err.message : "Model generation failed.";
      setModelError(`${message} This didn't use any of your AI credits.`);
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

      // Auto-file the custom-report request the moment we know the library match isn't
      // confident enough to hand to the client -- mirrors the deterministic path's own
      // no-match auto-file (handleGenerateReport), so the schema is logged for admin/support to
      // build a real template from without the client having to remember to click a button. The
      // manual "Request a custom Power BI report" button (SchemaModelMatchPanel) stays as a
      // no-op-if-already-filed backstop, guarded by the same customReportFiled flag.
      const confident =
        !!match.schemaModelId
        && !match.pendingSupportReview
        && match.matchSource !== "AiProposedNew"
        && match.confidence >= SCHEMA_MODEL_MATCH_CONFIDENCE_THRESHOLD;
      if (!confident) {
        void autoFileCustomReportRequest(
          extractedSchema,
          "Auto-filed: no confident schema-model library match found (AI-assisted Report Generator)."
        );
      }
    } catch (err) {
      // This call never consumes AI credits (see runModelGeneration for the one call that does),
      // so the reassurance here is unconditionally accurate. File a ticket distinct from the
      // "searched and found nothing confident" case above -- this is "the call itself failed,"
      // which needs a different staff response (retry / check for an outage).
      void autoFileCustomReportRequest(
        extractedSchema,
        "Auto-filed: the model-library match request failed (network or AI service error).",
        "GenerationError"
      );
      const message = err instanceof Error ? err.message : "Failed to match against the model library.";
      setMatchError(`${message} This didn't use any of your AI credits.`);
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

  // Files the same request "Request a custom Power BI report" would, without the client having to
  // click it -- shared by every no-confident-match point in the wizard (AI-assisted verify-match
  // below, and the deterministic generate call in handleGenerateReport) so an admin always ends up
  // with a schema-carrying, admin-visible record. Guarded on customReportFiled by every caller so
  // re-running a check doesn't double-file.
  async function autoFileCustomReportRequest(
    schema: ExtractedSchemaDto,
    note?: string,
    reason?: CustomReportRequestReason
  ) {
    if (customReportFiled) return;
    setRequestingCustomReport(true);
    try {
      const { requestId } = await requestCustomPowerBiReport(schema, note, reason);
      setFiledRequestId(requestId);
      setCustomReportFiled(true);
    } catch (err) {
      setCustomReportError(err instanceof Error ? err.message : "Failed to file the custom report request.");
    } finally {
      setRequestingCustomReport(false);
    }
  }

  async function handleVerifyHtmlMatch() {
    if (!uploadedFile) return;
    setVerifyingHtmlMatch(true);
    setHtmlMatchError(null);
    const controller = new AbortController();
    htmlMatchAbortRef.current = controller;
    try {
      const candidates = await verifyHtmlTemplateMatch(uploadedFile);
      setHtmlMatchCandidates(candidates);
      if (candidates.length === 1) setSelectedHtmlTemplateId(candidates[0].templateId);
      if (candidates.length === 0 && extractedSchema) {
        await autoFileCustomReportRequest(
          extractedSchema,
          "Auto-filed: no confident HTML template match found for this data shape."
        );
      }
    } catch (err) {
      // Distinct from the "checked and found nothing confident" case above -- the call itself
      // failed, which needs a different staff response (retry / check for an outage). This call
      // never consumes AI credits, so the reassurance here is unconditionally accurate.
      if (extractedSchema) {
        void autoFileCustomReportRequest(
          extractedSchema,
          "Auto-filed: the template match check failed (network or AI service error).",
          "GenerationError"
        );
      }
      const message = err instanceof Error ? err.message : "Failed to verify template match.";
      setHtmlMatchError(`${message} This didn't use any of your AI credits.`);
    } finally {
      setVerifyingHtmlMatch(false);
      htmlMatchAbortRef.current = null;
    }
  }

  function handleSelectHtmlTemplate(templateId: string) {
    setSelectedHtmlTemplateId((prev) => (prev === templateId ? null : templateId));
  }

  async function handleRequestCustomReport() {
    if (!extractedSchema) return;
    setCustomReportError(null);
    await autoFileCustomReportRequest(extractedSchema);
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

  // Large-file path: direct-to-blob upload (this app tier never buffers the file) + durable async
  // processing, instead of the multipart POST generateReport() does. Same optional fields, same
  // result shape -- the caller doesn't need to know which path actually ran.
  async function runLargeFileGeneration(
    file: File,
    templateId: string | undefined,
    filters: Record<string, string> | undefined,
    htmlTemplateId: string | undefined,
    isRefinement: boolean
  ): Promise<GeneratedReport> {
    setUploadProgressPct(0);
    try {
      const init = await initReportUpload(file.name);
      await uploadFileToBlob(init.writeUrl, file, (loaded, total) => {
        if (total > 0) setUploadProgressPct(Math.round((loaded / total) * 100));
      });
      await completeReportUpload(
        init.jobId, templateId, filters, htmlTemplateId, mode, isRefinement,
        theme.primary, theme.dark, theme.light, theme.bg
      );
      setUploadProgressPct(null);
      const status = await pollReportGenerationJobUntilDone(init.jobId);
      if (status.status === "Failed" || !status.result) {
        throw new Error(status.errorMessage ?? "Report generation failed.");
      }
      return status.result;
    } finally {
      setUploadProgressPct(null);
    }
  }

  async function handleGenerateReport() {
    if (!uploadedFile) return;
    setReportError(null);
    setReportGenerating(true);
    try {
      const result = uploadedFile.size > maxUploadBytes
        ? await runLargeFileGeneration(
            uploadedFile, undefined, undefined, selectedHtmlTemplateId ?? undefined, false
          )
        : await generateReport(
            uploadedFile, undefined, undefined, selectedHtmlTemplateId ?? undefined, mode,
            undefined, theme.primary, theme.dark, theme.light, theme.bg
          );
      setReport(result);
      setFlowStep("report");

      // AI-assisted "closest template" blend fallback only: auto-download the proposed dataset
      // once, right on the initial generation -- never on a filter-refinement re-generate (this
      // block lives only in handleGenerateReport, not refetchWithFilters). Best-effort: a blocked
      // download (popup blocker etc.) must never surface as a report-generation failure -- the
      // "Download Proposed Dataset" button in the banner below covers that case.
      if (result.blendedDatasetFileBase64 && result.closestTemplateId) {
        try {
          downloadBlendedDataset(result.blendedDatasetFileBase64, result.closestTemplateId);
        } catch {
          // Best-effort -- see comment above.
        }
      }

      // Strict mode never runs the AI-assisted verify-match check, so this deterministic call is
      // often the *only* point that ever learns whether an HTML template matched. Extract the
      // schema (a pure structural parse, no AI -- consistent with strict mode's "no AI involved"
      // promise) only when it's actually needed, i.e. we don't already have one and there's a gap
      // to report, then file the same admin-visible request the AI-assisted path does.
      if (!result.htmlTemplateId) {
        let schema = extractedSchema;
        if (!schema) {
          try {
            schema = await extractSchemaFromExcel(uploadedFile);
            setExtractedSchema(schema);
          } catch {
            // Best-effort -- the client already has a working (fallback-layout) report; a failed
            // schema extraction here must never surface as a report-generation failure.
          }
        }
        if (schema) {
          await autoFileCustomReportRequest(
            schema,
            "Auto-filed: no confident HTML template match found for this data shape (generated report)."
          );
        }
      }
    } catch (err) {
      // The call itself failed (network error, ReportAgent.Api unreachable, etc.) rather than
      // completing with a low-confidence result -- there's no partial report to fall back to here,
      // so this is an honest error state, not a disguised degraded one. File a ticket (best-effort,
      // schema extracted fresh if needed) so the client has something concrete to reference instead
      // of a dead end, and reassure them this never touches AI credits regardless of mode -- the
      // "Generate Report" button above stays enabled, so re-clicking it is the retry.
      let schema = extractedSchema;
      if (!schema) {
        try {
          schema = await extractSchemaFromExcel(uploadedFile);
          setExtractedSchema(schema);
        } catch {
          // Best-effort -- a failed schema extraction here must not block surfacing the real error.
        }
      }
      if (schema) {
        void autoFileCustomReportRequest(
          schema,
          "Auto-filed: report generation failed (network or service error).",
          "GenerationError"
        );
      }
      const message = err instanceof Error ? err.message : "Failed to generate report.";
      setReportError(
        `${message} This didn't use any of your AI credits — click "Generate Report" to try again.`
      );
    } finally {
      setReportGenerating(false);
    }
  }

  async function refetchWithFilters(filters: Record<string, string>) {
    if (!uploadedFile || !report?.templateId) return;
    setRefreshing(true);
    setReportError(null);
    try {
      const result = uploadedFile.size > maxUploadBytes
        ? await runLargeFileGeneration(uploadedFile, report.templateId, filters, undefined, true)
        : await generateReport(
            uploadedFile, report.templateId, filters, undefined, mode, true,
            theme.primary, theme.dark, theme.light, theme.bg
          );
      setReport(result);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Failed to apply filter.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleValidateReport() {
    if (!uploadedFile || !report) return;
    setValidating(true);
    setValidateError(null);
    try {
      const { runId } = await startReportValidation(
        uploadedFile,
        report.templateId,
        report.appliedFilters,
        report
      );
      navigate(ROUTES.CLIENT.REPORT_VALIDATION_RUN.replace(":runId", runId));
    } catch (err) {
      setValidateError(err instanceof Error ? err.message : "Failed to start report validation.");
    } finally {
      setValidating(false);
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
    htmlMatchAbortRef.current?.abort();
    setHtmlMatchCandidates(null);
    setHtmlMatchError(null);
    setSelectedHtmlTemplateId(null);
    setRequestingCustomReport(false);
    setCustomReportError(null);
    setCustomReportFiled(false);
  }

  const theme = REPORT_THEMES[selectedTheme ?? 0];
  const canProceedConnect = !!uploadedFile && !extracting;
  // Disabled only while a match check is actually in flight — never permanently blocked by the
  // match outcome itself, so the deterministic report path stays reachable as a fallback
  // regardless of whether an HTML template match was ever confirmed.
  const canProceedModel = !modelGenerating && !verifyingHtmlMatch;
  // A confirmed HTML template match needs no theme pick -- only the no-match fallback report does.
  // Strict mode's own Verify Template Match check lives on this same step (unlike AI mode, which
  // verifies earlier, at the model step, before ever reaching here) -- so the theme/color-palette
  // picker must stay hidden until that check has actually run. Showing it up front let a user pick
  // a theme that's immediately thrown away the moment a template match is confirmed.
  const strictAwaitingVerify = mode === "strict" && !selectedHtmlTemplateId && htmlMatchCandidates === null;
  const canProceedTemplate = (selectedTheme !== null || !!selectedHtmlTemplateId) && !reportGenerating;
  const reportGeneratingLabel = uploadProgressPct !== null
    ? `Uploading… ${uploadProgressPct}%`
    : "Generating report…";
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

        {mode === "ai" && <LowCreditsAlert balance={creditBalance} />}

        {flowStep === "connect" && (
          <>
            <ModeToggle mode={mode} onChange={setMode} />
            <ConnectDataStep
              uploadedFile={uploadedFile}
              onUpload={setUploadedFile}
              maxUploadBytes={maxUploadBytes}
              maxAsyncUploadBytes={maxAsyncUploadBytes}
            />
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
            requestingCustomReport={requestingCustomReport}
            customReportError={customReportError}
            customReportFiled={customReportFiled}
            filedRequestId={filedRequestId}
            onRequestCustomReport={handleRequestCustomReport}
          />
        )}

        {flowStep === "template" && (
          <>
            {mode === "strict" && (
              <Stack spacing={1.5} sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Check if we already have an interactive template that fits your data — if so, you
                  can skip picking a theme below and generate straight away.
                </Typography>
                {htmlMatchError && <Alert severity="error">{htmlMatchError}</Alert>}
                {htmlMatchCandidates && (
                  <Alert severity={htmlMatchCandidates.length > 0 ? "success" : "info"}>
                    {htmlMatchCandidates.length > 0
                      ? "We found a report template that fits your data:"
                      : "No confident template match yet — pick a theme below for the standard report layout."}
                    {htmlMatchCandidates.length > 0 && (
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" gap={0.75} sx={{ mt: 1 }}>
                        {htmlMatchCandidates.map((c) => (
                          <Chip
                            key={c.templateId}
                            size="small"
                            clickable
                            variant={c.templateId === selectedHtmlTemplateId ? "filled" : "outlined"}
                            color={c.templateId === selectedHtmlTemplateId ? "success" : "default"}
                            label={`${c.templateName} (${Math.round(c.confidence * 100)}%)`}
                            onClick={() => handleSelectHtmlTemplate(c.templateId)}
                          />
                        ))}
                      </Stack>
                    )}
                  </Alert>
                )}
                <Button
                  variant="outlined"
                  startIcon={verifyingHtmlMatch ? <CircularProgress size={16} color="inherit" /> : <VerifyMatchIcon />}
                  disabled={verifyingHtmlMatch || !uploadedFile}
                  onClick={handleVerifyHtmlMatch}
                  sx={{ alignSelf: "flex-start" }}
                >
                  {verifyingHtmlMatch ? "Checking for a template match…" : "Verify Template Match"}
                </Button>
              </Stack>
            )}
            {selectedHtmlTemplateId ? (
              <Alert severity="success">
                Using the matched template above — no theme needed. Click "Generate Report" below
                to continue.
              </Alert>
            ) : strictAwaitingVerify ? null : (
              <TemplateStep
                modelResult={modelResult}
                selected={selectedTheme}
                onSelect={setSelectedTheme}
                planTier={creditBalance?.subscriptionPlan ?? null}
              />
            )}
            {reportError && <Alert severity="error" sx={{ mt: 2 }}>{reportError}</Alert>}
          </>
        )}

        {flowStep === "report" && report && (
          <ReportResultsStep
            report={report} theme={theme}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            refreshing={refreshing}
            sourceFileName={uploadedFile?.name}
            showValidateReport={hasReportValidationAddOn}
            validating={validating}
            validateError={validateError}
            onValidateReport={handleValidateReport}
            requestingCustomReport={requestingCustomReport}
            customReportError={customReportError}
            customReportFiled={customReportFiled}
            filedRequestId={filedRequestId}
            onRequestCustomReport={handleRequestCustomReport}
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
            <Button
              variant="contained"
              disabled={!canProceedModel || reportGenerating}
              startIcon={reportGenerating ? <CircularProgress size={16} color="inherit" /> : undefined}
              onClick={() => {
                // A confirmed HTML template match means there's nothing left to pick -- skip the
                // theme-picker step (it's now only for the no-match fallback path) and generate
                // straight away.
                if (selectedHtmlTemplateId) void handleGenerateReport();
                else setFlowStep("template");
              }}
            >
              {modelGenerating
                ? "Generating model…"
                : reportGenerating
                ? reportGeneratingLabel
                : selectedHtmlTemplateId
                ? "Generate Report"
                : "Next"}
            </Button>
          )}
          {flowStep === "template" && (
            <Button variant="contained"
              disabled={!canProceedTemplate}
              onClick={handleGenerateReport}
              startIcon={reportGenerating ? <CircularProgress size={16} color="inherit" /> : undefined}>
              {reportGenerating ? reportGeneratingLabel : "Generate Report"}
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
