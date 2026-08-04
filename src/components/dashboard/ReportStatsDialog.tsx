import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Stack,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  BookmarkBorder as SavedReportsIcon,
  Bolt as DeterministicIcon,
  AutoAwesome as AiIcon,
  Close as CloseIcon,
  ShoppingCartOutlined as BuyIcon,
} from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReportStats, type ReportStats } from '../../api/reportStatsApi';
import { ROUTES } from '../../core/constants';

interface ReportStatsDialogProps {
  open: boolean;
  onClose: () => void;
}

function StatTile({
  icon, label, value, tooltip,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tooltip?: string;
}) {
  const content = (
    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', flex: 1, cursor: tooltip ? 'default' : undefined }}>
      <Box sx={{ color: 'text.secondary', mb: 0.5 }}>{icon}</Box>
      <Typography variant="h5" fontWeight={700}>{value.toLocaleString()}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Paper>
  );
  return tooltip ? <Tooltip title={tooltip} arrow>{content}</Tooltip> : content;
}

export const ReportStatsDialog = ({ open, onClose }: ReportStatsDialogProps) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getReportStats();
        if (!cancelled) setStats(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load report stats.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleBuyMore = () => {
    onClose();
    navigate(ROUTES.CLIENT.PURCHASE_CREDITS);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Report Stats
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : stats ? (
          <Stack spacing={3}>
            <Stack direction="row" spacing={2}>
              <StatTile icon={<SavedReportsIcon />} label="Saved Reports" value={stats.savedReportsCount} />
              <StatTile icon={<DeterministicIcon />} label="Deterministic Reports" value={stats.deterministicReportsCount} />
              <StatTile
                icon={<AiIcon />}
                label="AI-Assisted Reports"
                value={stats.aiAssistedReportsCount}
                tooltip={`${stats.aiCreditsConsumed.toLocaleString()} credit${stats.aiCreditsConsumed === 1 ? '' : 's'} consumed generating these reports`}
              />
            </Stack>

            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">AI Credits Available</Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {stats.isUnlimited ? 'Unlimited' : (stats.creditsRemaining ?? 0).toLocaleString()}
                  </Typography>
                  {!stats.isUnlimited && stats.resetDate && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`Next reset: ${new Date(stats.resetDate).toLocaleDateString()}`}
                      sx={{ mt: 0.5 }}
                    />
                  )}
                </Box>
                {!stats.isUnlimited && (
                  <Button variant="contained" size="small" startIcon={<BuyIcon />} onClick={handleBuyMore}>
                    Buy More AI Credits
                  </Button>
                )}
              </Stack>
            </Paper>
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
