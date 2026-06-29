import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Snackbar,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  PictureAsPdf as PdfIcon,
  DataObject as JsonIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  generateBlueprint,
  listBlueprints,
  downloadBlueprintJson,
  downloadBlueprintPdf,
  deleteBlueprint,
  type BlueprintDto,
  type GenerateBlueprintRequest,
} from '../../services/blueprintService';
import { useBlueprintGeneration } from '../../hooks/useBlueprintGeneration';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (d?: string) => (d ? new Date(d).toLocaleString() : '—');

function statusColor(status: string): 'default' | 'warning' | 'success' | 'error' | 'info' {
  if (status === 'Completed' || status === 'active') return 'success';
  if (status === 'Failed') return 'error';
  if (status === 'Processing') return 'info';
  if (status === 'Pending') return 'warning';
  return 'default';
}

// ── Generate form dialog ──────────────────────────────────────────────────────

interface GenerateDialogProps {
  open: boolean;
  tenantId: string;
  clientId: string;
  onClose: () => void;
  onStarted: (generationId: string) => void;
  onError: (msg: string) => void;
}

const emptyForm = {
  industry: '',
  businessCapability: '',
  businessGoal: '',
  businessRequirements: '',
  knowledgePack: '',
};

function GenerateDialog({ open, tenantId, clientId, onClose, onStarted, onError }: GenerateDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setForm(emptyForm);
    onClose();
  };

  const handleSubmit = async () => {
    if (!form.industry.trim() || !form.businessCapability.trim() || !form.businessGoal.trim()) return;
    try {
      setLoading(true);
      const req: GenerateBlueprintRequest = {
        tenantId,
        clientId,
        industry: form.industry.trim(),
        businessCapability: form.businessCapability.trim(),
        businessGoal: form.businessGoal.trim(),
        businessRequirements: form.businessRequirements.trim() || undefined,
        knowledgePack: form.knowledgePack.trim() || undefined,
      };
      const job = await generateBlueprint(req);
      handleClose();
      onStarted(job.generationId);
    } catch {
      onError('Failed to start blueprint generation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const set = (field: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const valid = form.industry.trim() && form.businessCapability.trim() && form.businessGoal.trim();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Generate Blueprint</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Industry" required fullWidth size="small" value={form.industry} onChange={set('industry')} />
          <TextField label="Business Capability" required fullWidth size="small" value={form.businessCapability} onChange={set('businessCapability')} />
          <TextField label="Business Goal" required fullWidth size="small" multiline minRows={2} value={form.businessGoal} onChange={set('businessGoal')} />
          <TextField label="Business Requirements" fullWidth size="small" multiline minRows={3} value={form.businessRequirements} onChange={set('businessRequirements')} />
          <TextField label="Knowledge Pack" fullWidth size="small" value={form.knowledgePack} onChange={set('knowledgePack')} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!valid || loading}>
          {loading ? 'Starting…' : 'Generate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── JSON viewer dialog ─────────────────────────────────────────────────────────

interface JsonViewerProps {
  open: boolean;
  blueprintId: string;
  onClose: () => void;
}

function JsonViewerDialog({ open, blueprintId, onClose }: JsonViewerProps) {
  const [json, setJson] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setJson(null);
        const raw = await downloadBlueprintJson(blueprintId);
        if (!cancelled) {
          try {
            setJson(JSON.stringify(JSON.parse(raw), null, 2));
          } catch {
            setJson(raw);
          }
        }
      } catch {
        if (!cancelled) setJson('// Failed to load JSON');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, blueprintId]);

  const handleCopy = () => {
    if (!json) return;
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blueprint-${blueprintId}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Blueprint JSON</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
        ) : (
          <Box
            component="pre"
            sx={{
              fontFamily: 'monospace',
              fontSize: 13,
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              backgroundColor: 'grey.50',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 2,
              maxHeight: 500,
              overflowY: 'auto',
            }}
          >
            {json ?? ''}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button startIcon={<CopyIcon />} onClick={handleCopy} disabled={!json}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
        <Button startIcon={<DownloadIcon />} onClick={handleDownload} disabled={!json}>
          Download JSON
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Delete confirmation dialog ─────────────────────────────────────────────────

interface DeleteDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}

function DeleteDialog({ open, onCancel, onConfirm, loading }: DeleteDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Blueprint</DialogTitle>
      <DialogContent>
        <Typography>Are you sure you want to delete this blueprint? This action cannot be undone.</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={loading}>
          {loading ? 'Deleting…' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Generation status panel ────────────────────────────────────────────────────

interface GenerationStatusProps {
  generationId: string;
  onCompleted: () => void;
}

function GenerationStatusPanel({ generationId, onCompleted }: GenerationStatusProps) {
  const { job, isPolling, timedOut } = useBlueprintGeneration(generationId);
  const [jsonViewOpen, setJsonViewOpen] = useState(false);
  const completed = job?.status === 'Completed';
  const failed = job?.status === 'Failed';

  useEffect(() => {
    if (completed) onCompleted();
  }, [completed, onCompleted]);

  if (timedOut) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        Generation is taking longer than expected. Check back later.
      </Alert>
    );
  }

  const label = job?.status ?? 'Pending';

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
        <Typography variant="body2" fontWeight={600}>Blueprint Generation</Typography>
        <Chip label={label} color={statusColor(label)} size="small" />
        {isPolling && <CircularProgress size={16} />}
        {job?.confidenceScore != null && (
          <Typography variant="body2" color="text.secondary">
            Confidence: {Math.round(job.confidenceScore * 100)}%
          </Typography>
        )}
        {completed && (
          <>
            <Button size="small" startIcon={<JsonIcon />} onClick={() => setJsonViewOpen(true)}>
              View JSON
            </Button>
            <Button size="small" startIcon={<PdfIcon />} onClick={() => downloadBlueprintPdf(job.blueprintId)}>
              Download PDF
            </Button>
          </>
        )}
      </Stack>

      {(isPolling || job?.status === 'Processing') && (
        <LinearProgress sx={{ mt: 1.5 }} />
      )}

      {job?.warnings && job.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mt: 1.5 }} icon={false}>
          <Typography variant="caption" fontWeight={600}>Warnings</Typography>
          <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
            {job.warnings.map((w, i) => <li key={i}><Typography variant="caption">{w}</Typography></li>)}
          </ul>
        </Alert>
      )}

      {failed && job?.errorMessage && (
        <Alert severity="error" sx={{ mt: 1.5 }}>{job.errorMessage}</Alert>
      )}

      {job?.blueprintId && (
        <JsonViewerDialog open={jsonViewOpen} blueprintId={job.blueprintId} onClose={() => setJsonViewOpen(false)} />
      )}
    </Paper>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

