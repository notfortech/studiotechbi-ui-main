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
  Chip,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import {
  getPendingAliases,
  approveAlias,
  rejectAlias,
  type SchemaModelFieldAlias,
} from '../../services/schemaModelFieldAliasService';

export const SchemaModelFieldAliasesPage = () => {
  const [aliases, setAliases] = useState<SchemaModelFieldAlias[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadAliases = async () => {
    try {
      setLoading(true);
      const list = await getPendingAliases();
      setAliases(list);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load pending aliases', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAliases();
  }, []);

  const handleApprove = async (id: string) => {
    setActioningId(id);
    try {
      await approveAlias(id);
      await loadAliases();
      setSnackbar({ open: true, message: 'Alias approved', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to approve alias', severity: 'error' });
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActioningId(id);
    try {
      await rejectAlias(id);
      await loadAliases();
      setSnackbar({ open: true, message: 'Alias rejected', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to reject alias', severity: 'error' });
    } finally {
      setActioningId(null);
    }
  };

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleString() : '—');

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Column Aliases
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Column-name synonyms the AI has learned during schema matching (e.g. "Customer No" for
          "CustomerID"). Approving an alias makes it apply automatically, without an AI call, for
          every future client with a similarly-named column — review carefully before approving.
        </Typography>
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
                  <TableCell>Field</TableCell>
                  <TableCell>Model / Industry</TableCell>
                  <TableCell>Alias Name</TableCell>
                  <TableCell>Data Type</TableCell>
                  <TableCell>Confidence</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Observed</TableCell>
                  <TableCell>First / Last Seen</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {aliases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }} color="text.secondary">
                      No aliases pending review
                    </TableCell>
                  </TableRow>
                ) : (
                  aliases.map((alias) => (
                    <TableRow key={alias.id} hover>
                      <TableCell>{alias.fieldName}</TableCell>
                      <TableCell>
                        {alias.schemaModelName}
                        <Typography variant="caption" color="text.secondary" display="block">
                          {alias.industry}
                        </Typography>
                      </TableCell>
                      <TableCell>{alias.aliasName}</TableCell>
                      <TableCell>{alias.observedDataType ?? '—'}</TableCell>
                      <TableCell>{(alias.confidence * 100).toFixed(0)}%</TableCell>
                      <TableCell>
                        <Chip label={alias.source} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{alias.observedCount}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="caption" display="block">
                          {formatDate(alias.firstSeenAt)}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          {formatDate(alias.lastSeenAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          color="success"
                          startIcon={<CheckCircle />}
                          disabled={actioningId === alias.id}
                          onClick={() => handleApprove(alias.id)}
                          sx={{ mr: 1 }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<Cancel />}
                          disabled={actioningId === alias.id}
                          onClick={() => handleReject(alias.id)}
                        >
                          Reject
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
