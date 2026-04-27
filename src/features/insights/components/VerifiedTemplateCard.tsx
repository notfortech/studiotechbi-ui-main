import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material';
import type { VerifiedTemplateMatch } from '../types';

const CATALOG_SUBSET = 'no_semantic_match_showing_catalog_subset';

interface VerifiedTemplateCardProps {
  match: VerifiedTemplateMatch;
  onUse?: (match: VerifiedTemplateMatch) => void;
  /** When the orchestrator has no model row for this `templateId` yet. */
  modelMissing?: boolean;
  disabled?: boolean;
  /** Hide actions; list is view-only. */
  readOnly?: boolean;
  /** Allow selecting the template (no backend action). */
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (match: VerifiedTemplateMatch) => void;
  /** Dense layout for narrow Copilot rails. */
  compact?: boolean;
}

export function VerifiedTemplateCard({
  match,
  onUse,
  modelMissing,
  disabled,
  readOnly,
  selectable,
  selected,
  onSelect,
  compact,
}: VerifiedTemplateCardProps) {
  const { template, matchScore, matchReasons } = match;
  const isCatalogOnly =
    matchScore === 0 && matchReasons.some((r) => r === CATALOG_SUBSET);

  const reasonChips = matchReasons.filter((r) => r !== CATALOG_SUBSET).slice(0, compact ? 2 : undefined);

  return (
    <Box
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      onClick={
        selectable && !disabled
          ? () => {
              onSelect?.(match);
            }
          : undefined
      }
      onKeyDown={
        selectable && !disabled
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect?.(match);
              }
            }
          : undefined
      }
      sx={{
        p: compact ? 1 : 2,
        borderRadius: 1,
        border: 1,
        borderColor: selected ? 'primary.main' : 'divider',
        bgcolor: 'background.paper',
        cursor: selectable ? 'pointer' : 'default',
        outline: 'none',
        '&:focus-visible': selectable
          ? {
              boxShadow: (t) => `0 0 0 3px ${t.palette.primary.main}33`,
            }
          : undefined,
      }}
    >
      {isCatalogOnly &&
        (compact ? (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
            Catalog subset — pick the closest fit.
          </Typography>
        ) : (
          <Alert severity="info" sx={{ mb: 1.5 }} variant="outlined">
            No close semantic match—showing a sample of templates from the catalog. Scores are zero until you pick
            a better fit.
          </Alert>
        ))}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} mb={compact ? 0.5 : 1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant={compact ? 'body2' : 'subtitle2'}
            fontWeight={compact ? 600 : undefined}
            noWrap
            title={template.templateName ?? template.templateId}
          >
            {template.templateName ?? template.templateId}
          </Typography>
          {!compact && (
            <Typography variant="caption" color="text.secondary" display="block" noWrap title={template.templateId}>
              ID: {template.templateId}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={0.5} flexShrink={0} alignItems="center">
          <Chip
            size="small"
            label={matchScore <= 1 ? `${Math.round(matchScore * 100)}%` : `${Math.round(matchScore)}`}
            variant="outlined"
            title="Match score"
          />
        </Stack>
      </Stack>
      {(template.industry || template.version) && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: compact ? 0.5 : 1 }} noWrap>
          {[template.industry, template.version].filter(Boolean).join(' · ')}
        </Typography>
      )}
      {reasonChips.length > 0 && (
        <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: compact ? 0.75 : 1.5 }}>
          {reasonChips.map((r, ri) => (
            <Chip key={`${ri}-${r.slice(0, 24)}`} size="small" label={r.length > 40 ? `${r.slice(0, 37)}…` : r} variant="outlined" />
          ))}
        </Stack>
      )}
      {!readOnly && !(compact && selectable) && (
        <>
          <Button
            variant="contained"
            size="small"
            disabled={disabled || modelMissing}
            onClick={(e) => {
              e.stopPropagation();
              onUse?.(match);
            }}
            title={modelMissing ? 'Provision the model for this template on the server, then try again.' : undefined}
          >
            Use this dashboard
          </Button>
          {modelMissing && (
            <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 1 }}>
              No provisioned model for this template yet. Suggestions are still processing—try again in a moment.
            </Typography>
          )}
        </>
      )}
    </Box>
  );
}
