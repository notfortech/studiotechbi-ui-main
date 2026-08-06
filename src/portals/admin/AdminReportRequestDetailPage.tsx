import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Stack,
  Chip,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  CheckCircleOutline as FulfillIcon,
  CloudUploadOutlined as ExportIcon,
} from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getReportRequest,
  fulfillReportRequest,
  exportReportRequestToBlob,
  type CustomReportRequestDetail,
} from '../../api/adminReportRequestsApi';
import { ROUTES } from '../../core/constants';

const formatDate = (d?: string | null) => (d ? new Date(d).toLocaleString() : '—');

export const AdminReportRequestDetailPage = () => {
  const navigate = useNavigate();
  const { requestId } = useParams<{ requestId: string }>();
  const [detail, setDetail] = useState<CustomReportRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [powerBiAssetId, setPowerBiAssetId] = useState('');
  const [fulfilling, setFulfilling] = useState(false);
  const [fulfillError, setFulfillError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const load = async () => {
    if (!requestId) return;
    try {
      setLoading(true);
      const result = await getReportRequest(requestId);
      setDetail(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report request.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const handleFulfill = async () => {
    if (!requestId || !powerBiAssetId.trim()) return;
    setFulfilling(true);
    setFulfillError(null);
    try {
      await fulfillReportRequest(requestId, powerBiAssetId.trim());
      await load();
    } catch (err) {
      setFulfillError(err instanceof Error ? err.message : 'Failed to mark this request fulfilled.');
    } finally {
      setFulfilling(false);
    }
  };

  const handleExportToBlob = async () => {
    if (!requestId) return;
    setExporting(true);
    setExportError(null);
    try {
      await exportReportRequestToBlob(requestId);
      await load();
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Failed to export this request to blob storage.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate(ROUTES.ADMIN.REPORT_REQUESTS)}>
          Report Requests
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : detail ? (
        <Stack spacing={3}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
              <Typography variant="h5" fontWeight={700}>Request Details</Typography>
              <Chip
                label={detail.status}
                size="small"
                color={detail.status === 'Fulfilled' ? 'success' : detail.status === 'Declined' ? 'error' : 'default'}
              />
              <Chip
                label={detail.requestReason === 'GenerationError' ? 'AI/Network Error' : 'No Confident Match'}
                size="small"
                variant="outlined"
                color={detail.requestReason === 'GenerationError' ? 'error' : 'default'}
              />
            </Stack>
            {detail.requestReason === 'GenerationError' && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                This ticket was filed because the AI/network call itself failed, not because
                nothing matched confidently. Check whether it was a one-off (ask the client to
                retry) or a systemic outage before treating it as template-building work.
              </Alert>
            )}
            <Stack direction="row" spacing={4} flexWrap="wrap" gap={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">Requested By</Typography>
                <Typography variant="body2">{detail.requestedByEmail ?? '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Source File</Typography>
                <Typography variant="body2">{detail.sourceFileName ?? '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Requested</Typography>
                <Typography variant="body2">{formatDate(detail.createdAt)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Fulfilled</Typography>
                <Typography variant="body2">{formatDate(detail.fulfilledAtUtc)} {detail.fulfilledByEmail ? `by ${detail.fulfilledByEmail}` : ''}</Typography>
              </Box>
            </Stack>
            {detail.notes && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">Notes</Typography>
                <Typography variant="body2">{detail.notes}</Typography>
              </Box>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5} sx={{ mb: 1 }}>
              <Typography variant="h6" fontWeight={700}>Client Schema</Typography>
              {detail.schema && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <ExportIcon />}
                  disabled={exporting}
                  onClick={() => void handleExportToBlob()}
                >
                  {exporting ? "Exporting…" : detail.exportedToBlobAtUtc ? "Re-export to Blob" : "Export to Blob"}
                </Button>
              )}
            </Stack>
            {exportError && <Alert severity="error" sx={{ mb: 2 }}>{exportError}</Alert>}
            {detail.exportedToBlobAtUtc && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Exported {formatDate(detail.exportedToBlobAtUtc)} — <code>{detail.blobPath}</code>
              </Alert>
            )}
            {detail.schema ? (
              <Stack spacing={2}>
                {detail.schema.tables.map((table) => (
                  <Box key={table.tableName}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {table.tableName} ({table.rowCount} rows)
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Column</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Nullable</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {table.columns.map((col) => (
                          <TableRow key={col.columnName}>
                            <TableCell>{col.columnName}</TableCell>
                            <TableCell>{col.dataType}</TableCell>
                            <TableCell>{col.isNullable ? 'Yes' : 'No'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">No schema snapshot available.</Typography>
            )}
          </Paper>

          {detail.status !== 'Fulfilled' && (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>Fulfill Request</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Build the report using the existing Power BI tooling, then paste the resulting
                PowerBiAsset ID here to mark this request fulfilled — it will appear in the
                client's Saved Reports.
              </Typography>
              {fulfillError && <Alert severity="error" sx={{ mb: 2 }}>{fulfillError}</Alert>}
              <Stack direction="row" spacing={1.5} alignItems="center">
                <TextField
                  size="small"
                  label="Power BI Asset ID"
                  value={powerBiAssetId}
                  onChange={(e) => setPowerBiAssetId(e.target.value)}
                  sx={{ minWidth: 340 }}
                />
                <Button
                  variant="contained"
                  startIcon={fulfilling ? <CircularProgress size={16} color="inherit" /> : <FulfillIcon />}
                  disabled={fulfilling || !powerBiAssetId.trim()}
                  onClick={() => void handleFulfill()}
                >
                  {fulfilling ? "Fulfilling…" : "Mark Fulfilled"}
                </Button>
              </Stack>
            </Paper>
          )}

          {detail.status === 'Fulfilled' && detail.fulfilledSavedReportId && (
            <Alert severity="success">
              Fulfilled — linked Saved Report {detail.fulfilledSavedReportId}.
            </Alert>
          )}
        </Stack>
      ) : (
        <Alert severity="warning">Report request not found.</Alert>
      )}
    </Box>
  );
};
