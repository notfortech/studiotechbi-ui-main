import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Stack,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Bolt as CreditIcon, CheckCircle as CheckIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestCreditPurchase, type CreditPack } from '../../api/creditPurchaseApi';
import { ROUTES } from '../../core/constants';

// Placeholder pricing — a mock checkout, no real payment gateway wired up yet (see PRD note in
// AdminCreditPurchaseRequestsController.cs). Easy to swap for real pack/pricing data later.
const PACKS: (CreditPack & { price: string; popular?: boolean })[] = [
  { credits: 100, label: '100 credits', price: '$19' },
  { credits: 500, label: '500 credits', price: '$79', popular: true },
  { credits: 1000, label: '1,000 credits', price: '$139' },
];

export const PurchaseCreditsPage = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<number>(1); // index into PACKS, default the "popular" pack
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const handleCheckout = async () => {
    const pack = PACKS[selected];
    setSubmitting(true);
    setError(null);
    try {
      const result = await requestCreditPurchase(pack.credits, pack.label);
      setRequestId(result.requestId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit your purchase request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (requestId) {
    return (
      <Box maxWidth={560} mx="auto">
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <CheckIcon color="success" sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Request submitted
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Once our team confirms payment, your credits will be added automatically — no further
            action needed on your part. You can check your balance any time from the dashboard's
            "View Report Stats" quick action.
          </Typography>
          <Button variant="contained" onClick={() => navigate(ROUTES.CLIENT.DASHBOARD)}>
            Back to Dashboard
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box maxWidth={800} mx="auto">
      <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        Back
      </Button>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Purchase AI Credits
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Pick a credit pack below. This is a mock checkout — no payment is actually charged yet.
          Once you submit, our team confirms payment and your credits are added automatically.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {PACKS.map((pack, i) => (
          <Grid size={{ xs: 12, sm: 4 }} key={pack.credits}>
            <Paper
              variant="outlined"
              onClick={() => setSelected(i)}
              sx={{
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                position: 'relative',
                borderWidth: selected === i ? 2 : 1,
                borderColor: selected === i ? 'primary.main' : 'divider',
                transition: 'border-color 120ms ease',
              }}
            >
              {pack.popular && (
                <Chip label="Most popular" size="small" color="primary" sx={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)' }} />
              )}
              <CreditIcon color={selected === i ? 'primary' : 'disabled'} sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h5" fontWeight={700}>{pack.credits.toLocaleString()}</Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                AI credits
              </Typography>
              <Typography variant="h6" fontWeight={600}>{pack.price}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Stack direction="row" justifyContent="center">
        <Button
          variant="contained"
          size="large"
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <CreditIcon />}
          disabled={submitting}
          onClick={() => void handleCheckout()}
        >
          {submitting ? 'Submitting…' : `Mock Checkout — ${PACKS[selected].label}`}
        </Button>
      </Stack>
    </Box>
  );
};
