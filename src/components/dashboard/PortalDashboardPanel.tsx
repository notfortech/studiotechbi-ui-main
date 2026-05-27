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
  ListItemText,
} from '@mui/material';
import {
  Assessment,
  Description,
  AccountBalance,
  TrendingUp,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { PortalDashboardResponse } from '../../services/userDashboardService';

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
} {
  const isClient = role === 'client';
  if (isClient) {
    return {
      pageTitle: 'Client Dashboard',
      pageSubtitle: 'Your financial overview and account information',
      balanceLabel: 'Net position',
      growthLabel: 'Growth rate',
      chartTitle: 'Financial performance',
    };
  }
  return {
    pageTitle: 'Accountant Dashboard',
    pageSubtitle: 'Financial overview and client management',
    balanceLabel: hasSelectedClient ? 'Client net position' : 'Firm net position',
    growthLabel: 'Growth rate',
    chartTitle: hasSelectedClient ? 'Client performance' : 'Firm performance',
  };
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

const StatCard = ({ title, value, icon, color }: StatCardProps) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={600}>
            {value}
          </Typography>
        </Box>
        <Avatar sx={{ bgcolor: color, width: 56, height: 56 }}>{icon}</Avatar>
      </Box>
    </CardContent>
  </Card>
);

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
  const showVariance = chartData.some((p) => p.variance != null);

  const stats =
    kpis != null
      ? [
          {
            title: copy.balanceLabel,
            value: formatCurrency(kpis.totalBalance),
            icon: <AccountBalance />,
            color: '#4caf50',
          },
          {
            title: 'Active reports',
            value: String(kpis.activeReports),
            icon: <Assessment />,
            color: '#2196f3',
          },
          {
            title: 'Propositions',
            value: String(kpis.propositions),
            icon: <Description />,
            color: '#ff9800',
          },
          {
            title: copy.growthLabel,
            value: `${Number(kpis.growthRate).toLocaleString(undefined, {
              maximumFractionDigits: 1,
            })}%`,
            icon: <TrendingUp />,
            color: '#9c27b0',
          },
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
                <StatCard {...stat} />
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
            <Paper sx={{ p: 3, minHeight: 380 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                {copy.chartTitle}
              </Typography>
              {chartData.length === 0 ? (
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

            <Paper sx={{ p: 3, minHeight: 380 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Quick actions
              </Typography>
              {data.quickActions.length === 0 ? (
                <Typography color="text.secondary">No quick actions</Typography>
              ) : (
                <List dense disablePadding>
                  {data.quickActions.map((label, i) => (
                    <ListItem key={i} disableGutters>
                      <ListItemText primary={label} />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Box>
        </Box>
      )}
    </Box>
  );
}
