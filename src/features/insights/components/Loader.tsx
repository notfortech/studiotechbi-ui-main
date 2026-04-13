import { Alert, Box, LinearProgress, Typography } from '@mui/material';

const DEFAULT_MESSAGES = [
  'Fetching your data...',
  'Analyzing your data...',
  'Setting up your dashboard...',
] as const;

interface LoaderProps {
  message?: string;
  /** When set, rotates or picks by index — here we show the provided message only. */
  messageIndex?: 0 | 1 | 2;
  /** Non-blocking: inline banner style */
  variant?: 'banner' | 'inline';
}

export function Loader({ message, messageIndex = 0, variant = 'banner' }: LoaderProps) {
  const text = message ?? DEFAULT_MESSAGES[messageIndex];

  if (variant === 'inline') {
    return (
      <Box sx={{ py: 1 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {text}
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Alert severity="info" icon={false} sx={{ mb: 2, py: 0 }}>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {text}
      </Typography>
      <LinearProgress />
    </Alert>
  );
}
