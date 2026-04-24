import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
  Stack,
  Chip,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import * as React from "react";
import {
  BarChart as BarChartIcon,
  TrendingUp,
  Login as LoginIcon,
  ChevronLeft,
  ChevronRight,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { ROUTES } from "../core/constants";

const SUBSCRIPTIONS = [
  {
    key: "pro",
    title: "Pro",
    priceAud: 699,
    description: "Manual + semi-automated reporting",
    badge: "Popular",
  },
  {
    key: "pro-ai",
    title: "Pro (AI Assisted)",
    priceAud: 999,
    description: "Generic AI-assisted automatic reporting (single client)",
    badge: "Best value",
  },
  {
    key: "lite",
    title: "Lite",
    priceAud: 1299,
    description: "Multi-client reporting (no AI assistance)",
  },
  {
    key: "premium",
    title: "Premium",
    priceAud: 1999,
    description: "Multi-client reporting with AI-assisted model suggestions",
  },
] as const;

const VALUE_STATS = [
  { label: "Faster decisions", value: "Data at a glance" },
  { label: "One source of truth", value: "Unified reporting" },
  { label: "Scalable insights", value: "From startup to enterprise" },
];

const INSIGHTS_PREVIEW_ROWS = [
  { date: "2026-04-01", invoiceNo: "INV-2041", type: "Sale", counterparty: "XYZ Traders", category: "Sales", amount: "3,240" },
  { date: "2026-04-02", invoiceNo: "INV-2042", type: "Purchase", counterparty: "Office Supplies Co", category: "Expenses", amount: "410" },
  { date: "2026-04-03", invoiceNo: "INV-2043", type: "Sale", counterparty: "RentCorp", category: "Sales", amount: "1,180" },
  { date: "2026-04-04", invoiceNo: "INV-2044", type: "Purchase", counterparty: "Fuel Station", category: "Expenses", amount: "95" },
  { date: "2026-04-05", invoiceNo: "INV-2045", type: "Sale", counterparty: "ACME Corp", category: "Sales", amount: "860" },
] as const;

const INSIGHTS_MODEL_PREVIEW = [
  {
    title: "Sales performance",
    subtitle: "Revenue trends, top customers, category mix",
    tables: [
      {
        name: "ORDER_LINES",
        fields: ["order_line_id", "order_id", "product_id", "customer_id", "price", "quantity", "date"],
      },
      { name: "DATE", fields: ["date"] },
      { name: "CUSTOMERS", fields: ["customer_id", "name", "state"] },
      { name: "PRODUCTS", fields: ["product_id", "name", "category"] },
    ],
    links: [
      { from: "DATE", to: "ORDER_LINES" },
      { from: "CUSTOMERS", to: "ORDER_LINES" },
      { from: "PRODUCTS", to: "ORDER_LINES" },
    ],
  },
  {
    title: "Expense control",
    subtitle: "Spend by vendor, category, anomalies",
    tables: [
      {
        name: "TRANSACTIONS",
        fields: ["txn_id", "vendor", "category", "amount", "date"],
      },
      { name: "DATE", fields: ["date"] },
      { name: "VENDORS", fields: ["vendor_id", "name"] },
    ],
    links: [
      { from: "DATE", to: "TRANSACTIONS" },
      { from: "VENDORS", to: "TRANSACTIONS" },
    ],
  },
  {
    title: "Cashflow snapshot",
    subtitle: "Inflow vs outflow and timing gaps",
    tables: [
      { name: "CASH_EVENTS", fields: ["event_id", "type", "amount", "date"] },
      { name: "DATE", fields: ["date"] },
      { name: "ACCOUNTS", fields: ["account_id", "name", "currency"] },
    ],
    links: [
      { from: "DATE", to: "CASH_EVENTS" },
      { from: "ACCOUNTS", to: "CASH_EVENTS" },
    ],
  },
  {
    title: "Invoice health",
    subtitle: "Volumes, average value, seasonality",
    tables: [
      { name: "INVOICES", fields: ["invoice_id", "invoice_no", "customer_id", "amount", "date"] },
      { name: "DATE", fields: ["date"] },
      { name: "CUSTOMERS", fields: ["customer_id", "name"] },
    ],
    links: [
      { from: "DATE", to: "INVOICES" },
      { from: "CUSTOMERS", to: "INVOICES" },
    ],
  },
] as const;

function SchemaModelCard(props: {
  title: string;
  subtitle: string;
  tables: { name: string; fields: string[] }[];
  links: { from: string; to: string }[];
  primaryMain: string;
}) {
  const { title, subtitle, tables, links, primaryMain } = props;
  const headerBg = alpha(primaryMain, 0.9);
  const border = alpha(primaryMain, 0.18);
  const shadow = `0 10px 30px ${alpha("#0b1020", 0.12)}`;

  // Layout positions (simple, deterministic): one "fact" in middle-right, up to 3 dims around.
  const fact = tables[0];
  const dims = tables.slice(1, 4);
  const factX = 150;
  const factY = 44;
  const factW = 170;
  const factH = 132;

  const dimPositions = [
    { x: 20, y: 90, w: 95, h: 40 }, // left
    { x: 332, y: 22, w: 110, h: 70 }, // top-right
    { x: 332, y: 112, w: 110, h: 70 }, // bottom-right
  ];

  function tableBox(t: { name: string; fields: string[] }, x: number, y: number, w: number, h: number) {
    const fields = t.fields.slice(0, Math.max(2, Math.min(6, Math.floor((h - 34) / 14))));
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} rx={10} fill="white" stroke={border} />
        <rect x={x} y={y} width={w} height={26} rx={10} fill={headerBg} />
        <text x={x + 12} y={y + 17} fontSize="10" fontWeight="700" fill="white">
          {t.name}
        </text>
        {fields.map((f, i) => (
          <text key={f} x={x + 12} y={y + 44 + i * 14} fontSize="10" fill="#111827">
            {f}
          </text>
        ))}
      </g>
    );
  }

  // Draw connectors as simple lines; connect each dim to fact.
  const connectors = dims
    .map((d, idx) => {
      const p = dimPositions[idx];
      if (!p) return null;
      const fromCenter = { x: p.x + p.w, y: p.y + p.h / 2 };
      const toCenter = { x: factX, y: factY + factH / 2 };
      return (
        <path
          key={`${d.name}-${idx}`}
          d={`M ${fromCenter.x} ${fromCenter.y} C ${fromCenter.x + 22} ${fromCenter.y}, ${toCenter.x - 22} ${toCenter.y}, ${toCenter.x} ${toCenter.y}`}
          fill="none"
          stroke={alpha(primaryMain, 0.55)}
          strokeWidth="2"
        />
      );
    })
    .filter(Boolean);

  return (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${alpha(primaryMain, 0.14)}`,
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: alpha(primaryMain, 0.03),
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="subtitle2" fontWeight={800} gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {subtitle}
        </Typography>
        <Box
          sx={{
            border: `1px solid ${alpha(primaryMain, 0.12)}`,
            borderRadius: 2,
            bgcolor: "white",
            boxShadow: shadow,
            p: 1,
          }}
        >
          <Box
            component="svg"
            viewBox="0 0 460 210"
            sx={{ width: "100%", height: 190, display: "block" }}
            aria-label="Model preview diagram"
          >
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={alpha(primaryMain, 0.55)} />
              </marker>
            </defs>
            {/* connectors */}
            {connectors}
            {/* tables */}
            {dims.map((d, idx) => {
              const p = dimPositions[idx];
              if (!p) return null;
              return tableBox(d, p.x, p.y, p.w, p.h);
            })}
            {fact ? tableBox(fact, factX, factY, factW, factH) : null}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export function LandingPage() {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("md"));
  const primaryMain = theme.palette.primary.main;
  const primaryDark = theme.palette.primary.dark;
  const [copilotIdx, setCopilotIdx] = React.useState(0);
  const touchStartXRef = React.useRef<number | null>(null);
  const touchDeltaXRef = React.useRef(0);

  const clampIdx = (n: number) =>
    Math.max(0, Math.min(INSIGHTS_MODEL_PREVIEW.length - 1, n));

  const goPrev = () => setCopilotIdx((i) => clampIdx(i - 1));
  const goNext = () => setCopilotIdx((i) => clampIdx(i + 1));

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: alpha(theme.palette.primary.dark, 0.98),
          borderBottom: `1px solid ${alpha("#fff", 0.08)}`,
        }}
      >
        <Toolbar disableGutters sx={{ px: { xs: 2, md: 3 }, py: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1 }}>
            <BarChartIcon sx={{ fontSize: 28, color: "primary.light" }} />
            <Typography
              variant="h6"
              component="span"
              fontWeight={700}
              letterSpacing="-0.02em"
              sx={{ color: "white" }}
            >
              Studi0Tech BI
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              component={RouterLink}
              to={ROUTES.SIGNUP}
              variant="outlined"
              size="medium"
              sx={{
                borderColor: "white",
                color: "white",
                "&:hover": { borderColor: "white", bgcolor: alpha("#fff", 0.1) },
              }}
            >
              Sign up
            </Button>
            <Button
              component={RouterLink}
              to={ROUTES.LOGIN}
              variant="contained"
              size="medium"
              startIcon={<LoginIcon />}
              sx={{
                bgcolor: "white",
                color: primaryDark,
                "&:hover": { bgcolor: alpha("#fff", 0.9) },
              }}
            >
              Log in
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Hero */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${alpha(primaryMain, 0.12)} 0%, ${alpha(primaryDark, 0.06)} 50%, ${alpha(primaryMain, 0.08)} 100%)`,
          py: { xs: 6, md: 10 },
          borderBottom: `1px solid ${alpha(primaryMain, 0.12)}`,
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", maxWidth: 720, mx: "auto" }}>
            <Chip
              label="Analytics & Reporting Partner"
              size="small"
              sx={{
                mb: 2,
                bgcolor: alpha(primaryMain, 0.2),
                color: primaryDark,
                fontWeight: 600,
              }}
            />
            <Typography
              variant={isSmall ? "h4" : "h3"}
              fontWeight={700}
              gutterBottom
              sx={{ color: "text.primary", letterSpacing: "-0.02em" }}
            >
              Analytics and Reporting Platform Partner
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ fontWeight: 400, mb: 3 }}
            >
              Empowering businesses in India, Australia and New Zealand with
              unified data, clear dashboards, and actionable insights.
            </Typography>
            <Button
              component={RouterLink}
              to={ROUTES.LOGIN}
              variant="contained"
              size="large"
              sx={{ px: 3, py: 1.5, borderRadius: 2 }}
            >
              Access portal
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Value stats */}
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Grid container spacing={3} justifyContent="center">
          {VALUE_STATS.map(({ label, value }) => (
            <Grid key={label} size={{ xs: 12, sm: 4 }}>
              <Card
                variant="outlined"
                sx={{
                  height: "100%",
                  borderColor: alpha(primaryMain, 0.2),
                  bgcolor: alpha(primaryMain, 0.03),
                }}
              >
                <CardContent sx={{ textAlign: "center", py: 3 }}>
                  <TrendingUp sx={{ fontSize: 32, color: primaryMain, mb: 1 }} />
                  <Typography variant="subtitle1" fontWeight={600}>
                    {value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Public Insights preview */}
      <Box sx={{ py: { xs: 5, md: 7 }, borderTop: `1px solid ${alpha(primaryMain, 0.1)}` }}>
        <Container maxWidth="lg">
          <Stack spacing={1} sx={{ mb: 3 }}>
            <Typography variant="h5" fontWeight={700}>
              See it before you log in
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 760 }}>
              A quick preview of what Insights looks like: a small read-only sample and a swipeable set of
              dashboard options based on the data structure.
            </Typography>
          </Stack>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Card
                variant="outlined"
                sx={{
                  borderColor: alpha(primaryMain, 0.18),
                  bgcolor: "background.paper",
                  overflow: "hidden",
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Data sample (preview)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Read-only · 5 rows shown
                    </Typography>
                  </Stack>
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{
                      maxHeight: 320,
                      borderColor: alpha(primaryMain, 0.12),
                      "& .MuiTableCell-root": { whiteSpace: "nowrap" },
                    }}
                  >
                    <Table size="small" stickyHeader aria-label="Insights preview table">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, bgcolor: alpha(primaryMain, 0.06) }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 700, bgcolor: alpha(primaryMain, 0.06) }}>Invoice</TableCell>
                          <TableCell sx={{ fontWeight: 700, bgcolor: alpha(primaryMain, 0.06) }}>Type</TableCell>
                          <TableCell sx={{ fontWeight: 700, bgcolor: alpha(primaryMain, 0.06) }}>
                            Customer/Vendor
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, bgcolor: alpha(primaryMain, 0.06) }}>Category</TableCell>
                          <TableCell sx={{ fontWeight: 700, bgcolor: alpha(primaryMain, 0.06) }} align="right">
                            Amount
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {INSIGHTS_PREVIEW_ROWS.map((r) => (
                          <TableRow key={r.invoiceNo} hover>
                            <TableCell>{r.date}</TableCell>
                            <TableCell>{r.invoiceNo}</TableCell>
                            <TableCell>{r.type}</TableCell>
                            <TableCell>{r.counterparty}</TableCell>
                            <TableCell>{r.category}</TableCell>
                            <TableCell align="right">{r.amount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    This is demo data for illustration only.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              <Card
                variant="outlined"
                sx={{
                  height: "100%",
                  borderColor: alpha(primaryMain, 0.18),
                  bgcolor: "background.paper",
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Copilot (preview)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Swipe to browse
                    </Typography>
                  </Stack>

                  <Box
                    sx={{
                      position: "relative",
                      overflow: "hidden",
                      borderRadius: 2,
                    }}
                    aria-label="Swipeable dashboard model preview"
                    onTouchStart={(e) => {
                      touchStartXRef.current = e.touches[0]?.clientX ?? null;
                      touchDeltaXRef.current = 0;
                    }}
                    onTouchMove={(e) => {
                      const start = touchStartXRef.current;
                      if (start == null) return;
                      const x = e.touches[0]?.clientX ?? start;
                      touchDeltaXRef.current = x - start;
                    }}
                    onTouchEnd={() => {
                      const dx = touchDeltaXRef.current;
                      touchStartXRef.current = null;
                      touchDeltaXRef.current = 0;
                      if (Math.abs(dx) < 40) return;
                      if (dx > 0) goPrev();
                      else goNext();
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        width: `${INSIGHTS_MODEL_PREVIEW.length * 100}%`,
                        transform: `translateX(-${copilotIdx * (100 / INSIGHTS_MODEL_PREVIEW.length)}%)`,
                        transition: "transform 260ms ease",
                      }}
                    >
                      {INSIGHTS_MODEL_PREVIEW.map((m) => (
                        <Box
                          key={m.title}
                          sx={{
                            width: `${100 / INSIGHTS_MODEL_PREVIEW.length}%`,
                            px: 0.25,
                          }}
                        >
                          <SchemaModelCard
                            title={m.title}
                            subtitle={m.subtitle}
                            tables={m.tables as unknown as { name: string; fields: string[] }[]}
                            links={m.links as unknown as { from: string; to: string }[]}
                            primaryMain={primaryMain}
                          />
                        </Box>
                      ))}
                    </Box>

                    <Button
                      aria-label="Previous model"
                      onClick={goPrev}
                      disabled={copilotIdx === 0}
                      variant="outlined"
                      size="small"
                      sx={{
                        position: "absolute",
                        top: "50%",
                        left: 8,
                        transform: "translateY(-50%)",
                        minWidth: 0,
                        px: 1,
                        borderColor: alpha(primaryMain, 0.22),
                        bgcolor: "white",
                        "&:hover": { bgcolor: alpha("#fff", 0.92) },
                      }}
                    >
                      <ChevronLeft fontSize="small" />
                    </Button>
                    <Button
                      aria-label="Next model"
                      onClick={goNext}
                      disabled={copilotIdx === INSIGHTS_MODEL_PREVIEW.length - 1}
                      variant="outlined"
                      size="small"
                      sx={{
                        position: "absolute",
                        top: "50%",
                        right: 8,
                        transform: "translateY(-50%)",
                        minWidth: 0,
                        px: 1,
                        borderColor: alpha(primaryMain, 0.22),
                        bgcolor: "white",
                        "&:hover": { bgcolor: alpha("#fff", 0.92) },
                      }}
                    >
                      <ChevronRight fontSize="small" />
                    </Button>
                  </Box>

                  <Stack direction="row" spacing={0.8} justifyContent="center" sx={{ mt: 1.5 }}>
                    {INSIGHTS_MODEL_PREVIEW.map((_, i) => (
                      <Box
                        key={i}
                        onClick={() => setCopilotIdx(i)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setCopilotIdx(i);
                          }
                        }}
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          bgcolor: i === copilotIdx ? primaryMain : alpha(primaryMain, 0.22),
                          cursor: "pointer",
                        }}
                        aria-label={`Show model ${i + 1}`}
                      />
                    ))}
                  </Stack>

                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    In the portal, Copilot suggestions are generated from your data and verified against templates.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Subscriptions */}
      <Box
        sx={{
          bgcolor: alpha(primaryMain, 0.04),
          py: { xs: 5, md: 6 },
          borderTop: `1px solid ${alpha(primaryMain, 0.1)}`,
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={1} sx={{ mb: 3 }} textAlign="center">
            <Typography variant="h5" fontWeight={800}>
              Subscriptions
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 820, mx: "auto" }}>
              Choose a plan, then sign up or log in to activate. Pricing shown in AUD.
            </Typography>
          </Stack>

          <Grid container spacing={2.5} alignItems="stretch">
            {SUBSCRIPTIONS.map((s) => (
              <Grid key={s.key} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card
                  variant="outlined"
                  sx={{
                    height: "100%",
                    borderColor: alpha(primaryMain, 0.18),
                    bgcolor: "background.paper",
                    borderRadius: 2,
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="h6" fontWeight={800}>
                        {s.title}
                      </Typography>
                      {s.badge ? (
                        <Chip
                          size="small"
                          label={s.badge}
                          sx={{ bgcolor: alpha(primaryMain, 0.14), fontWeight: 700 }}
                        />
                      ) : null}
                    </Stack>

                    <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: "-0.02em" }}>
                      ${s.priceAud}
                      <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                        AUD
                      </Typography>
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.2, mb: 2 }}>
                      {s.description}
                    </Typography>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Button
                        component={RouterLink}
                        to={ROUTES.SIGNUP}
                        variant="contained"
                        size="small"
                        sx={{ px: 2 }}
                      >
                        Sign up
                      </Button>
                      <Button
                        component={RouterLink}
                        to={ROUTES.LOGIN}
                        variant="outlined"
                        size="small"
                        sx={{ px: 2 }}
                      >
                        Log in
                      </Button>
                      <Button component={RouterLink} to={ROUTES.LOGIN} variant="text" size="small" sx={{ px: 1.5 }}>
                        Activate
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA + Footer */}
      <Box
        sx={{
          bgcolor: alpha(primaryDark, 0.95),
          color: "white",
          py: 5,
          borderTop: `1px solid ${alpha("#fff", 0.1)}`,
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems="center"
            justifyContent="space-between"
            spacing={3}
          >
            <Box sx={{ textAlign: { xs: "center", sm: "left" } }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Studi0Tech BI
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Analytics and Reporting Platform Partner · India · Australia ·
                New Zealand
              </Typography>
            </Box>
            <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="center">
              <Button
                component={RouterLink}
                to={ROUTES.SIGNUP}
                variant="outlined"
                size="large"
                sx={{
                  borderColor: "white",
                  color: "white",
                  "&:hover": { borderColor: "white", bgcolor: alpha("#fff", 0.1) },
                }}
              >
                Sign up
              </Button>
              <Button
                component={RouterLink}
                to={ROUTES.LOGIN}
                variant="contained"
                size="large"
                sx={{
                  bgcolor: "white",
                  color: primaryDark,
                  "&:hover": { bgcolor: alpha("#fff", 0.9) },
                }}
              >
                Log in to portal
              </Button>
            </Stack>
          </Stack>
          <Typography
            variant="caption"
            sx={{ display: "block", mt: 3, opacity: 0.7, textAlign: "center" }}
          >
            © {new Date().getFullYear()} Studi0Tech BI. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
