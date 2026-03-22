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
} from "@mui/material";
import {
  BarChart as BarChartIcon,
  School as SchoolIcon,
  Public as PublicIcon,
  TrendingUp,
  Assessment,
  Groups,
  Login as LoginIcon,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { ROUTES } from "../core/constants";

const REGIONS = [
  {
    name: "India",
    description:
      "Powering data-driven decisions for enterprises and MSMBs with local compliance, GST-ready reporting, and regional analytics.",
    stat: "15+ industries",
    icon: <PublicIcon sx={{ fontSize: 40 }} />,
  },
  {
    name: "Australia",
    description:
      "Analytics and reporting solutions tailored for AU businesses—from mining and agriculture to finance and retail.",
    stat: "APAC-ready",
    icon: <PublicIcon sx={{ fontSize: 40 }} />,
  },
  {
    name: "New Zealand",
    description:
      "Scalable BI and reporting for NZ organisations, with focus on agriculture, tourism, and professional services.",
    stat: "NZ timezone support",
    icon: <PublicIcon sx={{ fontSize: 40 }} />,
  },
] as const;

const TRAINING_PACKAGES = [
  {
    title: "MSMBs",
    description:
      "Structured analytics training for small and medium businesses: dashboards, KPIs, and self-service reporting.",
    icon: <Assessment sx={{ fontSize: 36 }} />,
  },
  {
    title: "Corporate",
    description:
      "Enterprise programmes: advanced analytics, Power BI, data governance, and centre-of-excellence enablement.",
    icon: <Groups sx={{ fontSize: 36 }} />,
  },
] as const;

const VALUE_STATS = [
  { label: "Faster decisions", value: "Data at a glance" },
  { label: "One source of truth", value: "Unified reporting" },
  { label: "Scalable insights", value: "From startup to enterprise" },
];

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

      {/* Regions */}
      <Box
        sx={{
          bgcolor: alpha(primaryMain, 0.04),
          py: { xs: 5, md: 8 },
          borderTop: `1px solid ${alpha(primaryMain, 0.1)}`,
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h5"
            fontWeight={700}
            textAlign="center"
            gutterBottom
            sx={{ color: "text.primary" }}
          >
            Where we operate
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            textAlign="center"
            sx={{ mb: 4, maxWidth: 560, mx: "auto" }}
          >
            Trusted analytics and reporting support for businesses across three
            key markets.
          </Typography>
          <Grid container spacing={3}>
            {REGIONS.map((region) => (
              <Grid key={region.name} size={{ xs: 12, md: 4 }}>
                <Card
                  elevation={0}
                  sx={{
                    height: "100%",
                    bgcolor: "background.paper",
                    border: `1px solid ${alpha(primaryMain, 0.15)}`,
                    borderRadius: 2,
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      sx={{
                        color: primaryMain,
                        mb: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      {region.icon}
                      <Typography variant="h6" fontWeight={600}>
                        {region.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {region.description}
                    </Typography>
                    <Chip
                      label={region.stat}
                      size="small"
                      sx={{ bgcolor: alpha(primaryMain, 0.12), fontWeight: 500 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Analytics Training Wing */}
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Chip
            label="Analytics Training Wing"
            size="medium"
            sx={{
              bgcolor: alpha(primaryMain, 0.15),
              color: primaryDark,
              fontWeight: 600,
              mb: 2,
            }}
          />
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Analytics training for every scale
          </Typography>
          <Typography variant="body1" color="text.secondary" maxWidth={560} sx={{ mx: "auto" }}>
            We offer structured analytics training packages for MSMBs and
            corporate clients—from fundamentals to centre-of-excellence
            programmes.
          </Typography>
        </Box>
        <Grid container spacing={3} justifyContent="center">
          {TRAINING_PACKAGES.map((pkg) => (
            <Grid key={pkg.title} size={{ xs: 12, sm: 6 }}>
              <Card
                variant="outlined"
                sx={{
                  height: "100%",
                  borderColor: alpha(primaryMain, 0.25),
                  borderRadius: 2,
                  "&:hover": {
                    borderColor: primaryMain,
                    bgcolor: alpha(primaryMain, 0.04),
                  },
                }}
              >
                <CardContent sx={{ p: 3, display: "flex", gap: 2, alignItems: "flex-start" }}>
                  <Box sx={{ color: primaryMain, flexShrink: 0 }}>
                    {pkg.icon}
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      {pkg.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {pkg.description}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

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
