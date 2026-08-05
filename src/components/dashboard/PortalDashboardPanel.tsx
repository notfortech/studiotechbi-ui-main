import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import {
  Assessment,
  Description,
  AccountBalance,
  TrendingUp,
  AutoGraph,
  Toll,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PortalDashboardResponse } from '../../services/userDashboardService';
import { ACCENT_BLUE, ACCENT_VIOLET, BRASS, NAVY } from '../../theme';
import { ROUTES } from '../../core/constants';

// Entrance choreography for the dashboard shell — cards rise into place in
// sequence rather than popping in all at once, and KPI figures count up
// from zero instead of appearing as a static final number.
const fadeUpKeyframes = {
  '@keyframes dashFadeUp': {
    from: { opacity: 0, transform: 'translateY(14px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
};

function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);
  return value;
}

function formatMonthTick(month: string): string {
  const [y, m] = month.split('-');
  if (!y || !m) return month;
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString(undefined, { month: 'short', year: 'numeric' });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(value);
}

function copyForDashboard(
  role: string,
  hasSelectedClient: boolean
): {
  pageTitle: string;
  pageSubtitle: string;
  balanceLabel: string;
  growthLabel: string;
  chartTitle: string;
  /** Same underlying `activeReports` KPI field, different meaning per role -- Power BI report
   * count for accountant, SavedReports count for client (see ClientPortalDashboardService). */
  activeReportsLabel: string;
} {
  const isClient = role === 'client';
  if (isClient) {
    return {
      pageTitle: 'Client Dashboard',
      pageSubtitle: 'Your financial overview and account information',
      balanceLabel: 'Net position',
      growthLabel: 'Growth rate',
      chartTitle: 'Reports Generated',
      activeReportsLabel: 'Saved Reports',
    };
  }
  return {
    pageTitle: 'Accountant Dashboard',
    pageSubtitle: 'Financial overview and client management',
    balanceLabel: hasSelectedClient ? 'Client net position' : 'Firm net position',
    growthLabel: 'Growth rate',
    chartTitle: hasSelectedClient ? 'Client performance' : 'Firm performance',
    activeReportsLabel: 'Active reports',
  };
}

interface StatCardProps {
  title: string;
  rawValue: number;
  formatter: (n: number) => string;
  icon: React.ReactNode;
  color: string;
  delay: number;
}

const StatCard = ({ title, rawValue, formatter, icon, color, delay }: StatCardProps) => {
  const animated = useCountUp(rawValue);
  return (
    <Card
      sx={{
        height: '100%',
        opacity: 0,
        animation: `dashFadeUp 520ms ease ${delay}ms forwards`,
        transition: 'transform 200ms ease, box-shadow 200ms ease',
        '&:hover': { transform: 'translateY(-3px)' },
        ...fadeUpKeyframes,
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={600}>
              {formatter(animated)}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: color, width: 56, height: 56 }}>{icon}</Avatar>
        </Box>
      </CardContent>
    </Card>
  );
};

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

interface PortalDashboardPanelProps {
  months: number;
  onMonthsChange: (months: number) => void;
  data: PortalDashboardResponse | null;
  loading: boolean;
  error: string | null;
  forbidden: boolean;
  /** Accountant: optional client filter rendered under the title row */
  clientFilter?: React.ReactNode;
  hasSelectedClient?: boolean;
}

