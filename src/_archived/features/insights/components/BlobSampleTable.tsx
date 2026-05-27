import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import type { BlobDataSample } from '../types';

function cellStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

interface BlobSampleTableProps {
  data: BlobDataSample | null;
  error: string | null;
  /** Max height of the scrollable table area (default 480). */
  maxHeight?: number;
}

const MAX = 100;

export function BlobSampleTable({ data, error, maxHeight = 480 }: BlobSampleTableProps) {
  if (error) {
    return (
      <Typography variant="body2" color="text.secondary">
        {error}
      </Typography>
    );
  }
  if (!data || (data.columns.length === 0 && data.rows.length === 0)) {
    return (
      <Typography variant="body2" color="text.secondary">
        No sample rows to display.
      </Typography>
    );
  }
  const columns = data.columns.length > 0 ? data.columns : Object.keys(data.rows[0] ?? {});
  const rows = data.rows.slice(0, MAX);
  return (
    <>
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ maxHeight, maxWidth: '100%' }}
        tabIndex={0}
        role="region"
        aria-label="Read-only data sample, at most 100 rows"
      >
        <Table size="small" stickyHeader sx={{ minWidth: 400 }}>
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableCell key={c} sx={{ fontWeight: 600, bgcolor: 'action.hover' }}>
                  {c}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, ri) => (
              <TableRow key={ri} hover>
                {columns.map((c) => (
                  <TableCell key={c} sx={{ whiteSpace: 'nowrap' }}>
                    {cellStr(row[c])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
        Read-only preview, up to {MAX} rows
        {data.truncated || (data.rowCount != null && data.rowCount > MAX)
          ? ' (trimmed; full file is larger)'
          : ''}
        .
      </Typography>
    </>
  );
}
