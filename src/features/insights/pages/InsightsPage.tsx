import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  TextField,
  type SelectChangeEvent,
  Stack,
  Typography,
} from '@mui/material';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthContext';
import { ClientViewContext } from '../../../layouts/client/ClientViewContext';
import {
  getAccountantClients,
  getDefaultEmbedPeriod,
  getEmbedTokenForInsightsWithTemplateFallback,
  getEmbedTokenErrorMessage,
  type AccountantClient,
  type EmbedTokenResponse,
} from '../../../services/reportService';
import { PowerBIEmbed } from '../../../portals/client/PowerBIEmbed';
import { BlobSampleTable } from '../components/BlobSampleTable';
import { CopilotPanel } from '../components/CopilotPanel';
import { Loader } from '../components/Loader';
import { useSimpleInsights } from '../hooks/useSimpleInsights';
import { ProposedModelCard } from '../components/ProposedModelCard';
import {
  generateCanonicalPlansFromBlob,
  formatInsightsApiError,
  matchTemplatesFromBlob,
  uploadAccountingCreatedFile,
} from '../services/insightService';
import type { CanonicalPlansResponse } from '../types';
import { PlanCard } from '../components/canonical/PlanCard';
import { SemanticModelPreview } from '../components/canonical/SemanticModelPreview';
import { DashboardPreview } from '../components/canonical/DashboardPreview';
import { ValidationPanel } from '../components/canonical/ValidationPanel';

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

