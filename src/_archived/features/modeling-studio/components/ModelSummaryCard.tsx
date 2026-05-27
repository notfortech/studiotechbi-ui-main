import { Alert, Box, Chip, Divider, Stack, Typography } from '@mui/material';
import type { ModelSummary } from '../types';

export function ModelSummaryCard({ summary }: { summary: ModelSummary }) {
  const confidence =
    summary.confidence <= 1 ? `${Math.round(summary.confidence * 100)}%` : `${Math.round(summary.confidence)}%`;

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        p: 2,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} mb={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" fontWeight={800} noWrap title={summary.templateId}>
            Model summary
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Template: {summary.templateId || '—'} · Model ID: {summary.modelId || '—'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5} flexShrink={0}>
          <Chip size="small" label={`Confidence: ${confidence}`} variant="outlined" />
        </Stack>
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      <Box sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Transformations
        </Typography>
        {summary.transformations.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No transformations suggested.
          </Typography>
        ) : (
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {summary.transformations.map((t) => (
              <Typography key={t} component="li" variant="body2" sx={{ mb: 0.5 }}>
                ✔ {t}
              </Typography>
            ))}
          </Box>
        )}
      </Box>

      <Box sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Relationships
        </Typography>
        {summary.relationships.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No relationships suggested.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {summary.relationships.map((r, idx) => (
              <Box
                key={`${r.from}-${r.to}-${idx}`}
                sx={{
                  p: 1.25,
                  borderRadius: 1.5,
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: 'grey.50',
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Typography variant="body2" sx={{ minWidth: 0 }} noWrap title={`${r.from} → ${r.to}`}>
                    {r.from} → {r.to}
                  </Typography>
                  <Chip size="small" label={`${Math.round((r.matchRate ?? 0) * 100)}%`} variant="outlined" />
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      {summary.excludedColumns.length > 0 && (
        <Alert severity="warning" variant="outlined">
          <Typography variant="subtitle2" fontWeight={700}>
            Excluded columns
          </Typography>
          <Typography variant="body2" color="text.secondary">
            These fields won’t be used in the model:
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }}>
            {summary.excludedColumns.slice(0, 12).map((c) => (
              <Chip key={c} label={c} size="small" />
            ))}
            {summary.excludedColumns.length > 12 && (
              <Chip size="small" label={`+${summary.excludedColumns.length - 12} more`} />
            )}
          </Stack>
        </Alert>
      )}
    </Box>
  );
}

