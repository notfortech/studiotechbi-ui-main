import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import type { ModelOptionWithEmbed } from '../types';

interface ModelCardProps {
  model: ModelOptionWithEmbed;
  onUse: (model: ModelOptionWithEmbed) => void;
  disabled?: boolean;
}

export function ModelCard({ model, onUse, disabled }: ModelCardProps) {
  const preview = model.schema.columns.slice(0, 8);
  const rest = model.schema.columns.length - preview.length;

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
          Template: {model.templateId}
        </Typography>
        <Chip
          size="small"
          label={
            model.confidence <= 1
              ? `${Math.round(model.confidence * 100)}% conf.`
              : `${Math.round(model.confidence)} score`
          }
          variant="outlined"
        />
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
        Use this
      </Button>
    </Box>
  );
}
