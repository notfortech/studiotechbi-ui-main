import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Avatar,
} from '@mui/material';
import {
  TrendingUp,
  People,
  Assessment,
  AttachMoney,
} from '@mui/icons-material';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  color: string;
}

const StatCard = ({ title, value, change, icon, color }: StatCardProps) => {
  return (
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
          <Avatar
            sx={{
              bgcolor: color,
              width: 56,
              height: 56,
            }}
          >
            {icon}
          </Avatar>
        </Box>
        <Typography
          variant="body2"
          sx={{
            color: change.startsWith('+') ? 'success.main' : 'error.main',
            fontWeight: 500,
          }}
        >
          {change} from last month
        </Typography>
      </CardContent>
    </Card>
  );
};

export const DashboardPage = () => {
  const stats = [
    {
      title: 'Total Revenue',
      value: '$45,231',
      change: '+20.1%',
      icon: <AttachMoney />,
      color: '#4caf50',
    },
    {
      title: 'Active Users',
      value: '2,542',
      change: '+12.5%',
      icon: <People />,
      color: '#2196f3',
    },
    {
      title: 'Total Reports',
      value: '1,234',
      change: '+8.2%',
      icon: <Assessment />,
      color: '#ff9800',
    },
    {
      title: 'Growth Rate',
      value: '24.5%',
      change: '+4.3%',
      icon: <TrendingUp />,
      color: '#9c27b0',
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back! Here's what's happening with your business today.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}

        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, height: '400px' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Revenue Overview
            </Typography>
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
              }}
            >
              <Typography>Chart Component Placeholder</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, height: '400px' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Recent Activity
            </Typography>
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
              }}
            >
              <Typography>Activity Feed Placeholder</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid size={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Latest Transactions
            </Typography>
            <Box
              sx={{
                height: '300px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
              }}
            >
              <Typography>Transaction Table Placeholder</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
