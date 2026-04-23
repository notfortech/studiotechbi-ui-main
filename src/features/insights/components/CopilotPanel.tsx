import { Box, Stack, Typography } from '@mui/material';
import type { InsightModel, VerifiedTemplateMatch } from '../types';
import { VerifiedTemplateCard } from './VerifiedTemplateCard';

interface CopilotPanelProps {
  /** Template-verified dashboard options (only from the insights API). */
  verifiedTemplates: VerifiedTemplateMatch[];
  /** Server models (used to know if a template can be applied via `selectModel`). */
  provisionedModels: InsightModel[];
  onSelectVerified?: (match: VerifiedTemplateMatch) => void;
  busy?: boolean;
  /** No template actions; browse-only. */
  readOnly?: boolean;
}

function hasProvisionedModel(models: InsightModel[], templateId: string): boolean {
  return models.some((m) => m.templateId === templateId);
}

export function CopilotPanel({
  verifiedTemplates,
  provisionedModels,
  onSelectVerified,
  busy,
  readOnly,
}: CopilotPanelProps) {
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
        {readOnly
          ? 'Possible dashboard templates for your data (preview only). Suggestions are AI-assisted and verified on the server.'
          : 'Dashboard templates you can use—each option uses a real template ID from your catalog. Suggestions are AI-assisted, then matched and verified on the server before they appear here.'}
      </Typography>
      {verifiedTemplates.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          {readOnly
            ? 'No template suggestions yet.'
            : 'No suggestions yet. Load the sample, then run generate suggestions to see verified template options.'}
        </Typography>
      )}
      <Stack spacing={2}>
        {verifiedTemplates.map((m, i) => (
          <VerifiedTemplateCard
            key={`${m.template.templateId}-${i}`}
            match={m}
            onUse={onSelectVerified}
            readOnly={readOnly}
            disabled={busy}
            modelMissing={readOnly ? false : !hasProvisionedModel(provisionedModels, m.template.templateId)}
          />
        ))}
      </Stack>
    </Box>
  );
}
