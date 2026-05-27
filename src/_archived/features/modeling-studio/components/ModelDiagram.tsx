import { alpha, Box, Chip, Stack, Typography, useTheme } from '@mui/material';
import type { ModelingSchema } from '../types';

interface ModelDiagramProps {
  schema: ModelingSchema;
}

function shortFields(fields: string[], max: number): string[] {
  if (fields.length <= max) return fields;
  return [...fields.slice(0, max - 1), `+${fields.length - (max - 1)} more`];
}

export function ModelDiagram({ schema }: ModelDiagramProps) {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const border = alpha(primary, 0.18);
  const headerBg = alpha(primary, 0.92);

  // Layout: first table is treated as the "fact" in the center; next 3 are dims around it.
  const fact = schema.tables[0];
  const dims = schema.tables.slice(1, 4);

  // Coordinates in viewBox space.
  const factBox = { x: 210, y: 52, w: 190, h: 156 };
  const dimBoxes = [
    { x: 38, y: 104, w: 120, h: 56 }, // left
    { x: 430, y: 30, w: 140, h: 86 }, // top-right
    { x: 430, y: 138, w: 140, h: 86 }, // bottom-right
  ];

  const tableHeight = (fieldsCount: number) => Math.min(160, 44 + fieldsCount * 14);

  const renderTable = (name: string, fields: string[], box: { x: number; y: number; w: number; h: number }) => {
    const visible = shortFields(fields, Math.max(2, Math.floor((box.h - 40) / 14)));
    return (
      <g>
        <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={12} fill="white" stroke={border} />
        <rect x={box.x} y={box.y} width={box.w} height={28} rx={12} fill={headerBg} />
        <text x={box.x + 12} y={box.y + 18} fontSize="11" fontWeight="700" fill="white">
          {name}
        </text>
        {visible.map((f, i) => (
          <text key={f} x={box.x + 12} y={box.y + 48 + i * 14} fontSize="10" fill="#111827">
            {f}
          </text>
        ))}
      </g>
    );
  };

  const linkPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const midX = (from.x + to.x) / 2;
    return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
  };

  // Map table names to centers.
  const centers = new Map<string, { x: number; y: number }>();
  if (fact) centers.set(fact.name, { x: factBox.x, y: factBox.y + factBox.h / 2 });
  dims.forEach((d, idx) => {
    const b = dimBoxes[idx];
    if (b) centers.set(d.name, { x: b.x + b.w, y: b.y + b.h / 2 });
  });

  return (
    <Box sx={{ p: 2, height: '100%', minHeight: 0, bgcolor: 'grey.50' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Model
        </Typography>
        <Chip size="small" label="Draft" variant="outlined" />
      </Stack>

      <Box
        sx={{
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          p: 1.5,
          height: '100%',
          minHeight: 280,
        }}
      >
        <Box component="svg" viewBox="0 0 620 260" sx={{ width: '100%', height: '100%', display: 'block' }}>
          {/* Links */}
          {schema.links.map((l, i) => {
            const a = centers.get(l.fromTable);
            const b = centers.get(l.toTable);
            if (!a || !b) return null;
            return (
              <path
                key={`${l.fromTable}-${l.toTable}-${i}`}
                d={linkPath(a, b)}
                fill="none"
                stroke={alpha(primary, 0.55)}
                strokeWidth={2}
              />
            );
          })}

          {/* Tables */}
          {dims.map((d, idx) => {
            const base = dimBoxes[idx];
            if (!base) return null;
            const h = tableHeight(Math.min(d.fields.length, 6));
            const box = { ...base, h };
            return tableHeight ? renderTable(d.name, d.fields, box) : null;
          })}
          {fact
            ? renderTable(fact.name, fact.fields, {
                ...factBox,
                h: tableHeight(Math.min(fact.fields.length, 8)),
              })
            : null}
        </Box>
      </Box>
    </Box>
  );
}

