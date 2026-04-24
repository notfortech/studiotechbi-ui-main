import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  type SelectChangeEvent,
  Stack,
  Typography,
} from '@mui/material';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthContext';
import { ClientViewContext } from '../../../layouts/client/ClientViewContext';
import { ROUTES } from '../../../core/constants';
import { getAccountantClients, type AccountantClient } from '../../../services/reportService';
import { BlobSampleTable } from '../components/BlobSampleTable';
import { CopilotPanel } from '../components/CopilotPanel';
import { Loader } from '../components/Loader';
import { useSimpleInsights } from '../hooks/useSimpleInsights';
import { ProposedModelCard } from '../components/ProposedModelCard';

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

  useEffect(() => {
    setSelectedTemplateId('');
  }, [reportClientCode, flow.modelSuggestions?.verifiedTemplates?.length]);

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

      {!flow.loading && flow.hasActiveReport && (
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems="flex-start" spacing={0}>
          <Box sx={{ flex: 1, minWidth: 0, pr: { md: 0 } }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Data sample (read-only)
              </Typography>
              {flow.activeReport && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  Client: {flow.activeReport.clientCode}
                </Typography>
              )}
              <BlobSampleTable data={flow.sample} error={flow.sampleError} />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
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
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Dashboards possible
                  </Typography>
                  <Stack spacing={1.5}>
                    {flow.modelSuggestions.proposedModels.map((m, idx) => (
                      <ProposedModelCard key={m.id ?? `${m.templateId ?? 'm'}-${idx}`} model={m} />
                    ))}
                  </Stack>
                </Box>
              ) : null}
            </Paper>
          </Box>

          <CopilotPanel
            verifiedTemplates={flow.modelSuggestions?.verifiedTemplates ?? []}
            provisionedModels={[]}
            busy={flow.suggesting}
            selectable
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={(m) => setSelectedTemplateId(m.template.templateId)}
          />
        </Stack>
      )}
    </Box>
  );
}

export default InsightsPage;
