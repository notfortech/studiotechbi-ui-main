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
  FolderOpen as FolderIcon,
  InsertDriveFile as FileIcon,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { useState, useRef, useEffect } from "react";

// ── Color themes ─────────────────────────────────────────────────────────────

const REPORT_THEMES = [
  {
    id: "warm-peach",
    name: "Warm Peach",
    primary: "#D4845A",
    dark: "#A85A2A",
    light: "#E8A878",
    bg: "#FBF4ED",
    label: "Elegant & warm",
  },
  {
    id: "ocean-blue",
    name: "Ocean Blue",
    primary: "#1E7FC1",
    dark: "#155A8A",
    light: "#4FA3D8",
    bg: "#EBF4FB",
    label: "Clean & professional",
  },
  {
    id: "forest",
    name: "Forest Green",
    primary: "#2D7A4F",
    dark: "#1E5235",
    light: "#5AAD7C",
    bg: "#EAF4EE",
    label: "Calm & trustworthy",
  },
  {
    id: "midnight",
    name: "Midnight",
    primary: "#6B5CE7",
    dark: "#4A3AB8",
    light: "#9B8FF0",
    bg: "#F0EEFB",
    label: "Bold & modern",
  },
  {
    id: "copper-gold",
    name: "Copper Gold",
    primary: "#C4882A",
    dark: "#8A5E1A",
    light: "#DFB060",
    bg: "#FBF4E8",
    label: "Premium & rich",
  },
  {
    id: "slate-pro",
    name: "Slate Pro",
    primary: "#4A6580",
    dark: "#2E3F52",
    light: "#7A96B0",
    bg: "#EDF1F5",
    label: "Minimal & sharp",
  },
] as const;

type Theme = (typeof REPORT_THEMES)[number];

// ── Mini report preview (SVG) ─────────────────────────────────────────────────