export function InsightsPage() {
  const { user, hasAIInsights } = useAuth();
  const clientView = useContext(ClientViewContext);
  const location = useLocation();
  const navigate = useNavigate();
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

  // Same pattern as accountant Reports: deep-link with state.clientCode from Clients list
  useEffect(() => {
    const st = location.state as { clientCode?: string } | null;
    if (st?.clientCode && isAccountant) {
      setAccountantClientCode(st.clientCode);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [isAccountant, location.state, location.pathname, navigate]);

  const clientId = user?.clientCode || user?.id;
  const reportClientCode = useMemo(
    () =>
      resolveReportClientCodeForInsights({
        user,
        clientView,
        accountantSelectedClient: accountantClientCode,
      }),
    [user, clientView, accountantClientCode]
  );

  const flow = useSimpleInsights(
    clientId,
    reportClientCode,
    explicitClientOnly,
    useSelectedClientForApis
  );

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const generationCost = 1_000;
  const [tab, setTab] = useState<'models' | 'canonical'>('models');

  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'PredictScenarios' | 'ScenarioFocused'>('PredictScenarios');
  const [canonicalLoading, setCanonicalLoading] = useState(false);
  const [canonicalError, setCanonicalError] = useState<string | null>(null);
  const [canonical, setCanonical] = useState<CanonicalPlansResponse | null>(null);

  const [embedToken, setEmbedToken] = useState<EmbedTokenResponse | null>(null);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [embedError, setEmbedError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadOk, setUploadOk] = useState<string | null>(null);
  const [quickTemplateMatches, setQuickTemplateMatches] = useState<
    { template: { templateId: string; templateName?: string; industry?: string; version?: string }; matchScore: number; matchReasons: string[] }[]
  >([]);

  const embedPeriod = useMemo(() => {
    const p = flow.activeReport?.periods;
    if (p && p.length > 0) return p[0];
    return getDefaultEmbedPeriod();
  }, [flow.activeReport?.periods]);

  const selectedTemplateLabel = useMemo(() => {
    const list = quickTemplateMatches.length > 0 ? quickTemplateMatches : flow.modelSuggestions?.verifiedTemplates ?? [];
    const m = list.find((x) => x.template.templateId === selectedTemplateId);
    if (m?.template.templateName) return m.template.templateName;
    if (m?.template.industry) return `${selectedTemplateId} (${m.template.industry})`;
    return selectedTemplateId || '';
  }, [flow.modelSuggestions?.verifiedTemplates, quickTemplateMatches, selectedTemplateId]);

  useEffect(() => {
    setSelectedTemplateId('');
    setQuickTemplateMatches([]);
  }, [reportClientCode, flow.modelSuggestions?.verifiedTemplates?.length]);

  useEffect(() => {
    if (!selectedTemplateId || !reportClientCode || !flow.hasActiveReport) {
      setEmbedToken(null);
      setEmbedError(null);
      setEmbedLoading(false);
      return;
    }
    let cancelled = false;
    setEmbedLoading(true);
    setEmbedError(null);
    setEmbedToken(null);
    void (async () => {
      try {
        const token = await getEmbedTokenForInsightsWithTemplateFallback({
          templateId: selectedTemplateId,
          period: embedPeriod,
          clientCode: reportClientCode,
          useSelectedClient: useSelectedClientForApis || undefined,
        });
        if (!cancelled) {
          setEmbedToken(token);
          setEmbedError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setEmbedToken(null);
          setEmbedError(getEmbedTokenErrorMessage(e));
        }
      } finally {
        if (!cancelled) setEmbedLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    selectedTemplateId,
    reportClientCode,
    flow.hasActiveReport,
    embedPeriod,
    useSelectedClientForApis,
  ]);

  const handleAccountantClientChange = (e: SelectChangeEvent<string>) => {
    setAccountantClientCode(e.target.value);
  };

  if (!hasAIInsights) {
    return null;
  }

  const needsClientPick = explicitClientOnly && !reportClientCode;
  const showNoReportYet =
    !flow.loading && !flow.hasActiveReport && !flow.error && !needsClientPick;
  const sampleLoadedOk = !!flow.sample && !flow.sampleError;
  const canGenerate =
    sampleLoadedOk &&
    !!flow.resolvedBlob?.clientId &&
    !!flow.resolvedBlob?.blobPath &&
    !flow.suggesting;

  const canUpload =
    !!reportClientCode &&
    !needsClientPick &&
    !flow.loading &&
    flow.hasActiveReport &&
    !uploading;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Insights
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Read-only data sample (up to 100 rows) from the report blob, with template ideas in Copilot. For
        accounting firms, pick the same client as in Reports so paths match the <code>accounting/created</code>{' '}
        folder on the server.
      </Typography>

      {isAccountant && (
        <FormControl fullWidth size="small" sx={{ maxWidth: 480, mb: 2 }}>
          <InputLabel id="insights-acct-client-label">Client (report folder)</InputLabel>
          <Select
            labelId="insights-acct-client-label"
            label="Client (report folder)"
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

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2 }}
      >
        <Tab value="models" label="Template suggestions" />
        <Tab value="canonical" label="Canonical Plans (Beta)" />
      </Tabs>

      {flow.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {flow.error}
        </Alert>
      )}

      {flow.loading && <Loader message="Loading insights…" variant="banner" />}

      {needsClientPick && !flow.loading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Select a client to load insights. The API path uses the same <code>clientCode</code> as Reports (e.g.{' '}
          <code>GET /api/reports/available/YourClientCode?useSelectedClient=true</code> for firm flows), not a random
          first client from the list.
        </Alert>
      )}

      {showNoReportYet && (
        <Alert severity="info" sx={{ mb: 2 }}>
          There is no active report for this client yet. Open Reports to configure or generate a report, then
          return here.
        </Alert>
      )}

      {flow.sampleError && flow.hasActiveReport && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {flow.sampleError}
        </Alert>
      )}

      {flow.suggestionsError && flow.hasActiveReport && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {flow.suggestionsError}
        </Alert>
      )}

      {!flow.loading && flow.hasActiveReport && tab === 'models' && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
          <Box sx={{ width: { md: 300 }, flexShrink: 0, minWidth: 0 }}>
            <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Data sample (read-only)
              </Typography>
              {flow.activeReport && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Client: {flow.activeReport.clientCode}
                </Typography>
              )}
              <BlobSampleTable data={flow.sample} error={flow.sampleError} maxHeight={200} />

              {uploadError && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  {uploadError}
                </Alert>
              )}
              {uploadOk && (
                <Alert severity="success" sx={{ mt: 1 }}>
                  {uploadOk}
                </Alert>
              )}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
                <Button
                  variant="outlined"
                  disabled={!canUpload}
                  component="label"
                >
                  {uploading ? 'Uploading…' : 'Upload Excel/CSV'}
                  <input
                    hidden
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      // allow uploading the same file again
                      e.currentTarget.value = '';
                      if (!f || !reportClientCode) return;
                      setUploading(true);
                      setUploadError(null);
                      setUploadOk(null);
                      try {
                        const res = await uploadAccountingCreatedFile({
                          file: f,
                          clientCode: reportClientCode,
                          useSelectedClient: useSelectedClientForApis || undefined,
                        });
                        setUploadOk(`Uploaded to report storage: ${res.blobPath}`);
                        try {
                          const matches = await matchTemplatesFromBlob({
                            clientCode: reportClientCode,
                            blobPath: res.blobPath,
                            maxRows: 100,
                            useSelectedClient: useSelectedClientForApis || undefined,
                          });
                          setQuickTemplateMatches(matches);
                        } catch {
                          // Non-fatal: user can still click Generate AI Insights to populate Copilot.
                          setQuickTemplateMatches([]);
                        }
                        await flow.refresh();
                      } catch (err) {
                        setUploadError(formatInsightsApiError(err));
                      } finally {
                        setUploading(false);
                      }
                    }}
                  />
                </Button>
                <Button
                  variant="contained"
                  disabled={!canGenerate}
                  onClick={async () => {
                    if (!canGenerate) {
                      return;
                    }
                    await flow.generateAiInsights();
                  }}
                >
                  {flow.suggesting
                    ? 'Generating…'
                    : `Generate AI Insights (${generationCost.toLocaleString()} credits)`}
                </Button>
              </Stack>

              {flow.modelSuggestions?.proposedModels?.length ? (
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Dashboards possible
                  </Typography>
                  <Stack spacing={1}>
                    {flow.modelSuggestions.proposedModels.map((m, idx) => (
                      <ProposedModelCard key={m.id ?? `${m.templateId ?? 'm'}-${idx}`} model={m} />
                    ))}
                  </Stack>
                </Box>
              ) : null}
            </Paper>
          </Box>

          <Box
            sx={{
              width: { xs: '100%', md: 300 },
              flexShrink: 0,
              borderLeft: { md: 1 },
              borderColor: 'divider',
              pl: { md: 2 },
            }}
          >
            <CopilotPanel
              verifiedTemplates={quickTemplateMatches.length > 0 ? quickTemplateMatches : flow.modelSuggestions?.verifiedTemplates ?? []}
              provisionedModels={[]}
              busy={flow.suggesting}
              selectable
              compact
              insightsProvider={flow.modelSuggestions?.insights?.provider}
              selectedTemplateId={selectedTemplateId}
              onSelectTemplate={(m) => setSelectedTemplateId(m.template.templateId)}
            />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, minHeight: 420, display: 'flex', flexDirection: 'column' }}>
            <Paper variant="outlined" sx={{ p: 1.5, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 400 }}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Live report
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                {selectedTemplateId
                  ? selectedTemplateLabel || selectedTemplateId
                  : 'Select a Copilot template to load the embedded Power BI report.'}
              </Typography>
              {embedLoading && (
                <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress size={32} />
                </Box>
              )}
              {embedError && !embedLoading && (
                <Alert severity="info" sx={{ mb: 1 }}>
                  {embedError}
                </Alert>
              )}
              {!embedLoading && !embedError && embedToken && (
                <Box sx={{ flex: 1, minHeight: 400, width: '100%' }}>
                  <PowerBIEmbed
                    accessToken={embedToken.accessToken}
                    embedUrl={embedToken.embedUrl}
                    reportId={embedToken.reportId}
                    periodValues={[embedPeriod]}
                  />
                </Box>
              )}
            </Paper>
          </Box>
        </Stack>
      )}

      {!flow.loading && flow.hasActiveReport && tab === 'canonical' && (
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={800} gutterBottom>
              Canonical Plans (Beta)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Generates validated dashboard plans from the report blob.
            </Typography>

            <Stack spacing={1.5}>
              <TextField
                label="Ask Copilot (optional)"
                placeholder="e.g. Predict scenarios for next month based on sales trends"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                fullWidth
                multiline
                minRows={2}
              />

              <FormControl size="small" sx={{ maxWidth: 320 }}>
                <InputLabel id="plans-mode">Mode</InputLabel>
                <Select
                  labelId="plans-mode"
                  label="Mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as typeof mode)}
                >
                  <MenuItem value="PredictScenarios">PredictScenarios</MenuItem>
                  <MenuItem value="ScenarioFocused">ScenarioFocused</MenuItem>
                </Select>
              </FormControl>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                <Button
                  variant="contained"
                  disabled={!reportClientCode || canonicalLoading}
                  onClick={async () => {
                    if (!reportClientCode) return;
                    setCanonicalLoading(true);
                    setCanonicalError(null);
                    setCanonical(null);
                    try {
                      const res = await generateCanonicalPlansFromBlob({
                        clientCode: reportClientCode,
                        blobPath: '',
                        maxRows: 100,
                        userPrompt: prompt,
                        useSelectedClient: true,
                        mode: prompt.trim() ? 'ScenarioFocused' : mode,
                      });
                      setCanonical(res);
                    } catch (e) {
                      setCanonicalError(formatInsightsApiError(e));
                    } finally {
                      setCanonicalLoading(false);
                    }
                  }}
                >
                  {canonicalLoading ? 'Generating…' : 'Generate AI Insights'}
                </Button>
                <Typography variant="caption" color="text.secondary">
                  One POST to <code>/api/insights-engine/plans/generate-from-blob</code>
                </Typography>
              </Stack>
            </Stack>
          </Paper>

          {canonicalError && (
            <Alert severity="error">{canonicalError}</Alert>
          )}

          {canonical && (
            <>
              <ValidationPanel validation={canonical.validation} />

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight={800} gutterBottom>
                  Summary
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Provider: {canonical.provider || '—'}
                </Typography>
                <Typography variant="body1">{canonical.summary}</Typography>
              </Paper>

              <Stack spacing={2}>
                {canonical.plans.map((p) => (
                  <Stack key={p.templateId} spacing={1.5}>
                    <PlanCard plan={p} />
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <SemanticModelPreview model={p.semanticModel} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <DashboardPreview dashboard={p.dashboard} />
                      </Box>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </>
          )}
        </Stack>
      )}
    </Box>
  );
}

export default InsightsPage;
