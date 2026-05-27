import { Box, Button, Chip, Divider, Stack, Typography } from '@mui/material';
import type { ModelingRelationship, ModelingStep, Selection, StepGroup, StepStatus } from '../types';
import { RelationshipCard } from './RelationshipCard';

const GROUP_ORDER: { key: StepGroup; title: string; subtitle: string }[] = [
  { key: 'transformations', title: 'Cleaning', subtitle: 'Fix values so everything lines up' },
  { key: 'mappings', title: 'Names & fields', subtitle: 'Make columns easy to read' },
  { key: 'relationships', title: 'Connections', subtitle: 'How your tables fit together' },
];

function statusChip(status: StepStatus) {
  if (status === 'approved') return <Chip size="small" label="Approved" color="success" variant="outlined" />;
  if (status === 'rejected') return <Chip size="small" label="Skipped" color="default" variant="outlined" />;
  return <Chip size="small" label="Needs review" color="warning" variant="outlined" />;
}

interface StepsPaneProps {
  steps: ModelingStep[];
  relationships: ModelingRelationship[];
  selection: Selection;
  onSelectStep: (id: string) => void;
  onSelectRelationship: (id: string) => void;
  onApproveStep: (id: string) => void;
  onRejectStep: (id: string) => void;
  onApproveRelationship: (id: string) => void;
  onRejectRelationship: (id: string) => void;
  disabled?: boolean;
}

export function StepsPane({
  steps,
  relationships,
  selection,
  onSelectStep,
  onSelectRelationship,
  onApproveStep,
  onRejectStep,
  onApproveRelationship,
  onRejectRelationship,
  disabled,
}: StepsPaneProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border-r border-slate-200 bg-white">
      <div className="shrink-0 border-b border-slate-200 px-4 py-3">
        <Typography variant="subtitle1" fontWeight={600}>
          Steps
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Work through each group — nothing applies until you approve.
        </Typography>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {GROUP_ORDER.map((g, gi) => (
          <Box key={g.key} sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ px: 1, display: 'block', mb: 0.5 }}>
              {g.subtitle}
            </Typography>
            <Typography variant="subtitle2" sx={{ px: 1, mb: 1 }}>
              {g.title}
            </Typography>

            {g.key !== 'relationships' &&
              steps
                .filter((s) => s.group === g.key)
                .map((s) => {
                  const selected = selection?.kind === 'step' && selection.id === s.id;
                  return (
                    <Box
                      key={s.id}
                      onClick={() => onSelectStep(s.id)}
                      sx={{
                        mb: 1,
                        p: 1.5,
                        borderRadius: 1,
                        cursor: 'pointer',
                        border: 1,
                        borderColor: selected ? 'primary.main' : 'divider',
                        bgcolor: selected ? 'action.hover' : 'grey.50',
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                        <Typography variant="body2" fontWeight={500}>
                          {s.name}
                        </Typography>
                        {statusChip(s.status)}
                      </Stack>
                      <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} onClick={(e) => e.stopPropagation()}>
                        <Button size="small" variant="contained" disabled={disabled || s.status !== 'pending'} onClick={() => onApproveStep(s.id)}>
                          Approve
                        </Button>
                        <Button size="small" variant="text" disabled={disabled || s.status !== 'pending'} onClick={() => onRejectStep(s.id)}>
                          Skip
                        </Button>
                      </Stack>
                    </Box>
                  );
                })}

            {g.key === 'relationships' && (
              <Stack spacing={1.5} sx={{ px: 0.5 }}>
                {relationships.map((r) => {
                  const selected = selection?.kind === 'relationship' && selection.id === r.id;
                  return (
                    <Box
                      key={r.id}
                      onClick={() => onSelectRelationship(r.id)}
                      sx={{
                        borderRadius: 1,
                        outline: selected ? '2px solid' : 'none',
                        outlineColor: 'primary.main',
                        outlineOffset: 2,
                      }}
                    >
                      <RelationshipCard
                        from={r.from}
                        to={r.to}
                        matchRate={r.matchRate}
                        status={r.status}
                        disabled={disabled}
                        onApprove={() => onApproveRelationship(r.id)}
                        onReject={() => onRejectRelationship(r.id)}
                      />
                    </Box>
                  );
                })}
              </Stack>
            )}

            {gi < GROUP_ORDER.length - 1 && <Divider sx={{ my: 2 }} />}
          </Box>
        ))}
      </div>
    </div>
  );
}
