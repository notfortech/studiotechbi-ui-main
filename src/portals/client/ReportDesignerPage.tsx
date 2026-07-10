import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Stepper,
  Step,
  StepLabel,
  Tabs,
  Tab,
  TextField,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  alpha,
  InputAdornment,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  Storage as SqlIcon,
  Language as SharePointIcon,
  CheckCircle as CheckCircleIcon,
  Palette as PaletteIcon,
  TableChart as TableIcon,
  InsertDriveFile as FileIcon,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { useState, useRef } from "react";
import {
  extractSchemaFromExcel,
  extractSchemaFromSql,
  extractSchemaFromSharePoint,
  browseSharePoint,
  generateReportModel,
  type ExtractedSchemaDto,
  type GenerateReportModelResponse,
  type FileItem,
  type StarSchema,
  type TableInfo,
} from "../../api/reportDesignerApi";

// ── Visual theme definitions (frontend only) ─────────────────────────────────

const REPORT_THEMES = [
  { id: "warm-peach",   name: "Warm Peach",    primary: "#D4845A", dark: "#A85A2A", light: "#E8A878", bg: "#FBF4ED", label: "Elegant & warm" },
  { id: "ocean-blue",   name: "Ocean Blue",    primary: "#1E7FC1", dark: "#155A8A", light: "#4FA3D8", bg: "#EBF4FB", label: "Clean & professional" },
  { id: "forest",       name: "Forest Green",  primary: "#2D7A4F", dark: "#1E5235", light: "#5AAD7C", bg: "#EAF4EE", label: "Calm & trustworthy" },
  { id: "midnight",     name: "Midnight",      primary: "#6B5CE7", dark: "#4A3AB8", light: "#9B8FF0", bg: "#F0EEFB", label: "Bold & modern" },
  { id: "copper-gold",  name: "Copper Gold",   primary: "#C4882A", dark: "#8A5E1A", light: "#DFB060", bg: "#FBF4E8", label: "Premium & rich" },
  { id: "slate-pro",    name: "Slate Pro",     primary: "#4A6580", dark: "#2E3F52", light: "#7A96B0", bg: "#EDF1F5", label: "Minimal & sharp" },
] as const;

type VisualTheme = (typeof REPORT_THEMES)[number];

function themeById(id: string): VisualTheme {
  return REPORT_THEMES.find((t) => t.id === id) ?? REPORT_THEMES[0];
}

// ── Mini report preview SVG ───────────────────────────────────────────────────

