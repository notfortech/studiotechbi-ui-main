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
} from '@mui/material';
import { Upload, Download } from '@mui/icons-material';
import { useRef, useState, useEffect } from 'react';
import { getTemplates, uploadTemplate, downloadTemplate, type Template } from '../../services/templateService';

export const TemplatesPage = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadOpen(true);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await uploadTemplate(formData);
      setUploadOpen(false);
      await loadTemplates();
      setSnackbar({ open: true, message: 'Template uploaded successfully', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to upload template', severity: 'error' });
    } finally {
      setUploading(false);
      e.target.value = '';
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
          accept=".xlsx,.xls"
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
                  <TableCell>Status</TableCell>
                  <TableCell>Created Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }} color="text.secondary">
                      No templates found
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((t) => (
                    <TableRow key={t.id} hover>
                      <TableCell>{t.name}</TableCell>
                      <TableCell>{t.industry ?? '—'}</TableCell>
                      <TableCell>{t.version ?? '—'}</TableCell>
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

      <Dialog open={uploadOpen} onClose={() => {}}>
        <DialogTitle>Uploading template</DialogTitle>
        <DialogContent>
          {uploading ? <CircularProgress /> : 'Upload complete.'}
        </DialogContent>
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
