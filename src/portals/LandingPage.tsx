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
import {
  TrendingUp,
  Login as LoginIcon,
  AutoAwesome as AutoAwesomeIcon,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { ROUTES } from "../core/constants";
import { Logo } from "../components/common/Logo";

const VALUE_STATS = [
  { label: "Faster decisions", value: "Data at a glance" },
  { label: "One source of truth", value: "Unified reporting" },
  { label: "Scalable insights", value: "From startup to enterprise" },
];

const INSIGHTS_PREVIEW_ROWS = [
  {
    date: "2026-04-01",
    invoiceNo: "INV-2041",
    type: "Sale",
    counterparty: "XYZ Traders",
    category: "Sales",
    amount: "3,240",
  },
  {
    date: "2026-04-02",
    invoiceNo: "INV-2042",
    type: "Purchase",
    counterparty: "Office Supplies Co",
    category: "Expenses",
    amount: "410",
  },
  {
    date: "2026-04-03",
    invoiceNo: "INV-2043",
    type: "Sale",
    counterparty: "RentCorp",
    category: "Sales",
    amount: "1,180",
  },
  {
    date: "2026-04-04",
    invoiceNo: "INV-2044",
    type: "Purchase",
    counterparty: "Fuel Station",
    category: "Expenses",
    amount: "95",
  },
  {
    date: "2026-04-05",
    invoiceNo: "INV-2045",
    type: "Sale",
    counterparty: "ACME Corp",
    category: "Sales",
    amount: "860",
  },
] as const;

const REPORT_AI_PREVIEW_BULLETS = [
  "Summarises the report page you are viewing in plain business language",
  "Uses chart titles and period filters as context for the analysis",
  "Optional deeper insights when Power BI Copilot output is available (roadmap)",
] as const;

export function LandingPage() {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("md"));
  const primaryMain = theme.palette.primary.main;
  const primaryDark = theme.palette.primary.dark;

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
        <Toolbar disableGutters sx={{ px: { xs: 2, md: 3 }, py: 1.5 }}>
          <Box sx={{ flex: 1 }}>
            <Logo size={38} textColor="#FFFFFF" />
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
                "&:hover": {
                  borderColor: "white",
                  bgcolor: alpha("#fff", 0.1),
                },
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
          py: { xs: 5, md: 6 },
          borderBottom: `1px solid ${alpha(primaryMain, 0.12)}`,
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              textAlign: "center",
              maxWidth: 720,
              mx: "auto",
              opacity: 0,
              animation: "heroFadeUp 640ms ease 80ms forwards",
              "@keyframes heroFadeUp": {
                from: { opacity: 0, transform: "translateY(18px)" },
                to: { opacity: 1, transform: "translateY(0)" },
              },
            }}
          >
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
              variant={isSmall ? "h5" : "h4"}
              fontWeight={700}
              gutterBottom
              sx={{ color: "text.primary", letterSpacing: "-0.02em" }}
            >
              Analytics and Reporting Platform Partner
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 2 }}
            >
              Empowering businesses in India, Australia and New Zealand with
              unified data, clear dashboards, and actionable insights.
            </Typography>
            <Button
              component={RouterLink}
              to={ROUTES.LOGIN}
              variant="contained"
              size="medium"
              sx={{ px: 3, py: 1, borderRadius: 2 }}
            >
              Access portal
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Value stats + AI insights */}
      <Box sx={{ py: { xs: 3, md: 4 } }}>
        <Container maxWidth="lg">
          <Grid
            container
            spacing={3}
            justifyContent="center"
            sx={{ mb: 2 }}
          >
            {VALUE_STATS.map(({ label, value }, i) => (
              <Grid key={label} size={{ xs: 12, sm: 4 }}>
                <Card
                  variant="outlined"
                  sx={{
                    height: "100%",
                    borderColor: alpha(primaryMain, 0.2),
                    bgcolor: alpha(primaryMain, 0.03),
                    opacity: 0,
                    animation: `heroFadeUp 560ms ease ${240 + i * 100}ms forwards`,
                    transition: "transform 200ms ease",
                    "&:hover": { transform: "translateY(-3px)" },
                    "@keyframes heroFadeUp": {
                      from: { opacity: 0, transform: "translateY(14px)" },
                      to: { opacity: 1, transform: "translateY(0)" },
                    },
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 2.5 }}>
                    <TrendingUp
                      sx={{ fontSize: 28, color: primaryMain, mb: 1 }}
                    />
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

          <Stack spacing={1} sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>
              AI insights on your reports
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 760 }}
            >
              While viewing an embedded Power BI report, generate a
              functional summary of what the data is showing — based on the
              active page, filters, and visuals.
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
                <CardContent sx={{ p: 2.5 }}>
                  <Stack
                    direction="row"
                    alignItems="baseline"
                    justifyContent="space-between"
                    sx={{ mb: 1.5 }}
                  >
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
                      maxHeight: 260,
                      borderColor: alpha(primaryMain, 0.12),
                      "& .MuiTableCell-root": { whiteSpace: "nowrap" },
                    }}
                  >
                    <Table
                      size="small"
                      stickyHeader
                      aria-label="Insights preview table"
                    >
                      <TableHead>
                        <TableRow>
                          <TableCell
                            sx={{
                              fontWeight: 700,
                              bgcolor: alpha(primaryMain, 0.06),
                            }}
                          >
                            Date
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: 700,
                              bgcolor: alpha(primaryMain, 0.06),
                            }}
                          >
                            Invoice
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: 700,
                              bgcolor: alpha(primaryMain, 0.06),
                            }}
                          >
                            Type
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: 700,
                              bgcolor: alpha(primaryMain, 0.06),
                            }}
                          >
                            Customer/Vendor
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: 700,
                              bgcolor: alpha(primaryMain, 0.06),
                            }}
                          >
                            Category
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: 700,
                              bgcolor: alpha(primaryMain, 0.06),
                            }}
                            align="right"
                          >
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
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mt: 1 }}
                  >
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
                <CardContent sx={{ p: 2.5 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ mb: 1.5 }}
                  >
                    <AutoAwesomeIcon sx={{ color: primaryMain }} />
                    <Typography variant="subtitle1" fontWeight={700}>
                      Generate AI Insights (in Reports)
                    </Typography>
                  </Stack>
                  <Stack
                    spacing={1.2}
                    component="ul"
                    sx={{ m: 0, pl: 2.5 }}
                  >
                    {REPORT_AI_PREVIEW_BULLETS.map((line) => (
                      <Typography
                        key={line}
                        component="li"
                        variant="body2"
                        color="text.secondary"
                      >
                        {line}
                      </Typography>
                    ))}
                  </Stack>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mt: 1.5 }}
                  >
                    Open any embedded report, then use Generate AI Insights
                    for a summary of what you are looking at.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Footer */}
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
              <Box sx={{ mb: 1, display: "inline-flex" }}>
                <Logo size={32} textColor="#FFFFFF" />
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Analytics and Reporting Platform Partner · India · Australia ·
                New Zealand
              </Typography>
            </Box>
            <Stack
              direction="row"
              spacing={2}
              flexWrap="wrap"
              justifyContent="center"
            >
              <Button
                component={RouterLink}
                to={ROUTES.SIGNUP}
                variant="outlined"
                size="large"
                sx={{
                  borderColor: "white",
                  color: "white",
                  "&:hover": {
                    borderColor: "white",
                    bgcolor: alpha("#fff", 0.1),
                  },
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
            sx={{ display: "block", mt: 2, opacity: 0.6, textAlign: "center" }}
          >
            Plans from $799 AUD/month + initial setup fee. GST and service fees apply.
          </Typography>
          <Typography
            variant="caption"
            sx={{ display: "block", mt: 1, opacity: 0.7, textAlign: "center" }}
          >
            © {new Date().getFullYear()} StudioTechBI. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
