import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  ArrowBack,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as PassIcon,
  Warning as WarningIcon,
  Cancel as FailIcon,
  ErrorOutline as ErrorIcon,
} from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReportValidationRun } from '../../hooks/useReportValidationRun';
import {
  getReportValidationRun,
  type ReportValidationCheck,
  type ReportValidationCheckFamily,
  type ReportValidationCheckStatus,
  type ReportValidationRun,
} from '../../api/reportValidationApi';
import { ROUTES } from '../../core/constants';

const CHECK_FAMILY_LABELS: Record<ReportValidationCheckFamily, string> = {
  RenderingHealth: 'Rendering Health',
  DataSanity: 'Data Sanity',
  FilterCorrectness: 'Filter Correctness',
  ExportIntegrity: 'Export Integrity',
};

// Phase 1 populates these two; the other two are reserved so this screen's layout doesn't need
// to change again once they ship.
const PHASE_1_FAMILIES: ReportValidationCheckFamily[] = ['RenderingHealth', 'DataSanity'];
const PHASE_2_FAMILIES: ReportValidationCheckFamily[] = ['FilterCorrectness', 'ExportIntegrity'];

function statusIcon(status: ReportValidationCheckStatus) {
  switch (status) {
    case 'Pass':
      return <PassIcon color="success" fontSize="small" />;
    case 'Warning':
      return <WarningIcon color="warning" fontSize="small" />;
    case 'Error':
      return <ErrorIcon color="disabled" fontSize="small" />;
    case 'Fail':
    default:
      return <FailIcon color="error" fontSize="small" />;
  }
}

function overallBannerColor(overallResult: ReportValidationCheckStatus | null | undefined): 'success' | 'warning' | 'error' | 'info' {
  switch (overallResult) {
    case 'Pass':
      return 'success';
    case 'Warning':
      return 'warning';
    case 'Fail':
    case 'Error':
      return 'error';
    default:
      return 'info';
  }
}

function CheckList({ checks }: { checks: ReportValidationCheck[] }) {
  if (checks.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        No checks reported for this family.
      </Typography>
    );
  }

  return (
    <List dense disablePadding>
      {checks.map((check, idx) => (
        <ListItem key={`${check.checkName}-${idx}`} alignItems="flex-start" sx={{ px: 0 }}>
          <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>{statusIcon(check.status)}</ListItemIcon>
          <ListItemText
            primary={check.checkName}
            secondary={check.detail ?? undefined}
            secondaryTypographyProps={{ sx: { whiteSpace: 'pre-wrap' } }}
          />
        </ListItem>
      ))}
    </List>
  );
}

function CheckFamilySection({ family, run }: { family: ReportValidationCheckFamily; run: ReportValidationRun }) {
  const checks = run.checks.filter((c) => c.checkFamily === family);
  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1" fontWeight={600}>
          {CHECK_FAMILY_LABELS[family]}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <CheckList checks={checks} />
      </AccordionDetails>
    </Accordion>
  );
}

export const ReportValidationDetailPage = () => {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { run: polledRun, isPolling, timedOut } = useReportValidationRun(runId);
  const [settledRun, setSettledRun] = useState<ReportValidationRun | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Once the poller reports a terminal state, fetch once more directly (in case the hook's
  // last poll raced the final save) so the page always reflects the true final result.
  useEffect(() => {
    if (!runId) return;
    if (polledRun?.status === 'Completed' || polledRun?.status === 'Failed') {
      getReportValidationRun(runId)
        .then(setSettledRun)
        .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load report validation run.'));
    }
  }, [runId, polledRun?.status]);

  const run = settledRun ?? polledRun;

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate(ROUTES.CLIENT.REPORT_VALIDATION)} sx={{ mb: 2 }}>
        Back to Report Validation
      </Button>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      {!run && isPolling && (
        <Box display="flex" alignItems="center" gap={2} py={4}>
          <CircularProgress size={24} />
          <Typography color="text.secondary">Starting validation…</Typography>
        </Box>
      )}

      {!run && timedOut && (
        <Alert severity="warning">
          This validation run is taking longer than expected. It may still complete — check back
          on the Report Validation history page shortly.
        </Alert>
      )}

      {run && (
        <>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            {run.templateName ?? 'Report Validation'}
          </Typography>

          {(run.status === 'Pending' || run.status === 'Processing') && (
            <Alert severity="info" icon={<CircularProgress size={18} />} sx={{ mb: 3 }}>
              Validation is running — Data Sanity checks first, then Rendering Health (a full
              browser replay, which takes longer). This page updates automatically.
            </Alert>
          )}

          {run.status === 'Failed' && (
            <Alert severity="error" sx={{ mb: 3 }}>
              This validation run failed to complete{run.errorMessage ? `: ${run.errorMessage}` : '.'}
            </Alert>
          )}

          {run.status === 'Completed' && (
            <Alert severity={overallBannerColor(run.overallResult)} sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                Overall result: {run.overallResult ?? 'Unknown'}
              </Typography>
            </Alert>
          )}

          <Stack spacing={2}>
            {PHASE_1_FAMILIES.map((family) => (
              <CheckFamilySection key={family} family={family} run={run} />
            ))}

            {PHASE_2_FAMILIES.map((family) => (
              <Paper key={family} sx={{ p: 2, opacity: 0.6 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {CHECK_FAMILY_LABELS[family]}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Coming soon.
                </Typography>
              </Paper>
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
};
