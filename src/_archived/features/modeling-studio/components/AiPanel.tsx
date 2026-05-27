import { Box, Divider, Stack, Typography } from '@mui/material';
import type { ModelingRelationship, ModelingStep } from '../types';

interface AiPanelProps {
  step: ModelingStep | null;
  relationship: ModelingRelationship | null;
}

export function AiPanel({ step, relationship }: AiPanelProps) {
  const title = step?.name ?? (relationship ? 'This connection' : 'Assistant');
  const summary = step?.plainLanguageSummary ?? relationship?.plainLanguageSummary;
  const recommendation = step?.recommendation ?? relationship?.recommendation;
  const rejectImpact = step?.rejectImpact ?? relationship?.rejectImpact;

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-slate-200 bg-white">
      <div className="shrink-0 border-b border-slate-200 px-4 py-3">
        <Typography variant="subtitle1" fontWeight={600}>
          Assistant
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Plain-language guidance for what you selected.
        </Typography>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <Typography variant="subtitle2" gutterBottom>
          {title}
        </Typography>
        {!summary && (
          <Typography variant="body2" color="text.secondary">
            Select a step or connection on the left.
          </Typography>
        )}
        {summary && (
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                What this does
              </Typography>
              <Typography variant="body2">{summary}</Typography>
            </Box>
            <Divider />
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Suggestion
              </Typography>
              <Typography variant="body2">{recommendation}</Typography>
            </Box>
            <Divider />
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                If you skip it
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {rejectImpact}
              </Typography>
            </Box>
          </Stack>
        )}
      </div>
    </div>
  );
}
