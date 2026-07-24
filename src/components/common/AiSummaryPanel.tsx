import {
  Box,
  Drawer,
  Stack,
  Typography,
  IconButton,
  Skeleton,
  Alert,
  Chip,
} from "@mui/material";
import { AutoAwesome as AiModeIcon, Close as CloseIcon } from "@mui/icons-material";

// Shared shape for every "ask AI to explain this" surface in the app (Report Generator's
// deterministic report, Blueprint Generator's blueprint JSON, and any future one) — all proxy to
// the same InsightsEngine client server-side, so they all return this same envelope.
export interface AiSummary {
  enabled: boolean;
  message?: string;
  provider?: string;
  summary?: string;
  insights?: string[];
  followUps?: string[];
}

export function AiSummaryPanel({
  open, onClose, loading, summary, error, title = "AI Summary",
}: {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  summary: AiSummary | null;
  error: string | null;
  title?: string;
}) {
  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: "100vw", sm: 420 }, p: 3 }} role="presentation">
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <AiModeIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>{title}</Typography>
          </Stack>
          <IconButton onClick={onClose} size="small" aria-label={`Close ${title.toLowerCase()}`}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        {loading && (
          <Stack spacing={1.5}>
            <Skeleton variant="text" height={24} />
            <Skeleton variant="text" height={24} />
            <Skeleton variant="text" height={24} width="80%" />
          </Stack>
        )}

        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && summary && !summary.enabled && (
          <Alert severity="info">{summary.message ?? "AI is not enabled for this client."}</Alert>
        )}

        {!loading && !error && summary?.enabled && (
          <Stack spacing={2.5}>
            {summary.summary && (
              <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{summary.summary}</Typography>
            )}
            {summary.insights && summary.insights.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Key Insights</Typography>
                <Stack spacing={1}>
                  {summary.insights.map((insight, i) => (
                    <Typography key={i} variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                      • {insight}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}
            {summary.followUps && summary.followUps.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>You might also ask</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {summary.followUps.map((q, i) => (
                    <Chip key={i} label={q} size="small" variant="outlined" />
                  ))}
                </Stack>
              </Box>
            )}
            {summary.provider && (
              <Typography variant="caption" color="text.secondary">Powered by {summary.provider}</Typography>
            )}
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}