function MiniReportPreview({ theme }: { theme: VisualTheme }) {
  const circ = 2 * Math.PI * 20;
  return (
    <svg viewBox="0 0 220 115" width="100%" style={{ display: "block", borderRadius: 6, background: theme.bg }}>
      {[
        { x: 2,   label: "Revenue",  val: "$2.4M", color: theme.primary },
        { x: 76,  label: "Target %", val: "92%",   color: theme.dark },
        { x: 150, label: "Clients",  val: "318",   color: theme.light },
      ].map(({ x, label, val, color }) => (
        <g key={label}>
          <rect x={x} y={2} width={68} height={46} rx={4} fill={color} opacity={0.15} />
          <rect x={x} y={2} width={68} height={6}  rx={2} fill={color} />
          <text x={x + 34} y={28} textAnchor="middle" fontFamily="Inter,sans-serif" fontSize={13} fontWeight="bold" fill={theme.dark}>{val}</text>
          <text x={x + 34} y={41} textAnchor="middle" fontFamily="Inter,sans-serif" fontSize={8}  fill="#888">{label}</text>
        </g>
      ))}
      <circle cx={52} cy={85} r={20} fill="none" stroke={`${theme.primary}30`} strokeWidth={10} />
      <circle cx={52} cy={85} r={20} fill="none" stroke={theme.primary} strokeWidth={10}
        strokeDasharray={`${circ * 0.45} ${circ}`} strokeDashoffset={circ * 0.25} transform="rotate(-90 52 85)" />
      <circle cx={52} cy={85} r={20} fill="none" stroke={theme.light} strokeWidth={10}
        strokeDasharray={`${circ * 0.3} ${circ}`} strokeDashoffset={-circ * 0.2} transform="rotate(-90 52 85)" />
      <text x={52} y={88} textAnchor="middle" fontFamily="Inter,sans-serif" fontSize={9} fontWeight="bold" fill={theme.dark}>65%</text>
      <rect x={88} y={54} width={130} height={14} rx={2} fill={theme.primary} />
      <text x={92} y={64} fontFamily="Inter,sans-serif" fontSize={8} fontWeight="bold" fill="white">Category</text>
      <text x={148} y={64} fontFamily="Inter,sans-serif" fontSize={8} fontWeight="bold" fill="white">Amount</text>
      <text x={196} y={64} fontFamily="Inter,sans-serif" fontSize={8} fontWeight="bold" fill="white">%</text>
      {[{ cat: "Sales", amt: "1,240", pct: "45%" }, { cat: "Services", amt: "890", pct: "32%" }, { cat: "Other", amt: "632", pct: "23%" }]
        .map(({ cat, amt, pct }, i) => (
          <g key={cat}>
            <rect x={88} y={68 + i * 15} width={130} height={15} fill={i % 2 === 0 ? `${theme.primary}10` : "white"} />
            <text x={92}  y={79 + i * 15} fontFamily="Inter,sans-serif" fontSize={8} fill="#444">{cat}</text>
            <text x={148} y={79 + i * 15} fontFamily="Inter,sans-serif" fontSize={8} fill="#444">{amt}</text>
            <text x={196} y={79 + i * 15} fontFamily="Inter,sans-serif" fontSize={8} fill={theme.dark} fontWeight="600">{pct}</text>
          </g>
        ))}
    </svg>
  );
}

// ── Dynamic star schema diagram ───────────────────────────────────────────────

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

