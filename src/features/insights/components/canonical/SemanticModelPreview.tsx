import { Box, Chip, Stack, Typography } from '@mui/material';
import type { SemanticModel } from '../../types';

export function SemanticModelPreview({ model }: { model: SemanticModel }) {
  const tables = model.tables ?? [];
  const relationships = model.relationships ?? [];

  return (
    <Box sx={{ p: 2, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Typography variant="subtitle2" fontWeight={800} gutterBottom>
        Semantic model
      </Typography>

      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
        Tables
      </Typography>
      <Stack spacing={1} sx={{ mb: 2 }}>
        {tables.slice(0, 6).map((t) => (
          <Box key={t.name} sx={{ p: 1.25, borderRadius: 1.5, border: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
            <Typography variant="body2" fontWeight={700} gutterBottom noWrap title={t.name}>
              {t.name}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {(t.columns ?? []).slice(0, 10).map((c) => (
                <Chip key={`${t.name}.${c.name}`} size="small" label={c.name} variant="outlined" />
              ))}
              {(t.columns ?? []).length > 10 && <Chip size="small" label={`+${(t.columns ?? []).length - 10} more`} />}
            </Stack>
          </Box>
        ))}
      </Stack>

      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
        Relationships
      </Typography>
      {relationships.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          —
        </Typography>
      ) : (
        <Stack spacing={0.75}>
          {relationships.slice(0, 8).map((r, idx) => (
            <Typography key={`${r.fromTable}.${r.fromColumn}-${r.toTable}.${r.toColumn}-${idx}`} variant="body2">
              {r.fromTable}.{r.fromColumn} → {r.toTable}.{r.toColumn}
            </Typography>
          ))}
        </Stack>
      )}

      {!!model.measures?.length && (
        <>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }} gutterBottom>
            Measures
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.5}>
            {model.measures.slice(0, 10).map((m) => (
              <Chip key={m.name} size="small" label={m.name} />
            ))}
            {model.measures.length > 10 && <Chip size="small" label={`+${model.measures.length - 10} more`} />}
          </Stack>
        </>
      )}
    </Box>
  );
}

