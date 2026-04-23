import { Alert, Box, Paper, Stack, Typography } from '@mui/material';
import { useContext, useMemo } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import { ClientViewContext } from '../../../layouts/client/ClientViewContext';
import { BlobSampleTable } from '../components/BlobSampleTable';
import { CopilotPanel } from '../components/CopilotPanel';
import { Loader } from '../components/Loader';
import { useSimpleInsights } from '../hooks/useSimpleInsights';

function resolveReportClientCode(
  user: { role?: string; clientCode?: string; userType?: number } | null,
  clientView: { accountingFirmMode?: boolean; selectedClientCode?: string } | undefined
): string | undefined {
  if (!user) return undefined;
  const accounting =
    user.role === 'client' && clientView?.accountingFirmMode && user.userType !== 0;
  if (accounting && clientView?.selectedClientCode) {
    return clientView.selectedClientCode;
  }
  return user.clientCode;
}

export function InsightsPage() {
  const { user, hasAIInsights } = useAuth();
  const clientView = useContext(ClientViewContext);
  const clientId = user?.clientCode || user?.id;
  const reportClientCode = useMemo(
    () => resolveReportClientCode(user, clientView),
    [user, clientView]
  );
  const flow = useSimpleInsights(clientId, reportClientCode);

  if (!hasAIInsights) {
    return null;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Insights
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        When you have an active report, a read-only sample of the data (up to 100 rows) is shown with Copilot
        suggestions for possible dashboard templates.
      </Typography>

      {flow.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {flow.error}
        </Alert>
      )}

      {flow.loading && <Loader message="Loading insights…" variant="banner" />}

      {!flow.loading && !flow.hasActiveReport && !flow.error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          There is no active report for your account yet. Open Reports to configure or generate a report; then
          return here to see a data sample and template ideas.
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
            </Paper>
          </Box>

          <CopilotPanel
            verifiedTemplates={flow.suggestions?.verifiedTemplates ?? []}
            provisionedModels={[]}
            readOnly
            busy={false}
          />
        </Stack>
      )}
    </Box>
  );
}

export default InsightsPage;
