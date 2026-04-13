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
  Step,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material';
import { useAuth } from '../../../auth/AuthContext';
import { CopilotPanel } from '../components/CopilotPanel';
import { DataSourceConnector } from '../components/DataSourceConnector';
import { FileSelector } from '../components/FileSelector';
import { Loader } from '../components/Loader';
import { ReportViewer } from '../components/ReportViewer';
import { useInsightsFlow } from '../hooks/useInsightsFlow';

const STEPS = [
  'Connect source',
  'Choose connection',
  'Select file',
  'Fetch data',
  'Generate models',
  'Pick template',
  'View report',
];

function computeActiveStep(params: {
  connectionsCount: number;
  connectionId: string;
  dataFetched: boolean;
  modelsCount: number;
  hasEmbed: boolean;
}): number {
  const { connectionsCount, connectionId, dataFetched, modelsCount, hasEmbed } = params;
  if (hasEmbed) return 6;
  if (modelsCount > 0) return 5;
  if (dataFetched) return 4;
  if (connectionId) return 3;
  if (connectionsCount > 0) return 2;
  return 0;
}

export function InsightsPage() {
  const { user } = useAuth();
  const clientId = user?.clientCode || user?.id;

  const flow = useInsightsFlow(clientId);

  if (!user?.hasAIInsights) {
    return null;
  }

  const busy =
    flow.loaderKind === 'fetch' ||
    flow.loaderKind === 'models' ||
    flow.loaderKind === 'orchestrator' ||
    flow.loaderKind === 'poll';

  const activeStep = computeActiveStep({
    connectionsCount: flow.connections.length,
    connectionId: flow.connectionId,
    dataFetched: flow.dataFetched,
    modelsCount: flow.models.length,
    hasEmbed: !!(flow.report?.embedUrl && flow.report?.reportId),
  });

  const handleConnectionChange = (e: SelectChangeEvent<string>) => {
    flow.setConnectionId(e.target.value);
    flow.setError(null);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Insights
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Connect data, choose a file, and let the service prepare a Power BI report—without loading raw data
        in the browser.
      </Typography>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {flow.error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => flow.setError(null)}>
          {flow.error}
        </Alert>
      )}

      {busy && flow.loaderMessage && <Loader message={flow.loaderMessage} variant="banner" />}

      <Stack direction={{ xs: 'column', md: 'row' }} alignItems="flex-start" spacing={0}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={2}>
                <DataSourceConnector />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button size="small" variant="text" onClick={() => flow.refreshConnections()}>
                    Refresh connections
                  </Button>
                </Stack>
                <FormControl fullWidth size="small" disabled={busy}>
                  <InputLabel id="insights-conn-label">Active connection</InputLabel>
                  <Select
                    labelId="insights-conn-label"
                    label="Active connection"
                    value={flow.connectionId}
                    onChange={handleConnectionChange}
                  >
                    <MenuItem value="">
                      <em>Select a connection</em>
                    </MenuItem>
                    {flow.connections.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name} ({c.type})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <FileSelector
                connectionId={flow.connectionId}
                onFileLoaded={flow.handleFetchData}
                disabled={busy}
              />
              {flow.selectedFile && flow.dataFetched && (
                <Typography variant="caption" color="success.main" display="block" sx={{ mt: 1 }}>
                  Loaded: {flow.selectedFile.name}
                </Typography>
              )}
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                AI report templates
              </Typography>
              <Button
                variant="contained"
                disabled={busy || !flow.dataFetched || !clientId}
                onClick={() => flow.handleGenerateModels()}
              >
                Generate model options
              </Button>
              {!clientId && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Sign in with a client-linked account to generate models.
                </Typography>
              )}
            </Paper>

            {flow.report?.embedUrl && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Report
                </Typography>
                <ReportViewer report={flow.report} />
              </Paper>
            )}
          </Stack>
        </Box>

        <CopilotPanel models={flow.models} onSelectModel={flow.handleSelectModel} busy={busy} />
      </Stack>
    </Box>
  );
}

export default InsightsPage;
