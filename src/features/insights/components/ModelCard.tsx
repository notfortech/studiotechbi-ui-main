import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import type { InsightModel } from '../types';

interface ModelCardProps {
  model: InsightModel;
  onUse: (model: InsightModel) => void;
  disabled?: boolean;
}

export function ModelCard({ model, onUse, disabled }: ModelCardProps) {
  const columns = model.schema?.columns ?? [];
  const preview = columns.slice(0, 8);
  const rest = columns.length - preview.length;
  const statusLabel = model.status ? model.status : '—';

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} mb={1}>
        <Typography variant="subtitle2" noWrap title={model.templateId}>
          Verified template: {model.templateId}
        </Typography>
        <Stack direction="row" spacing={0.5} flexShrink={0}>
          <Chip size="small" label={statusLabel} variant="outlined" />
          <Chip
            size="small"
            label={
              model.confidence <= 1
                ? `${Math.round(model.confidence * 100)}%`
                : `${Math.round(model.confidence)}`
            }
            variant="outlined"
          />
        </Stack>
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
        Columns
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 1.5 }}>
        {preview.map((c) => (
          <Chip key={c} label={c} size="small" />
        ))}
        {rest > 0 && <Chip size="small" label={`+${rest} more`} />}
        {preview.length === 0 && <Typography variant="body2">—</Typography>}
      </Stack>
      <Button variant="contained" size="small" disabled={disabled} onClick={() => onUse(model)}>
        Use this dashboard
      </Button>
    </Box>
  );
}
