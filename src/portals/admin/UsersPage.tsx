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
  MenuItem,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  Switch,
} from '@mui/material';
import { Add, Edit, Block, CheckCircle, Search, ManageAccounts } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  setAdminUserActive,
  setAdminUserRoles,
  ADMIN_USER_TYPE,
  type AdminUserDto,
  type AdminUserCreateDto,
  type AdminUserUpdateDto,
} from '../../services/adminUserService';
import { getTenants, type TenantDto } from '../../services/tenantService';
import { getClients, type Client } from '../../services/clientService';

/** Role IDs from backend; if you have GET /admin/roles use that instead */
const ROLE_OPTIONS = [
  { id: 'admin', label: 'Admin' },
  { id: 'superadmin', label: 'Super Admin' },
  { id: 'operationsadmin', label: 'Operations Admin' },
  { id: 'supportadmin', label: 'Support Admin' },
];

export const UsersPage = () => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [items, setItems] = useState<AdminUserDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [tenants, setTenants] = useState<TenantDto[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserDto | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [createForm, setCreateForm] = useState<AdminUserCreateDto & { passwordConfirm: string }>({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    passwordConfirm: '',
    userType: ADMIN_USER_TYPE.general,
    clientId: '',
    tenantId: undefined,
    roleIds: [],
  });
  const [editForm, setEditForm] = useState<AdminUserUpdateDto>({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    userType: ADMIN_USER_TYPE.general,
    tenantId: '',
    clientId: '',
  });
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await getAdminUsers({ page: page + 1, pageSize, search: search || undefined });
      setItems(res.items);
      setTotalCount(res.totalCount);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load users', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, pageSize, search]);

  useEffect(() => {
    (async () => {
      try {
        const [tRes, cRes] = await Promise.all([getTenants({ pageSize: 100 }), getClients()]);
        setTenants(tRes.items);
        setClients(Array.isArray(cRes) ? cRes : []);
      } catch {
        // optional
      }
    })();
  }, []);

  const handleSearch = () => setSearch(searchInput.trim());

  const handleCreateOpen = () => {
    setCreateForm({
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      passwordConfirm: '',
      userType: ADMIN_USER_TYPE.general,
      clientId: '',
      tenantId: undefined,
      roleIds: [],
    });
    setCreateOpen(true);
  };

  const handleCreateSubmit = async () => {
    if (!createForm.email?.trim() || !createForm.firstName?.trim() || !createForm.lastName?.trim() || !createForm.password) {
      setSnackbar({ open: true, message: 'Email, first name, last name and password are required', severity: 'error' });
      return;
    }
    if (createForm.password !== createForm.passwordConfirm) {
      setSnackbar({ open: true, message: 'Passwords do not match', severity: 'error' });
      return;
    }
    if (createForm.userType === ADMIN_USER_TYPE.accountant && !createForm.clientId?.trim()) {
      setSnackbar({ open: true, message: 'Client is required for accountant users', severity: 'error' });
      return;
    }
    try {
      setFormLoading(true);
      await createAdminUser({
        email: createForm.email.trim(),
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        password: createForm.password,
        userType: createForm.userType ?? ADMIN_USER_TYPE.general,
        tenantId: createForm.tenantId || undefined,
        clientId:
          createForm.userType === ADMIN_USER_TYPE.accountant ? createForm.clientId?.trim() : undefined,
        roleIds: createForm.roleIds?.length ? createForm.roleIds : undefined,
      });
      setCreateOpen(false);
      await loadUsers();
      setSnackbar({ open: true, message: 'User created successfully', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to create user', severity: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditOpen = (user: AdminUserDto) => {
    setSelectedUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber ?? '',
      userType: user.userType ?? ADMIN_USER_TYPE.general,
      tenantId: user.tenantId ?? '',
      clientId: user.clientId ?? '',
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedUser) return;
    if (editForm.userType === ADMIN_USER_TYPE.accountant && !editForm.clientId?.trim()) {
      setSnackbar({ open: true, message: 'Client is required for accountant users', severity: 'error' });
      return;
    }
    try {
      setFormLoading(true);
      await updateAdminUser(selectedUser.id, {
        firstName: editForm.firstName?.trim(),
        lastName: editForm.lastName?.trim(),
        phoneNumber: editForm.phoneNumber?.trim() || undefined,
        userType: editForm.userType ?? ADMIN_USER_TYPE.general,
        tenantId: editForm.tenantId || undefined,
        clientId:
          editForm.userType === ADMIN_USER_TYPE.accountant
            ? editForm.clientId?.trim() || undefined
            : null,
      });
      setEditOpen(false);
      setSelectedUser(null);
      await loadUsers();
      setSnackbar({ open: true, message: 'User updated successfully', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to update user', severity: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleRolesOpen = (user: AdminUserDto) => {
    setSelectedUser(user);
    setSelectedRoleIds(user.roles?.length ? [...user.roles] : []);
    setRolesOpen(true);
  };

  const handleRolesSubmit = async () => {
    if (!selectedUser) return;
    try {
      setFormLoading(true);
      await setAdminUserRoles(selectedUser.id, selectedRoleIds);
      setRolesOpen(false);
      setSelectedUser(null);
      await loadUsers();
      setSnackbar({ open: true, message: 'Roles updated', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to update roles', severity: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDisableClick = (user: AdminUserDto) => {
    setSelectedUser(user);
    setDisableOpen(true);
  };

  const handleDisableConfirm = async () => {
    if (!selectedUser) return;
    const newActive = !selectedUser.isActive;
    try {
      setFormLoading(true);
      await setAdminUserActive(selectedUser.id, newActive);
      setDisableOpen(false);
      setSelectedUser(null);
      await loadUsers();
      setSnackbar({ open: true, message: `User ${newActive ? 'enabled' : 'disabled'}`, severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to update status', severity: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleString() : '—');

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            User Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage users, roles and permissions
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreateOpen}>
          Create User
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search users..."
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
                    <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #eee' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #eee' }}>Email</th>
                    <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #eee' }}>Role</th>
                    <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #eee' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #eee' }}>Tenant</th>
                    <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #eee' }}>Last Login</th>
                    <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #eee' }}>Status</th>
                    <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid #eee' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#666' }}>
                        No users found
                      </td>
                    </tr>
                  ) : (
                    items.map((u) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: 12 }}>{[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}</td>
                        <td style={{ padding: 12 }}>{u.email}</td>
                        <td style={{ padding: 12 }}>{u.roles?.join(', ') || '—'}</td>
                        <td style={{ padding: 12 }}>
                          {(u.userType ?? ADMIN_USER_TYPE.general) === ADMIN_USER_TYPE.accountant
                            ? 'Accountant'
                            : 'General client'}
                        </td>
                        <td style={{ padding: 12 }}>{u.tenantId ? tenants.find((t) => t.id === u.tenantId)?.name ?? u.tenantId : '—'}</td>
                        <td style={{ padding: 12 }}>{formatDate(u.lastLoginAt)}</td>
                        <td style={{ padding: 12 }}>
                          <Chip label={u.isActive ? 'Active' : 'Disabled'} size="small" color={u.isActive ? 'success' : 'default'} />
                        </td>
                        <td style={{ padding: 12, textAlign: 'right' }}>
                          <IconButton size="small" title="Edit" onClick={() => handleEditOpen(u)}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" title="Assign roles" onClick={() => handleRolesOpen(u)}>
                            <ManageAccounts fontSize="small" />
                          </IconButton>
                          <IconButton size="small" title={u.isActive ? 'Disable' : 'Enable'} onClick={() => handleDisableClick(u)}>
                            {u.isActive ? <Block fontSize="small" color="error" /> : <CheckCircle fontSize="small" color="success" />}
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
              count={totalCount}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 20, 50]}
            />
          </>
        )}
      </Paper>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create User</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            required
            value={createForm.email}
            onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
          />
          <TextField margin="dense" label="First name" fullWidth required value={createForm.firstName} onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))} />
          <TextField margin="dense" label="Last name" fullWidth required value={createForm.lastName} onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))} />
          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            required
            value={createForm.password}
            onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Confirm password"
            type="password"
            fullWidth
            required
            value={createForm.passwordConfirm}
            onChange={(e) => setCreateForm((f) => ({ ...f, passwordConfirm: e.target.value }))}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Tenant</InputLabel>
            <Select
              value={createForm.tenantId ?? ''}
              label="Tenant"
              onChange={(e) => setCreateForm((f) => ({ ...f, tenantId: e.target.value || undefined }))}
            >
              <MenuItem value="">—</MenuItem>
              {tenants.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            sx={{ mt: 1, display: 'block' }}
            control={
              <Switch
                checked={(createForm.userType ?? ADMIN_USER_TYPE.general) === ADMIN_USER_TYPE.accountant}
                onChange={(_, checked) =>
                  setCreateForm((f) => ({
                    ...f,
                    userType: checked ? ADMIN_USER_TYPE.accountant : ADMIN_USER_TYPE.general,
                    clientId: checked ? f.clientId : '',
                  }))
                }
              />
            }
            label="Accountant user"
          />
          {(createForm.userType ?? ADMIN_USER_TYPE.general) === ADMIN_USER_TYPE.accountant && (
            <FormControl fullWidth margin="dense">
              <InputLabel>Client</InputLabel>
              <Select
                value={createForm.clientId ?? ''}
                label="Client"
                required
                onChange={(e) => setCreateForm((f) => ({ ...f, clientId: e.target.value }))}
              >
                <MenuItem value="">—</MenuItem>
                {clients.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.clientCode ? `${c.name} (${c.clientCode})` : c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <FormControl fullWidth margin="dense">
            <InputLabel>Roles</InputLabel>
            <Select
              multiple
              value={createForm.roleIds ?? []}
              label="Roles"
              onChange={(e) => setCreateForm((f) => ({ ...f, roleIds: e.target.value as string[] }))}
              renderValue={(v) => v.map((id) => ROLE_OPTIONS.find((r) => r.id === id)?.label ?? id).join(', ')}
            >
              {ROLE_OPTIONS.map((r) => (
                <MenuItem key={r.id} value={r.id}>{r.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateSubmit} variant="contained" disabled={formLoading}>
            {formLoading ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <TextField margin="dense" label="First name" fullWidth value={editForm.firstName} onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))} />
          <TextField margin="dense" label="Last name" fullWidth value={editForm.lastName} onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))} />
          <TextField margin="dense" label="Phone" fullWidth value={editForm.phoneNumber} onChange={(e) => setEditForm((f) => ({ ...f, phoneNumber: e.target.value }))} />
          <FormControl fullWidth margin="dense">
            <InputLabel>Tenant</InputLabel>
            <Select value={editForm.tenantId ?? ''} label="Tenant" onChange={(e) => setEditForm((f) => ({ ...f, tenantId: e.target.value }))}>
              <MenuItem value="">—</MenuItem>
              {tenants.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            sx={{ mt: 1, display: 'block' }}
            control={
              <Switch
                checked={(editForm.userType ?? ADMIN_USER_TYPE.general) === ADMIN_USER_TYPE.accountant}
                onChange={(_, checked) =>
                  setEditForm((f) => ({
                    ...f,
                    userType: checked ? ADMIN_USER_TYPE.accountant : ADMIN_USER_TYPE.general,
                    clientId: checked ? f.clientId : '',
                  }))
                }
              />
            }
            label="Accountant user"
          />
          {(editForm.userType ?? ADMIN_USER_TYPE.general) === ADMIN_USER_TYPE.accountant && (
            <FormControl fullWidth margin="dense">
              <InputLabel>Client</InputLabel>
              <Select
                value={editForm.clientId ?? ''}
                label="Client"
                required
                onChange={(e) => setEditForm((f) => ({ ...f, clientId: e.target.value }))}
              >
                <MenuItem value="">—</MenuItem>
                {clients.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.clientCode ? `${c.name} (${c.clientCode})` : c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSubmit} variant="contained" disabled={formLoading}>
            {formLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rolesOpen} onClose={() => setRolesOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Assign roles — {selectedUser?.email}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>Roles</InputLabel>
            <Select
              multiple
              value={selectedRoleIds}
              label="Roles"
              onChange={(e) => setSelectedRoleIds(e.target.value as string[])}
              renderValue={(v) => v.map((id) => ROLE_OPTIONS.find((r) => r.id === id)?.label ?? id).join(', ')}
            >
              {ROLE_OPTIONS.map((r) => (
                <MenuItem key={r.id} value={r.id}>{r.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRolesOpen(false)}>Cancel</Button>
          <Button onClick={handleRolesSubmit} variant="contained" disabled={formLoading}>
            {formLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={disableOpen} onClose={() => setDisableOpen(false)}>
        <DialogTitle>{selectedUser?.isActive ? 'Disable User' : 'Enable User'}</DialogTitle>
        <DialogContent>
          Are you sure you want to {selectedUser?.isActive ? 'disable' : 'enable'} {selectedUser?.email}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisableOpen(false)}>Cancel</Button>
          <Button onClick={handleDisableConfirm} color={selectedUser?.isActive ? 'error' : 'primary'} variant="contained" disabled={formLoading}>
            {formLoading ? 'Updating...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
