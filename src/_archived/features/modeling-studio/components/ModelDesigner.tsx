import { alpha, Box, Chip, Stack, Typography, useTheme } from '@mui/material';
import { useMemo, useState } from 'react';
import type { ModelingSchema } from '../types';

type DesignerTable = {
  name: string;
  visible: string[];
  hidden: string[];
};

type DragPayload = {
  table: string;
  column: string;
  from: 'visible' | 'hidden';
};

function safeParsePayload(s: string): DragPayload | null {
  try {
    const o = JSON.parse(s) as unknown;
    if (!o || typeof o !== 'object') return null;
    const r = o as Record<string, unknown>;
    if (typeof r.table !== 'string') return null;
    if (typeof r.column !== 'string') return null;
    if (r.from !== 'visible' && r.from !== 'hidden') return null;
    return { table: r.table, column: r.column, from: r.from };
  } catch {
    return null;
  }
}

export function ModelDesigner({ schema }: { schema: ModelingSchema }) {
  const theme = useTheme();
  const primary = theme.palette.primary.main;

  const initial = useMemo<DesignerTable[]>(
    () =>
      schema.tables.map((t) => ({
        name: t.name,
        visible: [...t.fields],
        hidden: [],
      })),
    [schema.tables]
  );

  const [tables, setTables] = useState<DesignerTable[]>(initial);
  const [activeDrop, setActiveDrop] = useState<{ table: string; to: 'visible' | 'hidden' } | null>(null);

  const moveColumn = (p: DragPayload, to: 'visible' | 'hidden') => {
    setTables((prev) =>
      prev.map((t) => {
        if (t.name !== p.table) return t;
        const fromArr = p.from === 'visible' ? t.visible : t.hidden;
        const toArr = to === 'visible' ? t.visible : t.hidden;
        if (!fromArr.includes(p.column)) return t;
        if (toArr.includes(p.column)) return t;
        return {
          ...t,
          visible: p.from === 'visible' ? t.visible.filter((c) => c !== p.column) : t.visible,
          hidden: p.from === 'hidden' ? t.hidden.filter((c) => c !== p.column) : t.hidden,
          ...(to === 'visible'
            ? { visible: [...(p.from === 'visible' ? t.visible.filter((c) => c !== p.column) : t.visible), p.column] }
            : { hidden: [...(p.from === 'hidden' ? t.hidden.filter((c) => c !== p.column) : t.hidden), p.column] }),
        };
      })
    );
  };

  const dropZone = (tableName: string, to: 'visible' | 'hidden') => {
    const isActive = activeDrop?.table === tableName && activeDrop?.to === to;
    return {
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        setActiveDrop({ table: tableName, to });
      },
      onDragLeave: () => setActiveDrop(null),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        setActiveDrop(null);
        const payload = safeParsePayload(e.dataTransfer.getData('application/json'));
        if (!payload) return;
        if (payload.table !== tableName) return; // keep it simple: per-table hide/unhide
        if (payload.from === to) return;
        moveColumn(payload, to);
      },
      sx: {
        border: `1px dashed ${isActive ? alpha(primary, 0.7) : alpha(primary, 0.18)}`,
        borderRadius: 2,
        p: 1,
        minHeight: 44,
        bgcolor: isActive ? alpha(primary, 0.06) : 'transparent',
        transition: 'all 120ms ease',
      },
    } as const;
  };

  return (
    <Box sx={{ p: 2, height: '100%', minHeight: 0, bgcolor: 'grey.50' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={800}>
            Model designer (dummy)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Drag columns into “Hidden” to hide them. Drag back to “Visible” to re-enable.
          </Typography>
        </Box>
        <Chip size="small" label="Drag & drop" variant="outlined" />
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 1.5,
          alignItems: 'start',
        }}
      >
        {tables.map((t) => (
          <Box
            key={t.name}
            sx={{
              borderRadius: 2,
              border: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ px: 2, py: 1.25, bgcolor: alpha(primary, 0.92) }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'white' }}>
                {t.name}
              </Typography>
            </Box>

            <Box sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
                Visible columns
              </Typography>
              <Box {...dropZone(t.name, 'visible')}>
                <Stack direction="row" flexWrap="wrap" gap={0.75}>
                  {t.visible.map((c) => (
                    <Chip
                      key={c}
                      size="small"
                      label={c}
                      draggable
                      onDragStart={(e) => {
                        const payload: DragPayload = { table: t.name, column: c, from: 'visible' };
                        e.dataTransfer.setData('application/json', JSON.stringify(payload));
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      sx={{ cursor: 'grab' }}
                    />
                  ))}
                  {t.visible.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Drop columns here
                    </Typography>
                  )}
                </Stack>
              </Box>

              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5, mb: 0.75 }}>
                Hidden columns
              </Typography>
              <Box {...dropZone(t.name, 'hidden')}>
                <Stack direction="row" flexWrap="wrap" gap={0.75}>
                  {t.hidden.map((c) => (
                    <Chip
                      key={c}
                      size="small"
                      color="warning"
                      label={c}
                      draggable
                      onDragStart={(e) => {
                        const payload: DragPayload = { table: t.name, column: c, from: 'hidden' };
                        e.dataTransfer.setData('application/json', JSON.stringify(payload));
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      sx={{ cursor: 'grab' }}
                    />
                  ))}
                  {t.hidden.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Drop columns here to hide
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

