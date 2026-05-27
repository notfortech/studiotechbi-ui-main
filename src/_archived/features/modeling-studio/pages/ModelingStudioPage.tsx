import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import { ClientViewContext } from '../../../layouts/client/ClientViewContext';
import { getAccountantClients, type AccountantClient } from '../../../services/reportService';
import { CopilotPanel } from '../../insights/components/CopilotPanel';
import { AiPanel } from '../components/AiPanel';
import { DataPreview } from '../components/DataPreview';
import { ModelDesigner } from '../components/ModelDesigner';
import { ModelDiagram } from '../components/ModelDiagram';
import { ModelSummaryCard } from '../components/ModelSummaryCard';
import { StepsPane } from '../components/StepsPane';
import { useModelingStudio } from '../hooks/useModelingStudio';
import type { ModelSummary } from '../types';
import { approveModel, suggestModelSummaryFromBlob } from '../services/modelingApprovalService';
import { formatInsightsApiError } from '../../insights/services/insightService';
import { useSimpleInsights } from '../../insights/hooks/useSimpleInsights';

/**
 * Client code to resolve report + blob (`GET /reports/available/{clientCode}` and insights-engine).
 * For accountants and client+accounting-firm users, this must be the *selected* client, not a blind fallback.
 */
function resolveReportClientCodeForInsights(params: {
  user: { role?: string; clientCode?: string; userType?: number } | null;
  clientView: { accountingFirmMode?: boolean; selectedClientCode?: string } | undefined;
  accountantSelectedClient: string;
}): string | undefined {
  const { user, clientView, accountantSelectedClient } = params;
  if (!user) return undefined;
  if (user.role === 'accountant') {
    return accountantSelectedClient || undefined;
  }
  const accountingFirmUser =
    user.role === 'client' && clientView?.accountingFirmMode && user.userType !== 0;
  if (accountingFirmUser) {
    return clientView?.selectedClientCode || undefined;
  }
  return user.clientCode;
}

export function ModelingStudioPage() {
  const { user } = useAuth();
  const clientView = useContext(ClientViewContext);
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

  const [accountantClientCode, setAccountantClientCode] = useState('');
  const [accountantClients, setAccountantClients] = useState<AccountantClient[]>([]);

  const isAccountant = user?.role === 'accountant';
  const showAccountingWorkflow =
    user?.role === 'client' && clientView?.accountingFirmMode && user.userType !== 0;
  const explicitClientOnly = isAccountant || showAccountingWorkflow;
  const useSelectedClientForApis =
    (isAccountant && !!accountantClientCode) ||
    (showAccountingWorkflow && !!clientView?.selectedClientCode);

  useEffect(() => {
    if (!isAccountant) return;
    let cancel = false;
    void (async () => {
      try {
        const list = await getAccountantClients();
        if (!cancel) setAccountantClients(list);
      } catch {
        if (!cancel) setAccountantClients([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [isAccountant]);

  const reportClientCode = useMemo(
    () =>
      resolveReportClientCodeForInsights({
        user,
        clientView,
        accountantSelectedClient: accountantClientCode,
      }),
    [user, clientView, accountantClientCode]
  );

  const insights = useSimpleInsights(
    clientId || undefined,
    reportClientCode,
    explicitClientOnly,
    useSelectedClientForApis
  );

  const [insightsOk, setInsightsOk] = useState<string | null>(null);

  const handleAccountantClientChange = (e: SelectChangeEvent<string>) => {
    setAccountantClientCode(e.target.value);
  };

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

  const needsClientPick = explicitClientOnly && !reportClientCode;
  const canGenerateAiInsights =
    !!reportClientCode && !needsClientPick && insights.hasActiveReport && !insights.loading && !insights.suggesting;

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

      <Paper variant="outlined" sx={{ p: 2, mb: 2, flexShrink: 0 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle2" fontWeight={800} gutterBottom>
              AI Insights (moved from Insights)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Generate template matches/suggestions here so we can later integrate schema-to-dataset matching inside Data studio.
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
            {isAccountant && (
              <FormControl size="small" sx={{ minWidth: 240 }}>
                <InputLabel id="data-studio-acct-client-label">Client</InputLabel>
                <Select
                  labelId="data-studio-acct-client-label"
                  label="Client"
                  value={accountantClientCode}
                  onChange={handleAccountantClientChange}
                >
                  <MenuItem value="">
                    <em>Select a client</em>
                  </MenuItem>
                  {accountantClients.map((c) => (
                    <MenuItem key={c.clientId} value={c.clientCode}>
                      {c.clientName ?? c.clientCode} ({c.clientCode})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Button
              variant="contained"
              disabled={!canGenerateAiInsights}
              onClick={async () => {
                if (!canGenerateAiInsights) return;
                setInsightsOk(null);
                try {
                  await insights.generateAiInsights();
                  setInsightsOk('Generated AI insights. Review template suggestions on the right.');
                } catch (e) {
                  // generateAiInsights already captures errors into hook state; keep this as a no-op.
                  setInsightsOk(null);
                }
              }}
            >
              {insights.suggesting ? 'Generating…' : 'Generate AI Insights'}
            </Button>
          </Stack>
        </Stack>

        {needsClientPick && !insights.loading && (
          <Alert severity="info" sx={{ mt: 1.5 }}>
            Select a client to generate AI insights.
          </Alert>
        )}
        {insights.error && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {insights.error}
          </Alert>
        )}
        {insights.suggestionsError && (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            {insights.suggestionsError}
          </Alert>
        )}
        {insightsOk && (
          <Alert severity="success" sx={{ mt: 1.5 }} onClose={() => setInsightsOk(null)}>
            {insightsOk}
          </Alert>
        )}
      </Paper>

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
                <ModelDesigner schema={studio.schema} />
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
            <Stack sx={{ height: '100%', minHeight: 0 }}>
              <CopilotPanel
                verifiedTemplates={insights.modelSuggestions?.verifiedTemplates ?? []}
                provisionedModels={[]}
                busy={insights.suggesting}
                readOnly
                compact
                insightsProvider={insights.modelSuggestions?.insights?.provider}
              />
              <AiPanel step={studio.selectedStep} relationship={studio.selectedRelationship} />
            </Stack>
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
