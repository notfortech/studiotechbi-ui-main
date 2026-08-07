import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  TextField,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Sync as SyncIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  Palette as PaletteIcon,
} from '@mui/icons-material';
import { useRef, useState, useEffect } from 'react';
import {
  listHtmlTemplates,
  uploadHtmlTemplateBatch,
  deleteHtmlTemplate,
  forceHtmlTemplateSyncNow,
  getHtmlTemplateManifest,
  updateHtmlTemplateManifest,
  type HtmlTemplateSummary,
  type HtmlTemplateUploadResult,
} from '../../services/htmlTemplateService';

type SnackbarState = { open: boolean; message: string; severity: 'success' | 'error' | 'info' };

const statusColor = (status: HtmlTemplateUploadResult['status']) =>
  status === 'Created' ? 'success' : status === 'Updated' ? 'info' : 'error';

export const HtmlTemplatesPage = () => {
  const [templates, setTemplates] = useState<HtmlTemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'success' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload result dialog
  const [uploadResults, setUploadResults] = useState<HtmlTemplateUploadResult[] | null>(null);

  // Delete confirmation
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Manifest editor
  const [editingId, setEditingId] = useState<string | null>(null);
  const [manifestText, setManifestText] = useState('');
  const [manifestLoading, setManifestLoading] = useState(false);
  const [manifestSaving, setManifestSaving] = useState(false);
  const [manifestClientError, setManifestClientError] = useState<string | null>(null);
  const [manifestServerResult, setManifestServerResult] = useState<HtmlTemplateUploadResult | null>(null);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const list = await listHtmlTemplates();
      setTemplates(list);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load HTML templates', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const response = await uploadHtmlTemplateBatch(file);
      setUploadResults(response.results);
      await loadTemplates();
      setSnackbar({
        open: true,
        message: `Upload complete — ${response.created} created, ${response.updated} updated, ${response.failed} failed.`,
        severity: response.failed > 0 ? 'error' : 'success',
      });
    } catch {
      setSnackbar({ open: true, message: 'Upload failed — the zip could not be processed.', severity: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const { syncedCount } = await forceHtmlTemplateSyncNow();
      setSnackbar({ open: true, message: `Sync complete — ${syncedCount} template(s) are now live for matching.`, severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Sync failed — templates will still pick up on the next scheduled cycle.', severity: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      await deleteHtmlTemplate(pendingDeleteId);
      setPendingDeleteId(null);
      await loadTemplates();
      setSnackbar({ open: true, message: 'Template unlisted — its files remain in storage.', severity: 'success' });
    } catch (err) {
      // A 404 means the id was already gone from index.json (stale row in this list, or a
      // previous delete attempt actually succeeded) rather than a genuine failure -- refresh so
      // the table reflects reality instead of leaving the client to guess why nothing changed.
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 404) {
        setPendingDeleteId(null);
        await loadTemplates();
        setSnackbar({
          open: true,
          message: 'That template was already unlisted — refreshed the list.',
          severity: 'info',
        });
      } else {
        setSnackbar({ open: true, message: 'Failed to delete template', severity: 'error' });
      }
    } finally {
      setDeleting(false);
    }
  };

  const openManifestEditor = async (id: string) => {
    setEditingId(id);
    setManifestText('');
    setManifestClientError(null);
    setManifestServerResult(null);
    setManifestLoading(true);
    try {
      const { manifestJson } = await getHtmlTemplateManifest(id);
      setManifestText(manifestJson);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load manifest', severity: 'error' });
      setEditingId(null);
    } finally {
      setManifestLoading(false);
    }
  };

  const closeManifestEditor = () => {
    setEditingId(null);
    setManifestText('');
    setManifestClientError(null);
    setManifestServerResult(null);
  };

  const handleValidateManifest = () => {
    try {
      JSON.parse(manifestText);
      setManifestClientError(null);
      setSnackbar({ open: true, message: 'Valid JSON syntax — Save will run the full schema check.', severity: 'info' });
    } catch (err) {
      setManifestClientError(err instanceof Error ? err.message : 'Invalid JSON.');
    }
  };

  const handleSaveManifest = async () => {
    if (!editingId) return;
    try {
      JSON.parse(manifestText);
    } catch (err) {
      setManifestClientError(err instanceof Error ? err.message : 'Invalid JSON.');
      return;
    }

    setManifestSaving(true);
    setManifestClientError(null);
    setManifestServerResult(null);
    try {
      const result = await updateHtmlTemplateManifest(editingId, manifestText);
      setManifestServerResult(result);
      if (result.status === 'Updated') {
        setSnackbar({ open: true, message: 'Manifest saved — already live, no wait needed.', severity: 'success' });
        await loadTemplates();
        setTimeout(closeManifestEditor, 800);
      }
    } catch {
      setSnackbar({ open: true, message: 'Failed to save manifest', severity: 'error' });
    } finally {
      setManifestSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Interactive Report Templates
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Upload, edit, and retire the HTML report templates the AI-assisted Report Generator matches against.
            Separate from the Power BI (.pbix) templates managed on the Templates page.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Tooltip title="Runs the background sync immediately instead of waiting up to 5 minutes">
            <span>
              <Button variant="outlined" startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />} onClick={handleSyncNow} disabled={syncing}>
                Sync Now
              </Button>
            </span>
          </Tooltip>
          <Button variant="contained" startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <UploadIcon />} onClick={handleUploadClick} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload Templates (.zip)'}
          </Button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".zip" style={{ display: 'none' }} />
        </Stack>
      </Box>

      <Paper sx={{ overflow: 'hidden' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Id</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Industry</TableCell>
                  <TableCell>Required Columns</TableCell>
                  <TableCell>Optional Columns</TableCell>
                  <TableCell align="center">Extras</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }} color="text.secondary">
                      No HTML templates found — upload a .zip to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((t) => (
                    <TableRow key={t.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {t.id}
                        </Typography>
                        {t.hasError && (
                          <Typography variant="caption" color="error">
                            {t.errorMessage ?? 'This template has a problem — check its manifest.'}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{t.name}</TableCell>
                      <TableCell>{t.industry || '—'}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {t.requiredColumns.length === 0 ? (
                            <Typography variant="caption" color="text.secondary">
                              None set
                            </Typography>
                          ) : (
                            t.requiredColumns.map((c) => <Chip key={`req-${c}`} label={c} size="small" />)
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {t.optionalColumns.map((c) => (
                            <Chip key={`opt-${c}`} label={c} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          {t.hasPreview && (
                            <Tooltip title="Has a preview image">
                              <ImageIcon fontSize="small" color="action" />
                            </Tooltip>
                          )}
                          {t.hasThemeSlots && (
                            <Tooltip title="Supports the theme colour picker">
                              <PaletteIcon fontSize="small" color="action" />
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit manifest.json">
                          <IconButton size="small" onClick={() => openManifestEditor(t.id)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete (unlist — files are kept)">
                          <IconButton size="small" onClick={() => setPendingDeleteId(t.id)}>
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
        )}
      </Paper>

      {/* Upload result dialog */}
      <Dialog open={uploadResults !== null} onClose={() => setUploadResults(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload results</DialogTitle>
        <DialogContent>
          <List dense>
            {uploadResults?.map((r, i) => (
              <Box key={`${r.templateId}-${i}`}>
                <ListItem alignItems="flex-start" disableGutters>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" fontFamily="monospace">
                          {r.templateId}
                        </Typography>
                        <Chip label={r.status} size="small" color={statusColor(r.status)} />
                      </Stack>
                    }
                    secondary={
                      <>
                        {r.errors.map((e, ei) => (
                          <Typography key={ei} variant="caption" color="error" display="block">
                            {e}
                          </Typography>
                        ))}
                        {r.warnings.map((w, wi) => (
                          <Typography key={wi} variant="caption" color="warning.main" display="block">
                            {w}
                          </Typography>
                        ))}
                      </>
                    }
                  />
                </ListItem>
                {i < uploadResults.length - 1 && <Divider component="li" />}
              </Box>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadResults(null)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={pendingDeleteId !== null} onClose={deleting ? undefined : () => setPendingDeleteId(null)}>
        <DialogTitle>Delete template?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            <strong>{pendingDeleteId}</strong> will be removed from matching immediately. Its files stay in blob
            storage — this can be undone by re-uploading the same zip.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDeleteId(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirmed} color="error" variant="contained" disabled={deleting}>
            {deleting ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manifest editor */}
      <Dialog open={editingId !== null} onClose={manifestSaving ? undefined : closeManifestEditor} maxWidth="md" fullWidth>
        <DialogTitle>Edit manifest — {editingId}</DialogTitle>
        <DialogContent>
          {manifestLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Raw manifest.json. Saving re-validates against the same rules as a fresh upload and, only if it
                passes, overwrites the live file — chrome.html is untouched. The "id" field must stay unchanged;
                renaming a template means deleting it and uploading it again under the new id.
              </Typography>
              <TextField
                value={manifestText}
                onChange={(e) => {
                  setManifestText(e.target.value);
                  setManifestClientError(null);
                  setManifestServerResult(null);
                }}
                multiline
                minRows={16}
                maxRows={28}
                fullWidth
                disabled={manifestSaving}
                sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 13 } }}
              />
              {manifestClientError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  Not valid JSON: {manifestClientError}
                </Alert>
              )}
              {manifestServerResult && manifestServerResult.status === 'Failed' && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    Save rejected — the live file was not changed.
                  </Typography>
                  {manifestServerResult.errors.map((e, i) => (
                    <Typography key={i} variant="body2">
                      • {e}
                    </Typography>
                  ))}
                </Alert>
              )}
              {manifestServerResult && manifestServerResult.warnings.length > 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  {manifestServerResult.warnings.map((w, i) => (
                    <Typography key={i} variant="body2">
                      • {w}
                    </Typography>
                  ))}
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeManifestEditor} disabled={manifestSaving}>
            Cancel
          </Button>
          <Button onClick={handleValidateManifest} disabled={manifestSaving || manifestLoading}>
            Validate
          </Button>
          <Button onClick={handleSaveManifest} variant="contained" disabled={manifestSaving || manifestLoading}>
            {manifestSaving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

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
