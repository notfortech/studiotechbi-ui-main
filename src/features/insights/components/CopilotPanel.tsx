import { Box, Stack, Typography } from '@mui/material';
import type { ModelOptionWithEmbed } from '../types';
import { ModelCard } from './ModelCard';

interface CopilotPanelProps {
  models: ModelOptionWithEmbed[];
  onSelectModel: (model: ModelOptionWithEmbed) => void;
  busy?: boolean;
}

export function CopilotPanel({ models, onSelectModel, busy }: CopilotPanelProps) {
  return (
    <Box
      sx={{
        width: { xs: '100%', md: 360 },
        flexShrink: 0,
        borderLeft: { md: 1 },
        borderColor: 'divider',
        pl: { md: 2 },
        ml: { md: 2 },
        pt: { xs: 2, md: 0 },
      }}
    >
      <Typography variant="h6" gutterBottom>
        Copilot
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Suggested report templates from your data model. Pick one to build your Power BI report.
      </Typography>
      {models.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No suggestions yet. Connect a file and generate models to see options here.
        </Typography>
      )}
      <Stack spacing={2}>
        {models.map((m) => (
          <ModelCard key={m.id} model={m} onUse={onSelectModel} disabled={busy} />
        ))}
      </Stack>
    </Box>
  );
}
