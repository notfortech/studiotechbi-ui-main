import { Box, Chip, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import type { TransformSuggestInsights } from '../types';

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object' && v !== null && 'name' in v) {
    const n = (v as { name?: unknown }).name;
    if (typeof n === 'string') return n;
  }
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

interface InsightStructurePanelProps {
  insights: TransformSuggestInsights | null;
}

export function InsightStructurePanel({ insights }: InsightStructurePanelProps) {
  if (!insights) {
    return (
      <SectionIntro title="Data structure & transformations">
        <Typography variant="body2" color="text.secondary">
          Run <strong>Generate suggestions</strong> to see how the engine describes your sample (summary,
          columns, steps, and issues).
        </Typography>
      </SectionIntro>
    );
  }

  const columns = Array.isArray(insights.columns) ? insights.columns : [];
  const issues = Array.isArray(insights.issues) ? insights.issues : [];
  const steps = Array.isArray(insights.steps) ? insights.steps : [];
  const hasBody =
    !!(insights.summary || insights.provider || columns.length || issues.length || steps.length);

  return (
    <SectionIntro title="Data structure & transformations">
      {!hasBody && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No transformation details were returned for this run.
        </Typography>
      )}
      {insights.provider && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Provider: {insights.provider}
        </Typography>
      )}
      {insights.summary && (
        <Typography variant="body2" sx={{ mb: 2 }}>
          {insights.summary}
        </Typography>
      )}
      {columns.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            Columns
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.5}>
            {columns.map((c, i) => (
              <Chip key={i} size="small" label={formatCell(c)} variant="outlined" />
            ))}
          </Stack>
        </Box>
      )}
      {issues.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            Issues
          </Typography>
          <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
            {issues.map((issue, i) => (
              <Typography key={i} component="li" variant="body2">
                {formatCell(issue)}
              </Typography>
            ))}
          </Stack>
        </Box>
      )}
      {steps.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            Steps
          </Typography>
          <Stack component="ol" spacing={0.5} sx={{ m: 0, pl: 2 }}>
            {steps.map((step, i) => (
              <Typography key={i} component="li" variant="body2">
                {formatCell(step)}
              </Typography>
            ))}
          </Stack>
        </Box>
      )}
    </SectionIntro>
  );
}

function SectionIntro({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        {title}
      </Typography>
      {children}
    </Box>
  );
}
