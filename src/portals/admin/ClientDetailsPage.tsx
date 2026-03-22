import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
} from '@mui/material';
import { ArrowBack, PersonAdd } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getClientById, assignUserToClient, type ClientDetail } from '../../services/clientService';
import { getAdminUsers } from '../../services/adminUserService';
import { ROUTES } from '../../core/constants';

export const ClientDetailsPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<{ id: string; email: string; firstName: string; lastName: string }[]>([]);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getClientById(clientId);
        if (!cancelled) setClient(data);
      } catch {
        if (!cancelled) setError('Failed to load client details');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  useEffect(() => {
    if (!clientId) return;
    getAdminUsers({ pageSize: 100 }).then((r) => setUsers(r.items));
  }, [clientId]);

  const handleAssignUser = async () => {
    if (!clientId || !assignUserId) return;
    try {
      setAssignLoading(true);
      await assignUserToClient(clientId, assignUserId);
      setAssignUserId('');
      setSnackbar({ open: true, message: 'User assigned to client', severity: 'success' });
      const data = await getClientById(clientId);
      setClient(data);
    } catch {
      setSnackbar({ open: true, message: 'Failed to assign user', severity: 'error' });
    } finally {
      setAssignLoading(false);
    }
  };

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleString() : '—');

  if (!clientId) {
    return (
      <Box>
        <Typography color="error">Missing client ID</Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !client) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(ROUTES.ADMIN.CLIENTS)} sx={{ mb: 2 }}>
          Back to Clients
        </Button>
        <Alert severity="error">{error ?? 'Client not found'}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate(ROUTES.ADMIN.CLIENTS)} sx={{ mb: 2 }}>
        Back to Clients
      </Button>

      <Typography variant="h4" fontWeight={600} gutterBottom>
        {client.name}
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Assign user to client
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 3 }}>
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel>User</InputLabel>
            <Select value={assignUserId} label="User" onChange={(e) => setAssignUserId(e.target.value)}>
              <MenuItem value="">Select user</MenuItem>
              {users.map((u) => (
                <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<PersonAdd />} onClick={handleAssignUser} disabled={!assignUserId || assignLoading}>
            {assignLoading ? 'Assigning...' : 'Assign'}
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Client Information
        </Typography>
        <Box sx={{ display: 'grid', gap: 1 }}>
          <Typography variant="body2">
            <strong>Industry:</strong> {client.industry ?? '—'}
          </Typography>
          <Typography variant="body2">
            <strong>Status:</strong> {client.status ?? '—'}
          </Typography>
          <Typography variant="body2">
            <strong>Blob folder path:</strong> {client.blobFolderPath ?? '—'}
          </Typography>
          <Typography variant="body2">
            <strong>Template assigned:</strong> {client.templateAssigned ?? client.templateVersion ?? '—'}
          </Typography>
          <Typography variant="body2">
            <strong>Created:</strong> {formatDate(client.createdAt)}
          </Typography>
        </Box>
      </Paper>

      {client.uploads && client.uploads.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Uploads
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>File Name</TableCell>
                  <TableCell>Uploaded</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {client.uploads.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.fileName}</TableCell>
                    <TableCell>{formatDate(u.uploadedAt)}</TableCell>
                    <TableCell>{u.status ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {client.validationErrors && client.validationErrors.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Validation Errors
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Message</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {client.validationErrors.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.message}</TableCell>
                    <TableCell>{formatDate(e.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {client.processingJobs && client.processingJobs.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Processing Jobs
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>File Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {client.processingJobs.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell>{j.fileName}</TableCell>
                    <TableCell>{j.status}</TableCell>
                    <TableCell>{formatDate(j.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {(!client.uploads?.length && !client.validationErrors?.length && !client.processingJobs?.length) && (
        <Paper sx={{ p: 3 }}>
          <Typography color="text.secondary">
            No uploads, validation errors, or processing jobs to display.
          </Typography>
        </Paper>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
