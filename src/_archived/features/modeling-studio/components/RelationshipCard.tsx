import { Box, Button, Chip, Stack, Typography } from '@mui/material';

interface RelationshipCardProps {
  from: string;
  to: string;
  matchRate: number;
  status?: 'approved' | 'rejected' | 'pending';
  onApprove: () => void;
  onReject: () => void;
  disabled?: boolean;
}

export function RelationshipCard({
  from,
  to,
  matchRate,
  status = 'pending',
  onApprove,
  onReject,
  disabled,
}: RelationshipCardProps) {
  const pct = Math.round(matchRate * 100);
  const locked = status !== 'pending';

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} mb={1}>
        <Typography variant="subtitle2">Link tables</Typography>
        <Chip
          size="small"
          label={status === 'pending' ? `${pct}% match` : status}
          color={status === 'approved' ? 'success' : status === 'rejected' ? 'default' : 'primary'}
          variant={status === 'pending' ? 'filled' : 'outlined'}
        />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        From
      </Typography>
      <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
        {from}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        To
      </Typography>
      <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2 }}>
        {to}
      </Typography>
      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          variant="contained"
          disabled={disabled || locked}
          onClick={(e) => {
            e.stopPropagation();
            onApprove();
          }}
        >
          Approve
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          disabled={disabled || locked}
          onClick={(e) => {
            e.stopPropagation();
            onReject();
          }}
        >
          Reject
        </Button>
      </Stack>
    </Box>
  );
}
