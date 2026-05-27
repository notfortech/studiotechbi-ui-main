import { Box, Chip, Stack, Typography } from '@mui/material';
import type { ProposedModel } from '../types';

interface ProposedModelCardProps {
  model: ProposedModel;
}

export function ProposedModelCard({ model }: ProposedModelCardProps) {
  const title = model.name || model.templateId || model.id || 'Proposed dashboard';
  const confidence =
    typeof model.confidence === 'number'
      ? model.confidence <= 1
        ? `${Math.round(model.confidence * 100)}%`
        : `${Math.round(model.confidence)}`
      : null;
  const cols = Array.isArray(model.columns) ? model.columns : [];
  const preview = cols.slice(0, 8);
  const rest = cols.length - preview.length;

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
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} mb={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap title={String(title)}>
            {String(title)}
          </Typography>
          {model.description && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              {String(model.description)}
            </Typography>
          )}
        </Box>
        {confidence && <Chip size="small" label={confidence} variant="outlined" />}
      </Stack>

      {preview.length > 0 && (
        <>
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            Columns
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.5}>
            {preview.map((c) => (
              <Chip key={c} size="small" label={c} />
            ))}
            {rest > 0 && <Chip size="small" label={`+${rest} more`} />}
          </Stack>
        </>
      )}
    </Box>
  );
}

