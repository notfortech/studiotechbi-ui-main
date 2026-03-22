import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Speed, AccountTree, Refresh, People } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { apiService } from '../../services/api';

interface HealthMetric {
  name: string;
  value: number;
  unit: string;
  status: 'ok' | 'warn' | 'error';
  lastUpdated?: string;
}

interface SystemHealthResponse {
  apiResponseTimeMs?: number;
  pipelineDurationMs?: number;
  datasetRefreshTimeMs?: number;
  activeUsers?: number;
  metrics?: HealthMetric[];
}

async function fetchSystemHealth(): Promise<SystemHealthResponse> {
  try {
    return await apiService.get<SystemHealthResponse>('/admin/system-health');
  } catch {
    return {};
  }
}

function MetricCard({
  title,
  value,
  unit,
  icon,
  status = 'ok',
}: {
  title: string;
  value: number | string;
  unit: string;
  icon: React.ReactNode;
  status?: 'ok' | 'warn' | 'error';
}) {
  const color = status === 'error' ? '#f44336' : status === 'warn' ? '#ff9800' : '#4caf50';
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={600}>
              {value} <Typography component="span" variant="body2" color="text.secondary">{unit}</Typography>
            </Typography>
          </Box>
          <Box sx={{ color }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export const SystemHealthPage = () => {
  const [data, setData] = useState<SystemHealthResponse>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchSystemHealth()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const apiMs = data.apiResponseTimeMs ?? 0;
  const pipelineMs = data.pipelineDurationMs ?? 0;
  const refreshMs = data.datasetRefreshTimeMs ?? 0;
  const activeUsers = data.activeUsers ?? 0;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          System Health
        </Typography>
        <Typography variant="body1" color="text.secondary">
          API response time, pipeline duration, dataset refresh and active users
        </Typography>
      </Box>

      {loading ? (
        <LinearProgress sx={{ mb: 2 }} />
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="API response time"
              value={apiMs}
              unit="ms"
              icon={<Speed />}
              status={apiMs > 1000 ? 'warn' : apiMs > 3000 ? 'error' : 'ok'}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard title="Pipeline duration" value={pipelineMs} unit="ms" icon={<AccountTree />} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard title="Dataset refresh time" value={refreshMs} unit="ms" icon={<Refresh />} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard title="Active users" value={activeUsers} unit="" icon={<People />} />
          </Grid>

          {data.metrics && data.metrics.length > 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  All metrics
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Metric</TableCell>
                        <TableCell>Value</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Last updated</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.metrics.map((m) => (
                        <TableRow key={m.name}>
                          <TableCell>{m.name}</TableCell>
                          <TableCell>{m.value} {m.unit}</TableCell>
                          <TableCell>{m.status}</TableCell>
                          <TableCell>{m.lastUpdated ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {!loading && !data.apiResponseTimeMs && !data.pipelineDurationMs && !data.datasetRefreshTimeMs && data.activeUsers === undefined && (
        <Paper sx={{ p: 3, mt: 2 }}>
          <Typography color="text.secondary">
            No metrics yet. Connect GET /admin/system-health to display API response time, pipeline duration, dataset refresh time and active users.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};