function StarSchemaDiagram({
  starSchema, tables,
}: {
  starSchema: StarSchema; tables: TableInfo[];
}) {
  const tableMap = new Map(tables.map((t) => [t.tableName, t]));
  const factCols = tableMap.get(starSchema.factTable)?.columns ?? [];
  const dims = starSchema.dimensionTables.slice(0, 7);
  const N = dims.length;

  // Position dims evenly around center
  const dimPositions = dims.map((name, i) => {
    const angle = -Math.PI / 2 + (i / N) * 2 * Math.PI;
    const cx = CX + RADIUS * Math.cos(angle);
    const cy = CY + RADIUS * Math.sin(angle);
    return { name, cx, cy, cols: tableMap.get(name)?.columns ?? [] };
  });

  const factH = nodeHeight(factCols.length);
  const factX = CX - NODE_W / 2;
  const factY = CY - factH / 2;

  // viewBox: fit all nodes
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
            <marker id="rd-arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#3730A3" opacity={0.5} />
            </marker>
          </defs>
          {dimPositions.map(({ name, cx, cy }) => (
            <line key={name} x1={cx} y1={cy} x2={CX} y2={CY}
              stroke="#3730A3" strokeWidth={1.5} strokeDasharray="5 3" opacity={0.45}
              markerEnd="url(#rd-arrow)" />
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

// ── Step components ───────────────────────────────────────────────────────────

const STEPS = ["Connect Data", "Data Model", "Report Template"];

function ConnectDataStep({
  tab, onTab,
  uploadedFile, onUpload,
  sqlForm, onSqlForm,
  spUrl, onSpUrl,
  spFiles, onBrowse, spBrowsing, spBrowseError,
  spSelected, onSpSelect,
}: {
  tab: number; onTab: (t: number) => void;
  uploadedFile: File | null; onUpload: (f: File) => void;
  sqlForm: Record<string, string>; onSqlForm: (k: string, v: string) => void;
  spUrl: string; onSpUrl: (v: string) => void;
  spFiles: FileItem[]; onBrowse: () => void; spBrowsing: boolean; spBrowseError: string | null;
  spSelected: FileItem | null; onSpSelect: (f: FileItem) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);

  const excelFiles = spFiles.filter((f) =>
    f.name.endsWith(".xlsx") || f.name.endsWith(".xls") || f.name.endsWith(".csv") ||
    f.mimeType.includes("spreadsheet") || f.mimeType.includes("excel")
  );

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>Connect Your Data</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Choose a data source. The schema will be extracted and used to generate your report model.
      </Typography>

      <Tabs value={tab} onChange={(_, v) => onTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}>
        <Tab icon={<UploadIcon fontSize="small" />} iconPosition="start" label="Upload Excel" />
        <Tab icon={<SqlIcon fontSize="small" />} iconPosition="start" label="SQL Database" />
        <Tab icon={<SharePointIcon fontSize="small" />} iconPosition="start" label="SharePoint" />
      </Tabs>

      {/* Excel upload */}
      {tab === 0 && (
        <Box>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
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
                <Typography variant="body2" color="text.secondary">Supports .xlsx, .xls, .csv · max 50 MB</Typography>
              </Stack>
            )}
          </Box>
        </Box>
      )}

      {/* SQL */}
      {tab === 1 && (
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField label="Host / Server" fullWidth size="small"
                placeholder="e.g. myserver.database.windows.net"
                value={sqlForm.host} onChange={(e) => onSqlForm("host", e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Port" fullWidth size="small"
                value={sqlForm.port} onChange={(e) => onSqlForm("port", e.target.value)} />
            </Grid>
          </Grid>
          <TextField label="Database Name" fullWidth size="small"
            value={sqlForm.database} onChange={(e) => onSqlForm("database", e.target.value)} />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Username" fullWidth size="small"
                value={sqlForm.username} onChange={(e) => onSqlForm("username", e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Password" type={showPassword ? "text" : "password"} fullWidth size="small"
                value={sqlForm.password} onChange={(e) => onSqlForm("password", e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPassword((v) => !v)} edge="end">
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }} />
            </Grid>
          </Grid>
          <Alert severity="info">Credentials are encrypted in transit and never stored in plain text.</Alert>
        </Stack>
      )}

      {/* SharePoint */}
      {tab === 2 && (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <TextField label="SharePoint Site URL" fullWidth size="small"
              placeholder="https://mytenant.sharepoint.com/sites/Finance"
              value={spUrl} onChange={(e) => onSpUrl(e.target.value)} />
            <Button variant="outlined" size="small" disabled={!spUrl.trim() || spBrowsing}
              onClick={onBrowse} sx={{ whiteSpace: "nowrap", mt: 0.25 }}>
              {spBrowsing ? <CircularProgress size={16} /> : "Browse"}
            </Button>
          </Stack>

          {spBrowseError && <Alert severity="error">{spBrowseError}</Alert>}

          {excelFiles.length > 0 && (
            <Paper variant="outlined" sx={{ p: 1.5, maxHeight: 240, overflowY: "auto" }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, px: 0.5 }}>
                Select an Excel or CSV file
              </Typography>
              <List dense disablePadding>
                {excelFiles.map((f) => (
                  <ListItemButton key={f.id} dense selected={spSelected?.id === f.id} onClick={() => onSpSelect(f)}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <FileIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={f.name} primaryTypographyProps={{ variant: "body2" }} />
                    {spSelected?.id === f.id && <CheckCircleIcon fontSize="small" color="primary" />}
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}

          {spSelected && (
            <Alert severity="success" icon={<CheckCircleIcon />}>
              Selected: <strong>{spSelected.name}</strong>
            </Alert>
          )}
        </Stack>
      )}
    </Box>
  );
}

function DataModelStep({
  extractedSchema, modelResult, generating, generateError,
}: {
  extractedSchema: ExtractedSchemaDto;
  modelResult: GenerateReportModelResponse | null;
  generating: boolean;
  generateError: string | null;
}) {
  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>Generated Data Model</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Based on <strong>{extractedSchema.fileName}</strong> ({extractedSchema.tables.length} table{extractedSchema.tables.length !== 1 ? "s" : ""}
        {" "}· extracted {new Date(extractedSchema.extractedAt).toLocaleTimeString()}),
        the AI is inferring a star schema and scoring report templates.
      </Typography>

      {generateError && <Alert severity="error" sx={{ mb: 2 }}>{generateError}</Alert>}

      {generating ? (
        <Stack spacing={2} sx={{ py: 4 }}>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Analysing schema and generating model…
          </Typography>
          <LinearProgress sx={{ borderRadius: 1 }} />
        </Stack>
      ) : modelResult ? (
        <Box>
          {modelResult.starSchema ? (
            <StarSchemaDiagram starSchema={modelResult.starSchema} tables={extractedSchema.tables} />
          ) : (
            <Alert severity="warning">
              Couldn't infer a star schema for this dataset — your template selection and Power BI
              generation will still work, just without the schema preview above.
            </Alert>
          )}
          <Alert severity="info" sx={{ mt: 2 }}>
            Model generated in {modelResult.durationMs.toLocaleString()} ms.
            Relationships and measure suggestions will be applied to your Power BI template.
          </Alert>
        </Box>
      ) : null}
    </Box>
  );
}

function TemplateStep({
  modelResult, selected, onSelect,
}: {
  modelResult: GenerateReportModelResponse | null;
  selected: number | null;
  onSelect: (i: number) => void;
}) {
  // Map API template options to visual themes; fall back to all themes if API data unavailable
  const apiTemplates = modelResult?.templates;
  const themes = apiTemplates?.length
    ? apiTemplates.map((t) => ({
        visual: themeById(t.themeId),
        score: t.score,
        apiName: t.themeName,
      }))
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
              <CardActionArea onClick={() => onSelect(i)} sx={{ height: "100%" }}>
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

// ── Page shell ────────────────────────────────────────────────────────────────

export function ReportDesignerPage() {
  const [step, setStep] = useState(0);

  // Step 0 — data source
  const [dataTab, setDataTab] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [sqlForm, setSqlForm] = useState({ host: "", port: "1433", database: "", username: "", password: "" });
  const [spUrl, setSpUrl] = useState("");
  const [spFiles, setSpFiles] = useState<FileItem[]>([]);
  const [spSelected, setSpSelected] = useState<FileItem | null>(null);
  const [spBrowsing, setSpBrowsing] = useState(false);
  const [spBrowseError, setSpBrowseError] = useState<string | null>(null);

  // API results
  const [extractedSchema, setExtractedSchema] = useState<ExtractedSchemaDto | null>(null);
  const [modelResult, setModelResult] = useState<GenerateReportModelResponse | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Step 2
  const [selectedTheme, setSelectedTheme] = useState<number | null>(null);
  const [applied, setApplied] = useState(false);

  const canProceedStep0 =
    !processing && (
      dataTab === 0 ? !!uploadedFile
      : dataTab === 1 ? !!(sqlForm.host && sqlForm.database && sqlForm.username)
      : !!spSelected
    );

  async function handleBrowseSharePoint() {
    setSpBrowsing(true);
    setSpBrowseError(null);
    setSpFiles([]);
    setSpSelected(null);
    try {
      const files = await browseSharePoint(spUrl);
      setSpFiles(files);
    } catch (err) {
      setSpBrowseError(err instanceof Error ? err.message : "Failed to connect to SharePoint.");
    } finally {
      setSpBrowsing(false);
    }
  }

  async function handleNext() {
    if (step === 0) {
      setProcessError(null);
      setProcessing(true);
      try {
        let schema: ExtractedSchemaDto;

        if (dataTab === 0) {
          schema = await extractSchemaFromExcel(uploadedFile!);
        } else if (dataTab === 1) {
          schema = await extractSchemaFromSql({
            host: sqlForm.host,
            port: parseInt(sqlForm.port, 10) || 1433,
            database: sqlForm.database,
            username: sqlForm.username,
            password: sqlForm.password,
          });
        } else {
          schema = await extractSchemaFromSharePoint({
            siteUrl: spUrl,
            driveItemId: spSelected!.id,
            fileName: spSelected!.name,
          });
        }

        setExtractedSchema(schema);
        setStep(1);

        // Kick off model generation while user reads the schema step
        setGenerating(true);
        setGenerateError(null);
        try {
          const model = await generateReportModel(schema);
          setModelResult(model);
        } catch (err) {
          setGenerateError(err instanceof Error ? err.message : "Model generation failed.");
        } finally {
          setGenerating(false);
        }
      } catch (err) {
        setProcessError(err instanceof Error ? err.message : "Failed to extract schema.");
      } finally {
        setProcessing(false);
      }
    } else {
      setStep((s) => s + 1);
    }
  }

  // Success screen
  if (applied) {
    const themeIndex = selectedTheme ?? 0;
    const modelThemes = modelResult?.templates ?? [];
    const apiTheme = modelThemes[themeIndex];
    const visual = apiTheme ? themeById(apiTheme.themeId) : REPORT_THEMES[themeIndex % REPORT_THEMES.length];

    return (
      <Box>
        <Paper sx={{ p: 4, textAlign: "center", maxWidth: 560, mx: "auto", mt: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 56, color: "primary.main", mb: 2 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>Design Applied</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Your Power BI report has been configured with the <strong>{visual.name}</strong> theme
            based on <strong>{extractedSchema?.fileName}</strong>.
          </Typography>
          <Stack direction="row" justifyContent="center" spacing={1} sx={{ mb: 3 }}>
            {[visual.dark, visual.primary, visual.light, visual.bg].map((c) => (
              <Box key={c} sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: c, border: "1px solid", borderColor: "divider" }} />
            ))}
          </Stack>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button variant="outlined" onClick={() => {
              setApplied(false); setStep(0);
              setUploadedFile(null); setSpSelected(null); setSpFiles([]);
              setExtractedSchema(null); setModelResult(null); setSelectedTheme(null);
            }}>
              Start Over
            </Button>
            <Button variant="contained" startIcon={<TableIcon />}>View Reports</Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 4 }}>
          <PaletteIcon color="primary" />
          <Box>
            <Typography variant="h5" fontWeight={600}>Report Designer</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Connect your data, review the generated schema, then pick a colour theme for your Power BI report.
            </Typography>
          </Box>
        </Stack>

        <Stepper activeStep={step} sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        {step === 0 && (
          <>
            <ConnectDataStep
              tab={dataTab} onTab={setDataTab}
              uploadedFile={uploadedFile} onUpload={setUploadedFile}
              sqlForm={sqlForm} onSqlForm={(k, v) => setSqlForm((f) => ({ ...f, [k]: v }))}
              spUrl={spUrl} onSpUrl={setSpUrl}
              spFiles={spFiles} onBrowse={handleBrowseSharePoint}
              spBrowsing={spBrowsing} spBrowseError={spBrowseError}
              spSelected={spSelected} onSpSelect={setSpSelected}
            />
            {processError && <Alert severity="error" sx={{ mt: 2 }}>{processError}</Alert>}
          </>
        )}

        {step === 1 && extractedSchema && (
          <DataModelStep
            extractedSchema={extractedSchema}
            modelResult={modelResult}
            generating={generating}
            generateError={generateError}
          />
        )}

        {step === 2 && (
          <TemplateStep
            modelResult={modelResult}
            selected={selectedTheme}
            onSelect={setSelectedTheme}
          />
        )}

        <Stack direction="row" justifyContent="flex-end" spacing={2}
          sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: "divider" }}>
          {step > 0 && (
            <Button variant="outlined" onClick={() => setStep((s) => s - 1)}
              disabled={step === 1 && generating}>
              Back
            </Button>
          )}
          {step < 2 && (
            <Button variant="contained"
              disabled={step === 0 ? !canProceedStep0 : (step === 1 && generating)}
              onClick={handleNext}
              startIcon={processing ? <CircularProgress size={16} color="inherit" /> : undefined}>
              {processing ? "Extracting schema…" : step === 1 && generating ? "Generating model…" : "Next"}
            </Button>
          )}
          {step === 2 && (
            <Button variant="contained" disabled={selectedTheme === null} onClick={() => setApplied(true)}>
              Apply Design
            </Button>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
