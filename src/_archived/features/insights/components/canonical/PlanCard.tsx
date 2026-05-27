import { Box, Chip, Stack, Typography } from '@mui/material';
import type { DashboardTemplatePlan } from '../../types';

export function PlanCard({ plan }: { plan: DashboardTemplatePlan }) {
  const confidence = plan.confidence <= 1 ? `${Math.round(plan.confidence * 100)}%` : `${Math.round(plan.confidence)}%`;
  return (
    <Box sx={{ p: 2, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} mb={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={800} noWrap title={plan.templateId}>
            Template: {plan.templateId}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {plan.rationale}
          </Typography>
        </Box>
        <Chip size="small" label={`Confidence ${confidence}`} variant="outlined" />
      </Stack>
    </Box>
  );
}

