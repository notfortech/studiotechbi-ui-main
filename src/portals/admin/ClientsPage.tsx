import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Add, Edit, Block, Visibility, Delete } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  getClients,
  createClient,
  updateClient,
  disableClient,
  deleteClient,
  type Client,
  type CreateClientBody,
} from '../../services/clientService';
import { ROUTES } from '../../core/constants';

export const ClientsPage = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState<CreateClientBody>({ clientCode: '', name: '', industry: '', templateVersion: '' });

  const loadClients = async () => {
    try {
      setLoading(true);
      const list = await getClients();
      setClients(list);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load clients', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleCreateOpen = () => {
    setForm({ name: '', industry: '', templateVersion: '' });
    setCreateOpen(true);
  };

  const handleCreateSubmit = async () => {
    if (!form.name?.trim()) {
      setSnackbar({ open: true, message: 'Client name is required', severity: 'error' });
      return;
    }
    try {
      setFormLoading(true);
      await createClient({
        name: form.name.trim(),
        industry: form.industry?.trim() || undefined,
        templateVersion: form.templateVersion?.trim() || undefined,
      });
      setCreateOpen(false);
      await loadClients();
      setSnackbar({ open: true, message: 'Client created successfully', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to create client', severity: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditOpen = (client: Client) => {
    setSelectedClient(client);
    setForm({
      name: client.name,
      industry: client.industry ?? '',
      templateVersion: client.templateVersion ?? '',
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedClient || !form.name?.trim()) return;
    try {
      setFormLoading(true);
      await updateClient(selectedClient.id, {
        name: form.name.trim(),
        industry: form.industry?.trim() || undefined,
        templateVersion: form.templateVersion?.trim() || undefined,
      });
      setEditOpen(false);
      setSelectedClient(null);
      await loadClients();
      setSnackbar({ open: true, message: 'Client updated successfully', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to update client', severity: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDisableClick = (client: Client) => {
    setSelectedClient(client);
    setDisableConfirmOpen(true);
  };

  const handleDisableConfirm = async () => {
    if (!selectedClient) return;
    try {
      setFormLoading(true);
      await disableClient(selectedClient.id);
      setDisableConfirmOpen(false);
      setSelectedClient(null);
      await loadClients();
      setSnackbar({ open: true, message: 'Client disabled', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to disable client', severity: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (client: Client) => {
    setSelectedClient(client);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedClient) return;
    try {
      setFormLoading(true);
      await deleteClient(selectedClient.id);
      setDeleteConfirmOpen(false);
      setSelectedClient(null);
      await loadClients();
      setSnackbar({ open: true, message: 'Client deleted', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to delete client', severity: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleViewDetails = (client: Client) => {
    navigate(`${ROUTES.ADMIN.CLIENTS}/${client.id}`);
  };

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : '—');

  const columns: GridColDef<Client>[] = [
    { field: 'name', headerName: 'Client Name', flex: 1, minWidth: 180 },
    { field: 'industry', headerName: 'Industry', flex: 1, minWidth: 120 },
    { field: 'status', headerName: 'Status', width: 120 },
    {
      field: 'createdAt',
      headerName: 'Created Date',
      width: 130,
      valueFormatter: (value) => formatDate(value as string),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 160,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton size="small" title="View details" onClick={() => handleViewDetails(params.row)}>
            <Visibility fontSize="small" />
          </IconButton>
          <IconButton size="small" title="Edit" onClick={() => handleEditOpen(params.row)}>
            <Edit fontSize="small" />
          </IconButton>
          <IconButton size="small" title="Disable" onClick={() => handleDisableClick(params.row)} color="error">
            <Block fontSize="small" />
          </IconButton>
          <IconButton size="small" title="Delete" onClick={() => handleDeleteClick(params.row)} color="error">
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Client Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage all clients and their accounts
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreateOpen}>
          Create Client
        </Button>
      </Box>

      <Paper sx={{ overflow: 'hidden', height: 500 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : (
          <DataGrid
            rows={clients}
            columns={columns}
            getRowId={(row) => row.id}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            sx={{ border: 0 }}
          />
        )}
      </Paper>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Client</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Client Name"
            fullWidth
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Industry"
            fullWidth
            value={form.industry}
            onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Template Version"
            fullWidth
            value={form.templateVersion}
            onChange={(e) => setForm((f) => ({ ...f, templateVersion: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateSubmit} variant="contained" disabled={formLoading}>
            {formLoading ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Client</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Client Name"
            fullWidth
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Industry"
            fullWidth
            value={form.industry}
            onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Template Version"
            fullWidth
            value={form.templateVersion}
            onChange={(e) => setForm((f) => ({ ...f, templateVersion: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSubmit} variant="contained" disabled={formLoading}>
            {formLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={disableConfirmOpen} onClose={() => setDisableConfirmOpen(false)}>
        <DialogTitle>Disable Client</DialogTitle>
        <DialogContent>
          Are you sure you want to disable {selectedClient?.name}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisableConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDisableConfirm} color="error" variant="contained" disabled={formLoading}>
            {formLoading ? 'Disabling...' : 'Disable'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Client</DialogTitle>
        <DialogContent>
          Are you sure you want to delete {selectedClient?.name}? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={formLoading}>
            {formLoading ? 'Deleting...' : 'Delete'}
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
