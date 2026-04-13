import {
  Box,
  Button,
  FormControl,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import type { FileItem } from '../types';
import { getFiles } from '../services/insightService';

interface FileSelectorProps {
  connectionId: string;
  onFileLoaded: (path: string, name: string) => void;
  disabled?: boolean;
}

export function FileSelector({ connectionId, onFileLoaded, disabled }: FileSelectorProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string>('');

  useEffect(() => {
    if (!connectionId) {
      setFiles([]);
      setSelectedPath('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const list = await getFiles(connectionId);
        if (!cancelled) {
          setFiles(list);
          setSelectedPath('');
        }
      } catch {
        if (!cancelled) {
          setError('Could not load files for this connection.');
          setFiles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connectionId]);

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    setSelectedPath(e.target.value);
  };

  const handleConfirm = () => {
    const item = files.find((f) => f.path === selectedPath);
    if (item) onFileLoaded(item.path, item.name);
  };

  if (!connectionId) {
    return (
      <Typography variant="body2" color="text.secondary">
        Choose a connection to browse files.
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Select a file or table
      </Typography>
      {error && (
        <Typography variant="body2" color="error" sx={{ mb: 1 }}>
          {error}
        </Typography>
      )}
      <FormControl fullWidth size="small" sx={{ mb: 2 }} disabled={disabled || loading}>
        <InputLabel id="insights-file-select-label">File</InputLabel>
        <Select
          labelId="insights-file-select-label"
          label="File"
          value={selectedPath}
          onChange={handleSelectChange}
        >
          {files.map((f) => (
            <MenuItem key={f.path} value={f.path}>
              {f.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {files.length > 0 && (
        <List dense disablePadding sx={{ maxHeight: 200, overflow: 'auto', mb: 1 }}>
          {files.slice(0, 50).map((f) => (
            <ListItemButton
              key={f.path}
              selected={selectedPath === f.path}
              onClick={() => setSelectedPath(f.path)}
            >
              <ListItemText primary={f.name} secondary={f.path} />
            </ListItemButton>
          ))}
        </List>
      )}
      <Button
        variant="contained"
        size="small"
        disabled={disabled || loading || !selectedPath}
        onClick={handleConfirm}
      >
        Load from backend
      </Button>
      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
        Data is fetched and stored server-side; nothing is downloaded into the browser.
      </Typography>
    </Box>
  );
}
