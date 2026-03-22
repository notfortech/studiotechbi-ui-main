import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
  TablePagination,
  Chip,
} from '@mui/material';
import { Add, Edit, Block, CheckCircle, Search } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import {
  getTenants,
  createTenant,
  updateTenant,
  setTenantStatus,
  type TenantDto,
  type TenantCreateDto,
  type TenantUpdateDto,
} from '../../services/tenantService';

export const TenantsPage = () => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [result, setResult] = useState<{ items: TenantDto[]; totalCount: number; totalPages: number }>({
    items: [],
    totalCount: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantDto | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [createForm, setCreateForm] = useState<TenantCreateDto>({ name: '', code: '', industry: '', country: '' });
  const [editForm, setEditForm] = useState<TenantUpdateDto>({ name: '', industry: '', country: '' });

  const loadTenants = async () => {
    try {
      setLoading(true);
      const res = await getTenants({ page: page + 1, pageSize, search: search || undefined });
      setResult({
        items: res.items,
        totalCount: res.totalCount,
        totalPages: res.totalPages,
      });
    } catch {
      setSnackbar({ open: true, message: 'Failed to load tenants', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, [page, pageSize, search]);

  const handleSearch = () => setSearch(searchInput.trim());

  const handleCreateOpen = () => {
    setCreateForm({ name: '', code: '', industry: '', country: '' });
    setCreateOpen(true);
  };

  const handleCreateSubmit = async () => {
    if (!createForm.name?.trim() || !createForm.code?.trim()) {
      setSnackbar({ open: true, message: 'Name and code are required', severity: 'error' });
      return;
    }
    try {
      setFormLoading(true);
      await createTenant({
        name: createForm.name.trim(),
        code: createForm.code.trim(),
        industry: createForm.industry?.trim() || undefined,
        country: createForm.country?.trim() || undefined,
      });
      setCreateOpen(false);
      await loadTenants();
      setSnackbar({ open: true, message: 'Tenant created successfully', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to create tenant', severity: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditOpen = (tenant: TenantDto) => {
    setSelectedTenant(tenant);
    setEditForm({ name: tenant.name, industry: tenant.industry ?? '', country: tenant.country ?? '' });
    setEditOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedTenant) return;
    try {
      setFormLoading(true);
      await updateTenant(selectedTenant.id, {
        name: editForm.name?.trim(),
        industry: editForm.industry?.trim() || undefined,
        country: editForm.country?.trim() || undefined,
      });
      setEditOpen(false);
      setSelectedTenant(null);
      await loadTenants();
      setSnackbar({ open: true, message: 'Tenant updated successfully', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to update tenant', severity: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusClick = (tenant: TenantDto) => {
    setSelectedTenant(tenant);
    setStatusOpen(true);
  };

  const handleStatusConfirm = async () => {
    if (!selectedTenant) return;
    const newActive = !selectedTenant.isActive;
    try {
      setFormLoading(true);
      await setTenantStatus(selectedTenant.id, newActive);
      setStatusOpen(false);
      setSelectedTenant(null);
      await loadTenants();
      setSnackbar({ open: true, message: `Tenant ${newActive ? 'activated' : 'deactivated'}`, severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to update status', severity: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : '—');

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Tenant Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create and manage tenants
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreateOpen}>
          Create Tenant
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search tenants..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          sx={{ minWidth: 220 }}
        />
        <Button variant="outlined" startIcon={<Search />} onClick={handleSearch}>
          Search
        </Button>
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box sx={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #eee' }}>Tenant Name</th>
                    <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #eee' }}>Industry</th>
                    <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #eee' }}>Country</th>
                    <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #eee' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #eee' }}>Created Date</th>
                    <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid #eee' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#666' }}>
                        No tenants found
                      </td>
                    </tr>
                  ) : (
                    result.items.map((t) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: 12 }}>{t.name}</td>
                        <td style={{ padding: 12 }}>{t.industry ?? '—'}</td>
                        <td style={{ padding: 12 }}>{t.country ?? '—'}</td>
                        <td style={{ padding: 12 }}>
                          <Chip
                            label={t.isActive ? 'Active' : 'Inactive'}
                            size="small"
                            color={t.isActive ? 'success' : 'default'}
                          />
                        </td>
                        <td style={{ padding: 12 }}>{formatDate(t.createdAt)}</td>
                        <td style={{ padding: 12, textAlign: 'right' }}>
                          <IconButton size="small" title="Edit" onClick={() => handleEditOpen(t)}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            title={t.isActive ? 'Deactivate' : 'Activate'}
                            onClick={() => handleStatusClick(t)}
                          >
                            {t.isActive ? <Block fontSize="small" color="error" /> : <CheckCircle fontSize="small" color="success" />}
                          </IconButton>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Box>
            <TablePagination
              component="div"
              count={result.totalCount}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 20, 50, 100]}
            />
          </>
        )}
      </Paper>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Tenant</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            required
            value={createForm.name}
            onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Code"
            fullWidth
            required
            value={createForm.code}
            onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Industry"
            fullWidth
            value={createForm.industry}
            onChange={(e) => setCreateForm((f) => ({ ...f, industry: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Country"
            fullWidth
            value={createForm.country}
            onChange={(e) => setCreateForm((f) => ({ ...f, country: e.target.value }))}
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
        <DialogTitle>Edit Tenant</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            required
            value={editForm.name}
            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Industry"
            fullWidth
            value={editForm.industry}
            onChange={(e) => setEditForm((f) => ({ ...f, industry: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Country"
            fullWidth
            value={editForm.country}
            onChange={(e) => setEditForm((f) => ({ ...f, country: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSubmit} variant="contained" disabled={formLoading}>
            {formLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={statusOpen} onClose={() => setStatusOpen(false)}>
        <DialogTitle>{selectedTenant?.isActive ? 'Deactivate Tenant' : 'Activate Tenant'}</DialogTitle>
        <DialogContent>
          Are you sure you want to {selectedTenant?.isActive ? 'deactivate' : 'activate'} {selectedTenant?.name}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusOpen(false)}>Cancel</Button>
          <Button onClick={handleStatusConfirm} color={selectedTenant?.isActive ? 'error' : 'primary'} variant="contained" disabled={formLoading}>
            {formLoading ? 'Updating...' : 'Confirm'}
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
