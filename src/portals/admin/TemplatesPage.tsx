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
  TextField,
  Chip,
  Stack,
} from '@mui/material';
import { Upload, Download } from '@mui/icons-material';
import { useRef, useState, useEffect } from 'react';
import { getTemplates, uploadTemplate, downloadTemplate, type Template } from '../../services/templateService';

/** Parses a comma-separated column list into trimmed, non-empty entries. */
const parseColumnList = (value: string): string[] =>
  value
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

const emptyForm = { templateName: '', version: '', industry: '', requiredColumns: '', optionalColumns: '' };

export const TemplatesPage = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const list = await getTemplates();
      setTemplates(list);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load templates', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setForm({ ...emptyForm, templateName: file.name.replace(/\.[^/.]+$/, '') });
    setUploadOpen(true);
    e.target.value = '';
  };

  const handleCancelUpload = () => {
    setUploadOpen(false);
    setPendingFile(null);
    setForm(emptyForm);
  };

  const canSubmit = pendingFile !== null && form.templateName.trim() !== '' && form.version.trim() !== '';

  const handleSubmitUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      await uploadTemplate({
        templateName: form.templateName.trim(),
        version: form.version.trim(),
        industry: form.industry.trim() || undefined,
        requiredColumns: parseColumnList(form.requiredColumns),
        optionalColumns: parseColumnList(form.optionalColumns),
        file: pendingFile,
      });
      setUploadOpen(false);
      setPendingFile(null);
      setForm(emptyForm);
      await loadTemplates();
      setSnackbar({ open: true, message: 'Template uploaded successfully', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to upload template', severity: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (templateId: string) => {
    try {
      await downloadTemplate(templateId);
      setSnackbar({ open: true, message: 'Download started', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Download failed', severity: 'error' });
    }
  };

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : '—');

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Template Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Upload and download templates
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Upload />} onClick={handleUploadClick}>
          Upload template
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pbix"
          style={{ display: 'none' }}
        />
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
                  <TableCell>Template Name</TableCell>
                  <TableCell>Industry</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>Matching columns</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }} color="text.secondary">
                      No templates found
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((t) => (
                    <TableRow key={t.id} hover>
                      <TableCell>{t.name}</TableCell>
                      <TableCell>{t.industry ?? '—'}</TableCell>
                      <TableCell>{t.version ?? '—'}</TableCell>
                      <TableCell>
                        {(t.requiredColumns?.length ?? 0) === 0 && (t.optionalColumns?.length ?? 0) === 0 ? (
                          <Typography variant="caption" color="text.secondary">
                            No columns set — matching will score 0
                          </Typography>
                        ) : (
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {t.requiredColumns?.map((c) => (
                              <Chip key={`req-${c}`} label={c} size="small" />
                            ))}
                            {t.optionalColumns?.map((c) => (
                              <Chip key={`opt-${c}`} label={c} size="small" variant="outlined" />
                            ))}
                          </Stack>
                        )}
                      </TableCell>
                      <TableCell>{t.isActive === false ? 'Inactive' : t.status ?? 'Active'}</TableCell>
                      <TableCell>{formatDate(t.uploadDate ?? t.createdAt)}</TableCell>
                      <TableCell align="right">
                        <Button size="small" startIcon={<Download />} onClick={() => handleDownload(t.id)}>
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={uploadOpen} onClose={uploading ? undefined : handleCancelUpload} maxWidth="sm" fullWidth>
        <DialogTitle>Register template</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {pendingFile?.name} — required and optional columns are what client schemas get scored against when
            matching a report to this template, so they matter as much as the file itself.
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Template name"
              required
              fullWidth
              value={form.templateName}
              onChange={(e) => setForm({ ...form, templateName: e.target.value })}
              disabled={uploading}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Version"
                required
                fullWidth
                placeholder="1.0"
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                disabled={uploading}
              />
              <TextField
                label="Industry"
                fullWidth
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                disabled={uploading}
              />
            </Stack>
            <TextField
              label="Required columns"
              helperText="Comma-separated. Every column a client's schema must have to be considered a match."
              fullWidth
              multiline
              minRows={2}
              value={form.requiredColumns}
              onChange={(e) => setForm({ ...form, requiredColumns: e.target.value })}
              disabled={uploading}
            />
            <TextField
              label="Optional columns"
              helperText="Comma-separated. Boosts match confidence when present but isn't required."
              fullWidth
              multiline
              minRows={2}
              value={form.optionalColumns}
              onChange={(e) => setForm({ ...form, optionalColumns: e.target.value })}
              disabled={uploading}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelUpload} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmitUpload} variant="contained" disabled={!canSubmit || uploading}>
            {uploading ? <CircularProgress size={20} /> : 'Upload'}
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