export function PortalDashboardPanel({
  months,
  onMonthsChange,
  data,
  loading,
  error,
  forbidden,
  clientFilter,
  hasSelectedClient = false,
}: PortalDashboardPanelProps) {
  const role = data?.role ?? 'client';
  const copy = copyForDashboard(role, hasSelectedClient);
  const kpis = data?.kpis;
  const chartData = data?.chartData ?? [];
  const reportGenerationChartData = data?.reportGenerationChartData ?? [];
  const showVariance = chartData.some((p) => p.variance != null);
  const isClient = role === 'client';
  const navigate = useNavigate();

  const handleQuickAction = (actionKey: string) => {
    if (actionKey === 'view-saved-reports') navigate(ROUTES.CLIENT.SAVED_REPORTS);
    else if (actionKey === 'buy-ai-credits') navigate(ROUTES.CLIENT.PURCHASE_CREDITS);
  };

  const stats =
    kpis != null
      ? [
          {
            title: copy.balanceLabel,
            rawValue: kpis.totalBalance,
            formatter: formatCurrency,
            icon: <AccountBalance />,
            color: ACCENT_BLUE,
          },
          {
            title: copy.activeReportsLabel,
            rawValue: kpis.activeReports,
            formatter: (n: number) => String(Math.round(n)),
            icon: <Assessment />,
            color: BRASS[500],
          },
          {
            title: 'Propositions',
            rawValue: kpis.propositions,
            formatter: (n: number) => String(Math.round(n)),
            icon: <Description />,
            color: ACCENT_VIOLET,
          },
          {
            title: copy.growthLabel,
            rawValue: Number(kpis.growthRate),
            formatter: (n: number) => `${n.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`,
            icon: <TrendingUp />,
            color: NAVY[500],
          },
          // Client view only -- reportsGenerated/aiCreditsRemaining are null for accountant view
          // (not a single-client concept), so these two tiles simply don't render there.
          ...(kpis.reportsGenerated != null
            ? [
                {
                  title: 'Reports Generated',
                  rawValue: kpis.reportsGenerated,
                  formatter: (n: number) => String(Math.round(n)),
                  icon: <AutoGraph />,
                  color: NAVY[700],
                },
              ]
            : []),
          ...(kpis.aiCreditsRemaining != null
            ? [
                {
                  title: 'AI credits remaining',
                  rawValue: kpis.aiCreditsRemaining,
                  formatter: (n: number) => String(Math.round(n)),
                  icon: <Toll />,
                  color: BRASS[700],
                },
              ]
            : []),
        ]
      : [];

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            {copy.pageTitle}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {copy.pageSubtitle}
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Months</InputLabel>
          <Select
            label="Months"
            value={months}
            onChange={(e: SelectChangeEvent<number>) =>
              onMonthsChange(Number(e.target.value))
            }
          >
            {MONTH_OPTIONS.map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {clientFilter}

      {forbidden && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You do not have access to this client, or your role does not allow this view. Choose
          another client or use the firm overview.
        </Alert>
      )}

      {error && !forbidden && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {!loading && data && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(4, minmax(0, 1fr))',
              },
            }}
          >
            {stats.map((stat, index) => (
              <Box key={index} sx={{ minWidth: 0 }}>
                <StatCard {...stat} delay={index * 90} />
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) minmax(0, 1fr)' },
            }}
          >
            <Paper
              sx={{
                p: 3,
                minHeight: 380,
                opacity: 0,
                animation: 'dashFadeUp 560ms ease 380ms forwards',
                ...fadeUpKeyframes,
              }}
            >
              <Typography variant="h6" fontWeight={600} gutterBottom>
                {copy.chartTitle}
              </Typography>
              {isClient ? (
                reportGenerationChartData.every((p) => p.count === 0) ? (
                  <Box
                    sx={{
                      height: 300,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'text.secondary',
                    }}
                  >
                    <Typography>No reports generated in this period yet</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={reportGenerationChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tickFormatter={formatMonthTick} />
                      <YAxis allowDecimals={false} />
                      <Tooltip
                        formatter={(value) => (typeof value === 'number' ? value.toLocaleString() : String(value ?? ''))}
                        labelFormatter={(label) => (typeof label === 'string' ? formatMonthTick(label) : '')}
                      />
                      <Bar dataKey="count" name="Reports generated" fill={BRASS[500]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )
              ) : chartData.length === 0 ? (
                <Box
                  sx={{
                    height: 300,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.secondary',
                  }}
                >
                  <Typography>No chart data for this period</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickFormatter={formatMonthTick} />
                    <YAxis />
                    <Tooltip
                      formatter={(value) =>
                        typeof value === 'number' ? value.toLocaleString() : String(value ?? '')
                      }
                      labelFormatter={(label) =>
                        typeof label === 'string' ? formatMonthTick(label) : ''
                      }
                    />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#4caf50" dot={false} />
                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#f44336" dot={false} />
                    <Line type="monotone" dataKey="profit" name="Profit" stroke="#2196f3" dot={false} />
                    {showVariance && (
                      <Line
                        type="monotone"
                        dataKey="variance"
                        name="Variance"
                        stroke="#9c27b0"
                        dot={false}
                        connectNulls
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Paper>

            <Paper
              sx={{
                p: 3,
                minHeight: 380,
                opacity: 0,
                animation: 'dashFadeUp 560ms ease 460ms forwards',
                ...fadeUpKeyframes,
              }}
            >
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Quick actions
              </Typography>
              {data.quickActions.length === 0 ? (
                <Typography color="text.secondary">No quick actions</Typography>
              ) : (
                <List dense disablePadding>
                  {data.quickActions.map((action, i) =>
                    action.actionKey ? (
                      <ListItem key={i} disableGutters disablePadding>
                        <ListItemButton onClick={() => handleQuickAction(action.actionKey!)}>
                          <ListItemText primary={action.label} />
                        </ListItemButton>
                      </ListItem>
                    ) : (
                      <ListItem key={i} disableGutters>
                        <ListItemText primary={action.label} />
                      </ListItem>
                    )
                  )}
                </List>
              )}
            </Paper>
          </Box>
        </Box>
      )}
    </Box>
  );
}
