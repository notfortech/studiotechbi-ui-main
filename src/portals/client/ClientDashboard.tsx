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
  Assessment,
  Description,
  AccountBalance,
  TrendingUp,
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

export const ClientDashboard = () => {
  const stats = [
    {
      title: 'Total Balance',
      value: '$125,430',
      change: '+12.5%',
      icon: <AccountBalance />,
      color: '#4caf50',
    },
    {
      title: 'Active Reports',
      value: '12',
      change: '+3',
      icon: <Assessment />,
      color: '#2196f3',
    },
    {
      title: 'Propositions',
      value: '5',
      change: '+2',
      icon: <Description />,
      color: '#ff9800',
    },
    {
      title: 'Growth Rate',
      value: '15.8%',
      change: '+2.3%',
      icon: <TrendingUp />,
      color: '#9c27b0',
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Client Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your financial overview and account information
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '400px' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Financial Performance
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
              <Typography>Performance Chart Placeholder</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '400px' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Quick Actions
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
              <Typography>Quick Actions Menu Placeholder</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