interface BlueprintsPageProps {
  /** Passed directly when embedded inside another page (e.g. ClientDetailsPage). */
  tenantId?: string;
  clientId?: string;
}

export const BlueprintsPage = ({ tenantId: propTenantId, clientId: propClientId }: BlueprintsPageProps = {}) => {
  const params = useParams<{ clientId?: string; tenantId?: string }>();
  const resolvedTenantId = propTenantId ?? params.tenantId ?? '';
  const resolvedClientId = propClientId ?? params.clientId ?? '';

  const [blueprints, setBlueprints] = useState<BlueprintDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [activeGenerationId, setActiveGenerationId] = useState<string | undefined>(undefined);

  const [jsonViewBlueprint, setJsonViewBlueprint] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'success',
  });
  const showSnack = (message: string, severity: 'success' | 'error' | 'info' = 'success') =>
    setSnackbar({ open: true, message, severity });

  const load = async () => {
    if (!resolvedTenantId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await listBlueprints(resolvedTenantId, page + 1, pageSize);
      setBlueprints(result.items);
      setTotalCount(result.totalCount);
    } catch {
      setError('Failed to load blueprints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [resolvedTenantId, page, pageSize]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await deleteBlueprint(deleteTarget);
      setDeleteTarget(null);
      showSnack('Blueprint deleted.');
      load();
    } catch {
      showSnack('Failed to delete blueprint.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>Blueprints</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setGenerateOpen(true)}
          disabled={!resolvedTenantId || !resolvedClientId}
        >
          Generate Blueprint
        </Button>
      </Stack>

      {activeGenerationId && (
        <GenerationStatusPanel
          generationId={activeGenerationId}
          onCompleted={load}
        />
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!resolvedTenantId && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Tenant ID is required to list blueprints. Open this page from a client details view.
        </Alert>
      )}

      <Paper>
        {loading && <LinearProgress />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Industry</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Versions</TableCell>
                <TableCell>Confidence</TableCell>
                <TableCell>Generated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {blueprints.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                      No blueprints found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                blueprints.map((bp) => (
                  <TableRow key={bp.id} hover>
                    <TableCell>{bp.industry}</TableCell>
                    <TableCell>
                      <Chip label={bp.status} color={statusColor(bp.status)} size="small" />
                    </TableCell>
                    <TableCell>{bp.versionCount}</TableCell>
                    <TableCell>
                      {bp.activeVersion?.confidence != null
                        ? `${Math.round(bp.activeVersion.confidence * 100)}%`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {bp.activeVersion?.generatedDate ? fmt(bp.activeVersion.generatedDate) : fmt(bp.createdAt)}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View JSON">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => setJsonViewBlueprint(bp.id)}
                            disabled={!bp.activeVersion?.hasJson}
                          >
                            <JsonIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Download PDF">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => downloadBlueprintPdf(bp.id)}
                            disabled={!bp.activeVersion?.hasPdf}
                          >
                            <PdfIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(bp.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 20, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={pageSize}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
        />
      </Paper>

      <GenerateDialog
        open={generateOpen}
        tenantId={resolvedTenantId}
        clientId={resolvedClientId}
        onClose={() => setGenerateOpen(false)}
        onStarted={(genId) => {
          setActiveGenerationId(genId);
          showSnack("Blueprint generation started — we'll let you know when it's ready.", 'info');
        }}
        onError={(msg) => showSnack(msg, 'error')}
      />

      {jsonViewBlueprint && (
        <JsonViewerDialog
          open={!!jsonViewBlueprint}
          blueprintId={jsonViewBlueprint}
          onClose={() => setJsonViewBlueprint(null)}
        />
      )}

      <DeleteDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
