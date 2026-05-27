import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import type { PreviewTable } from '../types';

interface DataPreviewProps {
  previewBefore: PreviewTable;
  previewAfter: PreviewTable;
  highlightColumns: string[];
  showAfter: boolean;
  onShowAfterChange: (next: boolean) => void;
  isRelationshipContext: boolean;
}

export function DataPreview({
  previewBefore,
  previewAfter,
  highlightColumns,
  showAfter,
  onShowAfterChange,
  isRelationshipContext,
}: DataPreviewProps) {
  const table = showAfter ? previewAfter : previewBefore;
  const cols = table.columns.length ? table.columns : ['—'];

  if (isRelationshipContext) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-slate-50/80">
        <div className="shrink-0 border-b border-slate-200 px-4 py-3">
          <Typography variant="subtitle1" fontWeight={600}>
            Row preview
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Select a cleaning or naming step on the left to preview sample rows here.
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50/80">
      <div className="shrink-0 border-b border-slate-200 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Typography variant="subtitle1" fontWeight={600}>
              Preview
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Compare before and after — highlighted cells change if you approve the step.
            </Typography>
          </div>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={showAfter ? 'after' : 'before'}
            onChange={(_, v) => v && onShowAfterChange(v === 'after')}
          >
            <ToggleButton value="before">Before</ToggleButton>
            <ToggleButton value="after">After</ToggleButton>
          </ToggleButtonGroup>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <Box sx={{ borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'background.paper', overflow: 'auto' }}>
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100">
                {cols.map((c) => (
                  <th key={c} className="whitespace-nowrap px-3 py-2 font-medium text-slate-700">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(table.rows.length ? table.rows : [{}]).map((row, ri) => (
                <tr key={ri} className="border-b border-slate-100 last:border-0">
                  {cols.map((c) => {
                    const v = row[c] ?? '—';
                    const hi = highlightColumns.includes(c) && showAfter;
                    return (
                      <td
                        key={c}
                        className={`px-3 py-2 font-mono text-slate-800 ${hi ? 'bg-amber-100' : ''}`}
                      >
                        {v}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </div>
    </div>
  );
}