function MiniReportPreview({ theme }: { theme: Theme }) {
  const W = 220;
  const H = 115;
  const circ = 2 * Math.PI * 20;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ display: "block", borderRadius: 6, background: theme.bg }}
    >
      {/* ── KPI tiles (top row) ──────────────────────────────── */}
      {[
        { x: 2, label: "Revenue", val: "$2.4M", color: theme.primary },
        { x: 76, label: "Target %", val: "92%", color: theme.dark },
        { x: 150, label: "Clients", val: "318", color: theme.light },
      ].map(({ x, label, val, color }) => (
        <g key={label}>
          <rect x={x} y={2} width={68} height={46} rx={4} fill={color} opacity={0.15} />
          <rect x={x} y={2} width={68} height={6} rx={2} fill={color} />
          <text x={x + 34} y={28} textAnchor="middle" fontFamily="Inter,sans-serif" fontSize={13} fontWeight="bold" fill={theme.dark}>
            {val}
          </text>
          <text x={x + 34} y={41} textAnchor="middle" fontFamily="Inter,sans-serif" fontSize={8} fill="#888">
            {label}
          </text>
        </g>
      ))}

      {/* ── Doughnut chart ───────────────────────────────────── */}
      {/* background ring */}
      <circle cx={52} cy={85} r={20} fill="none" stroke={theme.bg} strokeWidth={10} />
      <circle cx={52} cy={85} r={20} fill="none" stroke={`${theme.primary}30`} strokeWidth={10} />
      {/* arc 1 */}
      <circle
        cx={52} cy={85} r={20}
        fill="none"
        stroke={theme.primary}
        strokeWidth={10}
        strokeDasharray={`${circ * 0.45} ${circ}`}
        strokeDashoffset={circ * 0.25}
        transform="rotate(-90 52 85)"
      />
      {/* arc 2 */}
      <circle
        cx={52} cy={85} r={20}
        fill="none"
        stroke={theme.light}
        strokeWidth={10}
        strokeDasharray={`${circ * 0.3} ${circ}`}
        strokeDashoffset={-circ * 0.2}
        transform="rotate(-90 52 85)"
      />
      <text x={52} y={88} textAnchor="middle" fontFamily="Inter,sans-serif" fontSize={9} fontWeight="bold" fill={theme.dark}>
        65%
      </text>

      {/* ── Mini table ───────────────────────────────────────── */}
      <rect x={88} y={54} width={130} height={14} rx={2} fill={theme.primary} />
      <text x={92} y={64} fontFamily="Inter,sans-serif" fontSize={8} fontWeight="bold" fill="white">Category</text>
      <text x={148} y={64} fontFamily="Inter,sans-serif" fontSize={8} fontWeight="bold" fill="white">Amount</text>
      <text x={196} y={64} fontFamily="Inter,sans-serif" fontSize={8} fontWeight="bold" fill="white">%</text>
      {[
        { cat: "Sales", amt: "1,240", pct: "45%" },
        { cat: "Services", amt: "890", pct: "32%" },
        { cat: "Other", amt: "632", pct: "23%" },
      ].map(({ cat, amt, pct }, i) => (
        <g key={cat}>
          <rect x={88} y={68 + i * 15} width={130} height={15} fill={i % 2 === 0 ? `${theme.primary}10` : "white"} />
          <text x={92} y={79 + i * 15} fontFamily="Inter,sans-serif" fontSize={8} fill="#444">{cat}</text>
          <text x={148} y={79 + i * 15} fontFamily="Inter,sans-serif" fontSize={8} fill="#444">{amt}</text>
          <text x={196} y={79 + i * 15} fontFamily="Inter,sans-serif" fontSize={8} fill={theme.dark} fontWeight="600">{pct}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Star schema diagram ───────────────────────────────────────────────────────

const SCHEMA_TABLES = {
  fact: {
    name: "FactTransactions",
    pk: "TransactionID (PK)",
    cols: ["DateKey (FK)", "CustomerKey (FK)", "ProductKey (FK)", "LocationKey (FK)", "Amount", "Quantity", "TaxAmount"],
  },
  dims: [
    { name: "DimDate", pk: "DateKey (PK)", cols: ["Date", "Month", "Quarter", "Year", "Weekday"], cx: 295, cy: 0 },
    { name: "DimCustomer", pk: "CustomerKey (PK)", cols: ["CustomerName", "Segment", "Region", "Email"], cx: 530, cy: 100 },
    { name: "DimProduct", pk: "ProductKey (PK)", cols: ["ProductName", "Category", "Brand", "UnitCost"], cx: 490, cy: 270 },
    { name: "DimLocation", pk: "LocationKey (PK)", cols: ["City", "State", "Country", "PostCode"], cx: 100, cy: 270 },
    { name: "DimCategory", pk: "CategoryKey (PK)", cols: ["CategoryName", "ParentCategory", "Code"], cx: 60, cy: 100 },
  ],
};

function SchemaNode({
  x, y, name, pk, cols, isFact,
}: {
  x: number; y: number; name: string; pk: string; cols: string[]; isFact?: boolean;
}) {
  const W = isFact ? 165 : 148;
  const HEADER_H = 26;
  const ROW_H = 16;
  const bodyH = ROW_H + cols.length * ROW_H + 6;

  return (
    <g>
      <rect x={x} y={y} width={W} height={HEADER_H} rx={5} ry={0} fill={isFact ? "#D4845A" : "#A85A2A"} />
      <rect x={x} y={y + HEADER_H - 2} width={W} height={bodyH + 2} rx={0} ry={0} fill="white" stroke="#e0c5b0" strokeWidth={1} />
      <rect x={x} y={y} width={W} height={HEADER_H + bodyH} rx={5} fill="none" stroke="#e0c5b0" strokeWidth={1} />
      <text x={x + 8} y={y + 17} fontFamily="Inter,sans-serif" fontSize={11} fontWeight="bold" fill="white">
        {name}
      </text>
      {/* PK row */}
      <text x={x + 8} y={y + HEADER_H + ROW_H} fontFamily="Inter,sans-serif" fontSize={9.5} fill="#A85A2A" fontWeight="600">
        🔑 {pk}
      </text>
      {cols.map((col, i) => (
        <text key={col} x={x + 8} y={y + HEADER_H + ROW_H * (i + 2)} fontFamily="Inter,sans-serif" fontSize={9} fill="#555">
          {col}
        </text>
      ))}
    </g>
  );
}

function StarSchemaDiagram() {
  // Fact table top-left corner
  const FX = 213;
  const FY = 120;
  const FW = 165;
  const FH = 168; // header + 8 rows
  // Fact center
  const FCX = FX + FW / 2; // ≈295
  const FCY = FY + FH / 2; // ≈204

  // Dim table anchors (center of the dim table → connection point toward fact)
  const getDimConn = (cx: number, cy: number, w = 148, h = 110) => ({
    x: cx - w / 2,
    y: cy - h / 2,
    // connection point on the edge closest to fact center
    connX: cx < FCX ? cx + w / 2 : cx - w / 2,
    connY: cy < FCY ? cy + h / 2 : cy - h / 2,
  });

  return (
    <Box sx={{ overflowX: "auto" }}>
      <svg viewBox="0 0 640 380" style={{ width: "100%", minWidth: 360, maxWidth: 700, display: "block", margin: "0 auto" }}>
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#A85A2A" opacity={0.6} />
          </marker>
        </defs>

        {/* Lines from dims to fact */}
        {SCHEMA_TABLES.dims.map((dim) => {
          const conn = getDimConn(dim.cx, dim.cy);
          return (
            <line
              key={dim.name}
              x1={conn.connX}
              y1={conn.connY}
              x2={FCX}
              y2={FCY}
              stroke="#A85A2A"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              opacity={0.5}
              markerEnd="url(#arrow)"
            />
          );
        })}

        {/* Fact table */}
        <SchemaNode
          x={FX} y={FY}
          name={SCHEMA_TABLES.fact.name}
          pk={SCHEMA_TABLES.fact.pk}
          cols={SCHEMA_TABLES.fact.cols}
          isFact
        />

        {/* Dim tables */}
        {SCHEMA_TABLES.dims.map((dim) => {
          const { x, y } = getDimConn(dim.cx, dim.cy);
          return (
            <SchemaNode
              key={dim.name}
              x={x} y={y}
              name={dim.name}
              pk={dim.pk}
              cols={dim.cols}
            />
          );
        })}

        {/* Schema type label */}
        <text x={12} y={372} fontFamily="Inter,sans-serif" fontSize={10} fill="#999">
          Star Schema · 1 Fact · 5 Dimensions · 36 Columns
        </text>
      </svg>
    </Box>
  );
}

// ── Mock SharePoint file tree ─────────────────────────────────────────────────

const SP_FILES = [
  { id: "f1", name: "Financial_Report_2024.xlsx", isFolder: false },
  { id: "f2", name: "Sales_Data_Q2_2025.xlsx", isFolder: false },
  { id: "folder1", name: "Monthly Reports", isFolder: true, children: [
    { id: "f3", name: "Jan_2025.xlsx", isFolder: false },
    { id: "f4", name: "Feb_2025.xlsx", isFolder: false },
    { id: "f5", name: "Mar_2025.xlsx", isFolder: false },
  ]},
  { id: "f6", name: "Client_List.xlsx", isFolder: false },
  { id: "f7", name: "Budget_Actuals.xlsx", isFolder: false },
];

// ── Wizard steps ──────────────────────────────────────────────────────────────

const STEPS = ["Connect Data", "Data Model", "Report Template"];

function ConnectDataStep({
  tab, onTab,
  uploadedFile, onUpload,
  sqlForm, onSqlForm,
  spUrl, onSpUrl,
  spFile, onSpFile,
}: {
  tab: number; onTab: (t: number) => void;
  uploadedFile: File | null; onUpload: (f: File) => void;
  sqlForm: Record<string, string>; onSqlForm: (k: string, v: string) => void;
  spUrl: string; onSpUrl: (v: string) => void;
  spFile: string | null; onSpFile: (v: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [spExpanded, setSpExpanded] = useState<string | null>(null);
  const [spConnected, setSpConnected] = useState(false);

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Connect Your Data
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Choose how to bring your data in. The connector will be used to generate your data model and populate report templates.
      </Typography>

      <Tabs value={tab} onChange={(_, v) => onTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}>
        <Tab icon={<UploadIcon fontSize="small" />} iconPosition="start" label="Upload Excel" />
        <Tab icon={<SqlIcon fontSize="small" />} iconPosition="start" label="SQL Database" />
        <Tab icon={<SharePointIcon fontSize="small" />} iconPosition="start" label="SharePoint" />
      </Tabs>

      {/* Tab 0: Excel upload */}
      {tab === 0 && (
        <Box>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
            }}
          />
          <Box
            onClick={() => fileInputRef.current?.click()}
            sx={{
              border: "2px dashed",
              borderColor: uploadedFile ? "primary.main" : "divider",
              borderRadius: 2,
              p: 4,
              textAlign: "center",
              cursor: "pointer",
              bgcolor: uploadedFile ? (t) => alpha(t.palette.primary.main, 0.04) : "background.paper",
              transition: "all 0.2s",
              "&:hover": { borderColor: "primary.main", bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
            }}
          >
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
                <Typography variant="body2" color="text.secondary">
                  Supports .xlsx, .xls, .csv
                </Typography>
              </Stack>
            )}
          </Box>
        </Box>
      )}

      {/* Tab 1: SQL */}
      {tab === 1 && (
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                label="Host / Server"
                fullWidth
                size="small"
                placeholder="e.g. myserver.database.windows.net"
                value={sqlForm.host}
                onChange={(e) => onSqlForm("host", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Port"
                fullWidth
                size="small"
                value={sqlForm.port}
                onChange={(e) => onSqlForm("port", e.target.value)}
              />
            </Grid>
          </Grid>
          <TextField
            label="Database Name"
            fullWidth
            size="small"
            value={sqlForm.database}
            onChange={(e) => onSqlForm("database", e.target.value)}
          />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Username"
                fullWidth
                size="small"
                value={sqlForm.username}
                onChange={(e) => onSqlForm("username", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Password"
                type={showPassword ? "text" : "password"}
                fullWidth
                size="small"
                value={sqlForm.password}
                onChange={(e) => onSqlForm("password", e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPassword((v) => !v)} edge="end">
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
          <Alert severity="info" sx={{ mt: 1 }}>
            Connection credentials are encrypted in transit and never stored in plain text.
          </Alert>
        </Stack>
      )}

      {/* Tab 2: SharePoint */}
      {tab === 2 && (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <TextField
              label="SharePoint Site URL"
              fullWidth
              size="small"
              placeholder="https://myorg.sharepoint.com/sites/Finance"
              value={spUrl}
              onChange={(e) => onSpUrl(e.target.value)}
            />
            <Button
              variant="outlined"
              size="small"
              disabled={!spUrl.trim()}
              onClick={() => setSpConnected(true)}
              sx={{ whiteSpace: "nowrap", mt: 0.25 }}
            >
              Connect
            </Button>
          </Stack>

          {spConnected && (
            <Paper variant="outlined" sx={{ p: 1.5, maxHeight: 240, overflowY: "auto" }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, px: 0.5 }}>
                Select an Excel file from your SharePoint site
              </Typography>
              <List dense disablePadding>
                {SP_FILES.map((item) =>
                  item.isFolder ? (
                    <Box key={item.id}>
                      <ListItemButton dense onClick={() => setSpExpanded(spExpanded === item.id ? null : item.id)}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <FolderIcon fontSize="small" color="primary" />
                        </ListItemIcon>
                        <ListItemText primary={item.name} primaryTypographyProps={{ variant: "body2" }} />
                      </ListItemButton>
                      {spExpanded === item.id &&
                        "children" in item &&
                        item.children?.map((child) => (
                          <ListItemButton
                            key={child.id}
                            dense
                            selected={spFile === child.name}
                            onClick={() => onSpFile(child.name)}
                            sx={{ pl: 4 }}
                          >
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <FileIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={child.name} primaryTypographyProps={{ variant: "body2" }} />
                            {spFile === child.name && <CheckCircleIcon fontSize="small" color="primary" />}
                          </ListItemButton>
                        ))}
                    </Box>
                  ) : (
                    <ListItemButton
                      key={item.id}
                      dense
                      selected={spFile === item.name}
                      onClick={() => onSpFile(item.name)}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <FileIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={item.name} primaryTypographyProps={{ variant: "body2" }} />
                      {spFile === item.name && <CheckCircleIcon fontSize="small" color="primary" />}
                    </ListItemButton>
                  )
                )}
              </List>
            </Paper>
          )}

          {spFile && (
            <Alert severity="success" icon={<CheckCircleIcon />}>
              Selected: <strong>{spFile}</strong>
            </Alert>
          )}
        </Stack>
      )}
    </Box>
  );
}

function DataModelStep({ dataSource }: { dataSource: string }) {
  const [generating, setGenerating] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setGenerating(false), 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Generated Data Model
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Based on <strong>{dataSource}</strong>, the AI has inferred a star schema with the following tables.
      </Typography>

      {generating ? (
        <Stack spacing={2} sx={{ py: 4 }}>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Analysing data structure…
          </Typography>
          <LinearProgress sx={{ borderRadius: 1 }} />
        </Stack>
      ) : (
        <Box>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
            <Chip label="Star Schema" size="small" color="primary" />
            <Chip label="1 Fact Table" size="small" variant="outlined" />
            <Chip label="5 Dimensions" size="small" variant="outlined" />
            <Chip label="36 Columns" size="small" variant="outlined" />
          </Stack>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: "background.default" }}>
            <StarSchemaDiagram />
          </Paper>
          <Alert severity="info" sx={{ mt: 2 }}>
            This schema will be used to configure your Power BI data model. You can refine table relationships after the report is provisioned.
          </Alert>
        </Box>
      )}
    </Box>
  );
}

function TemplateStep({
  selected,
  onSelect,
}: {
  selected: number | null;
  onSelect: (i: number) => void;
}) {
  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Choose a Report Template
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Each template includes a KPI summary page, a doughnut breakdown, and a detailed data table — styled in your chosen colour theme.
      </Typography>

      <Grid container spacing={2}>
        {REPORT_THEMES.map((theme, i) => (
          <Grid key={theme.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card
              variant="outlined"
              sx={{
                borderColor: selected === i ? "primary.main" : "divider",
                borderWidth: selected === i ? 2 : 1,
                transition: "all 0.15s",
                height: "100%",
              }}
            >
              <CardActionArea onClick={() => onSelect(i)} sx={{ height: "100%" }}>
                <CardContent sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <PaletteIcon sx={{ fontSize: 16, color: theme.primary }} />
                      <Typography variant="subtitle2" fontWeight={700}>
                        {theme.name}
                      </Typography>
                    </Stack>
                    {selected === i && <CheckCircleIcon color="primary" fontSize="small" />}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                    {theme.label}
                  </Typography>

                  {/* Mini preview */}
                  <MiniReportPreview theme={theme} />

                  {/* Swatch row */}
                  <Stack direction="row" spacing={0.5} sx={{ mt: 1.5 }}>
                    {[theme.dark, theme.primary, theme.light, theme.bg].map((color) => (
                      <Box
                        key={color}
                        sx={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          bgcolor: color,
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      />
                    ))}
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, alignSelf: "center" }}>
                      {theme.primary}
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

  // Step 0 state
  const [dataTab, setDataTab] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [sqlForm, setSqlForm] = useState({
    host: "", port: "1433", database: "", username: "", password: "",
  });
  const [spUrl, setSpUrl] = useState("");
  const [spFile, setSpFile] = useState<string | null>(null);

  // Step 2 state
  const [selectedTheme, setSelectedTheme] = useState<number | null>(null);
  const [applied, setApplied] = useState(false);

  const dataSourceLabel =
    dataTab === 0 ? (uploadedFile?.name ?? "")
    : dataTab === 1 ? (sqlForm.database ? `${sqlForm.database} @ ${sqlForm.host}` : "")
    : (spFile ?? "");

  const canProceedStep0 =
    dataTab === 0 ? !!uploadedFile
    : dataTab === 1 ? !!(sqlForm.host && sqlForm.database && sqlForm.username)
    : !!spFile;

  const canProceedStep2 = selectedTheme !== null;

  function handleNext() {
    setStep((s) => s + 1);
  }

  function handleApply() {
    setApplied(true);
  }

  if (applied) {
    const theme = REPORT_THEMES[selectedTheme!];
    return (
      <Box>
        <Paper sx={{ p: 4, textAlign: "center", maxWidth: 560, mx: "auto", mt: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 56, color: "primary.main", mb: 2 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Design Applied
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Your report template has been configured with the <strong>{theme.name}</strong> theme.
            Your Power BI report will be provisioned with this design.
          </Typography>
          <Stack direction="row" justifyContent="center" spacing={1} sx={{ mb: 3 }}>
            {[theme.dark, theme.primary, theme.light, theme.bg].map((c) => (
              <Box key={c} sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: c, border: "1px solid", borderColor: "divider" }} />
            ))}
          </Stack>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button variant="outlined" onClick={() => { setApplied(false); setStep(0); setUploadedFile(null); setSpFile(null); setSelectedTheme(null); }}>
              Start Over
            </Button>
            <Button variant="contained" startIcon={<TableIcon />}>
              View Reports
            </Button>
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
            <Typography variant="h5" fontWeight={600}>
              Report Designer
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Connect your data, preview the generated model, then choose a colour theme for your Power BI report.
            </Typography>
          </Box>
        </Stack>

        <Stepper activeStep={step} sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {step === 0 && (
          <ConnectDataStep
            tab={dataTab} onTab={setDataTab}
            uploadedFile={uploadedFile} onUpload={setUploadedFile}
            sqlForm={sqlForm} onSqlForm={(k, v) => setSqlForm((f) => ({ ...f, [k]: v }))}
            spUrl={spUrl} onSpUrl={setSpUrl}
            spFile={spFile} onSpFile={setSpFile}
          />
        )}

        {step === 1 && <DataModelStep dataSource={dataSourceLabel} />}

        {step === 2 && (
          <TemplateStep selected={selectedTheme} onSelect={setSelectedTheme} />
        )}

        <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: "divider" }}>
          {step > 0 && (
            <Button variant="outlined" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          {step < 2 && (
            <Button
              variant="contained"
              disabled={step === 0 ? !canProceedStep0 : false}
              onClick={handleNext}
            >
              Next
            </Button>
          )}
          {step === 2 && (
            <Button
              variant="contained"
              disabled={!canProceedStep2}
              onClick={handleApply}
            >
              Apply Design
            </Button>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
