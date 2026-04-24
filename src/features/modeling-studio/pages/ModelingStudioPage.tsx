import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import { AiPanel } from '../components/AiPanel';
import { DataPreview } from '../components/DataPreview';
import { ModelDiagram } from '../components/ModelDiagram';
import { ModelSummaryCard } from '../components/ModelSummaryCard';
import { StepsPane } from '../components/StepsPane';
import { useModelingStudio } from '../hooks/useModelingStudio';
import type { ModelSummary } from '../types';
import { approveModel, suggestModelSummaryFromBlob } from '../services/modelingApprovalService';

export function ModelingStudioPage() {
  const { user } = useAuth();
  const studio = useModelingStudio();
  const [showAfter, setShowAfter] = useState(false);
  const [summary, setSummary] = useState<ModelSummary | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isRel = studio.selection?.kind === 'relationship';

  const clientId = user?.clientCode || user?.id || '';

  const handleGenerateModels = async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      // Keep TOM server-side; summary only.
      const res = await suggestModelSummaryFromBlob({ clientId });
      setSummary(res);
    } catch (e) {
      setSummary(null);
      setError(e instanceof Error ? e.message : 'Failed to generate models.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!clientId || !summary?.modelId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await approveModel({ clientId, modelId: summary.modelId, approved: true });
      setSuccess('Approved. Changes will be applied and your report will be generated.');
      setConfirmOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approval failed.');
      setConfirmOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)', minHeight: 0 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 2, flexShrink: 0 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Data modeling
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review a summary and approve once. Deep review is optional.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button variant="outlined" size="small" disabled={loading} onClick={() => void handleGenerateModels()}>
            {loading ? <CircularProgress size={18} /> : 'Generate Models'}
          </Button>
          <Button
            variant="outlined"
            size="small"
            disabled={!summary}
            onClick={() => setShowDetails((v) => !v)}
          >
            {showDetails ? 'Hide details' : 'Review details'}
          </Button>
          <Button
            variant="contained"
            size="small"
            disabled={!summary || loading}
            onClick={() => setConfirmOpen(true)}
          >
            Apply Changes &amp; Generate Report
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {!summary && (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
          <Box sx={{ maxWidth: 720 }}>
            <Typography variant="h6" fontWeight={800} gutterBottom>
              Generate a model summary
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Click <strong>Generate Models</strong> to see the expected transformations and relationships. TOM stays
              hidden until you approve.
            </Typography>
            <Button variant="contained" disabled={loading} onClick={() => void handleGenerateModels()}>
              {loading ? 'Generating…' : 'Generate Models'}
            </Button>
          </Box>
        </Box>
      )}

      {summary && !showDetails && (
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <ModelSummaryCard summary={summary} />
        </Box>
      )}

      {summary && showDetails && (
        <div className="grid min-h-0 flex-1 grid-cols-12 gap-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="col-span-12 min-h-0 md:col-span-3">
            <StepsPane
              steps={studio.steps}
              relationships={studio.relationships}
              selection={studio.selection}
              onSelectStep={(id) => {
                setShowAfter(false);
                studio.selectStep(id);
              }}
              onSelectRelationship={(id) => {
                setShowAfter(false);
                studio.selectRelationship(id);
              }}
              onApproveStep={studio.approveStep}
              onRejectStep={studio.rejectStep}
              onApproveRelationship={studio.approveRelationship}
              onRejectRelationship={studio.rejectRelationship}
              disabled={studio.persisting}
            />
          </div>
          <div className="col-span-12 min-h-0 border-y border-slate-200 md:col-span-6 md:border-x md:border-y-0">
            <div className="flex h-full min-h-0 flex-col">
              <div className="min-h-0 flex-[3] border-b border-slate-200">
                <ModelDiagram schema={studio.schema} />
              </div>
              <div className="min-h-0 flex-[2]">
                <DataPreview
                  previewBefore={studio.previewBefore}
                  previewAfter={studio.previewAfter}
                  highlightColumns={studio.highlightColumns}
                  showAfter={showAfter}
                  onShowAfterChange={setShowAfter}
                  isRelationshipContext={isRel}
                />
              </div>
            </div>
          </div>
          <div className="col-span-12 min-h-0 md:col-span-3">
            <AiPanel step={studio.selectedStep} relationship={studio.selectedRelationship} />
          </div>
        </div>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Report Generation</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Review the impact before applying changes.
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Model: <strong>{summary?.templateId || '—'}</strong>
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {summary?.transformations?.length ?? 0} changes will be applied
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You can review details before confirming if needed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void handleApprove()} disabled={loading || !summary?.modelId}>
            Confirm &amp; Generate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ModelingStudioPage;
