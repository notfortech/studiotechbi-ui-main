import { Alert, Box, Stack, Typography } from '@mui/material';
import type { InsightModel, VerifiedTemplateMatch } from '../types';
import { VerifiedTemplateCard } from './VerifiedTemplateCard';

function isCatalogOnlyProvider(provider: string | undefined): boolean {
  if (!provider) return false;
  if (provider === 'StudioTechBI.Catalog') return true;
  return provider.toLowerCase().includes('catalog');
}

interface CopilotPanelProps {
  /** Template-verified dashboard options (only from the insights API). */
  verifiedTemplates: VerifiedTemplateMatch[];
  /** Server models (used to know if a template can be applied via `selectModel`). */
  provisionedModels: InsightModel[];
  onSelectVerified?: (match: VerifiedTemplateMatch) => void;
  busy?: boolean;
  /** No template actions; browse-only. */
  readOnly?: boolean;
  /** Allow picking a template for Generate AI Insights. */
  selectable?: boolean;
  selectedTemplateId?: string;
  onSelectTemplate?: (match: VerifiedTemplateMatch) => void;
  /** Insights engine `data.insights.provider` when present (e.g. catalog-only). */
  insightsProvider?: string;
  /** Narrow rail with smaller cards (Insights page). */
  compact?: boolean;
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
  selectable,
  selectedTemplateId,
  onSelectTemplate,
  insightsProvider,
  compact,
}: CopilotPanelProps) {
  const catalogHint = isCatalogOnlyProvider(insightsProvider);

  return (
    <Box
      sx={{
        width: { xs: '100%', md: compact ? 280 : 360 },
        flexShrink: 0,
        borderLeft: compact ? 0 : { md: 1 },
        borderColor: 'divider',
        pl: compact ? 0 : { md: 2 },
        ml: compact ? 0 : { md: 2 },
        pt: { xs: compact ? 1 : 2, md: 0 },
      }}
    >
      <Typography variant={compact ? 'subtitle1' : 'h6'} fontWeight={700} gutterBottom>
        Copilot
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: catalogHint ? 1 : 2, display: 'block' }}>
        {readOnly
          ? 'Possible dashboard templates for your data (preview only). Suggestions are AI-assisted and verified on the server.'
          : 'Dashboard templates you can use—each option uses a real template ID from your catalog. Suggestions are AI-assisted, then matched and verified on the server before they appear here.'}
      </Typography>
      {catalogHint && (
        <Alert severity="info" variant="outlined" sx={{ mb: 1.5, py: 0.25 }}>
          Template matching used the catalog only; external AI was skipped.
        </Alert>
      )}
      {verifiedTemplates.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          {readOnly
            ? 'No template suggestions yet.'
            : 'No suggestions yet. Load the sample, then run generate suggestions to see verified template options.'}
        </Typography>
      )}
      <Stack spacing={compact ? 1 : 2}>
        {verifiedTemplates.map((m, i) => (
          <VerifiedTemplateCard
            key={`${m.template.templateId}-${i}`}
            match={m}
            onUse={onSelectVerified}
            readOnly={readOnly}
            selectable={selectable}
            selected={selectedTemplateId === m.template.templateId}
            onSelect={onSelectTemplate}
            disabled={busy}
            compact={compact}
            modelMissing={readOnly ? false : !hasProvisionedModel(provisionedModels, m.template.templateId)}
          />
        ))}
      </Stack>
    </Box>
  );
}
