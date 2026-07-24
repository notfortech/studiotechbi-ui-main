import { useEffect, useState } from "react";
import {
  Box,
  Drawer,
  Stack,
  Typography,
  IconButton,
  Skeleton,
  Alert,
  Chip,
  CircularProgress,
  alpha,
} from "@mui/material";
import { AutoAwesome as AiModeIcon, Close as CloseIcon } from "@mui/icons-material";
import { NAVY, BRASS } from "../../theme";

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

interface ThreadEntry {
  question: string;
  loading: boolean;
  answer?: string;
  error?: string;
}

export function AiSummaryPanel({
  open, onClose, loading, summary, error, title = "AI Summary", onAskFollowUp,
}: {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  summary: AiSummary | null;
  error: string | null;
  title?: string;
  /** When provided, "You might also ask" chips become clickable — asks that specific question
   * (still grounded on the same real data) and renders the answer inline as a small, growing
   * Q&A thread. No free-text box needed; the model's own suggested questions are the input. */
  onAskFollowUp?: (question: string) => Promise<AiSummary>;
}) {
  const [thread, setThread] = useState<ThreadEntry[]>([]);

  // A new base summary (new report/blueprint, or a regenerate) starts a fresh thread — answers
  // grounded in the previous data no longer apply.
  useEffect(() => {
    setThread([]);
  }, [summary]);

  const handleAskFollowUp = async (question: string) => {
    if (!onAskFollowUp || thread.some((t) => t.question === question)) return;
    setThread((prev) => [...prev, { question, loading: true }]);
    try {
      const result = await onAskFollowUp(question);
      const answer = result.enabled
        ? result.summary || "The AI didn't return an answer for this question."
        : result.message ?? "AI is not enabled for this client.";
      setThread((prev) => prev.map((t) => (t.question === question ? { ...t, loading: false, answer } : t)));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to get an answer.";
      setThread((prev) => prev.map((t) => (t.question === question ? { ...t, loading: false, error: message } : t)));
    }
  };

  const white = "#FFFFFF";

  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Box
        sx={{
          width: { xs: "100vw", sm: 420 },
          minHeight: "100%",
          p: 3,
          bgcolor: NAVY[800],
          color: white,
        }}
        role="presentation"
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <AiModeIcon sx={{ color: BRASS[400] }} />
            <Typography variant="h6" fontWeight={700} sx={{ color: white }}>{title}</Typography>
          </Stack>
          <IconButton onClick={onClose} size="small" aria-label={`Close ${title.toLowerCase()}`} sx={{ color: alpha(white, 0.7) }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        {loading && (
          <Stack spacing={1.5}>
            <Skeleton variant="text" height={24} sx={{ bgcolor: alpha(white, 0.08) }} />
            <Skeleton variant="text" height={24} sx={{ bgcolor: alpha(white, 0.08) }} />
            <Skeleton variant="text" height={24} width="80%" sx={{ bgcolor: alpha(white, 0.08) }} />
          </Stack>
        )}

        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && summary && !summary.enabled && (
          <Alert severity="info">{summary.message ?? "AI is not enabled for this client."}</Alert>
        )}

        {!loading && !error && summary?.enabled && (
          <Stack spacing={2.5}>
            {summary.summary && (
              <Typography variant="body2" sx={{ lineHeight: 1.6, color: white }}>{summary.summary}</Typography>
            )}
            {summary.insights && summary.insights.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: white }}>Key Insights</Typography>
                <Stack spacing={1}>
                  {summary.insights.map((insight, i) => (
                    <Typography key={i} variant="body2" sx={{ lineHeight: 1.5, color: alpha(white, 0.78) }}>
                      • {insight}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}
            {summary.followUps && summary.followUps.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: white }}>
                  You might also ask{onAskFollowUp ? " — click to ask" : ""}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {summary.followUps.map((q, i) => {
                    const asked = thread.find((t) => t.question === q);
                    return (
                      <Chip
                        key={i}
                        label={q}
                        size="small"
                        variant="outlined"
                        clickable={!!onAskFollowUp && !asked}
                        onClick={onAskFollowUp && !asked ? () => handleAskFollowUp(q) : undefined}
                        icon={asked?.loading ? <CircularProgress size={12} sx={{ color: alpha(white, 0.7) }} /> : undefined}
                        sx={{
                          color: white,
                          borderColor: alpha(white, 0.4),
                          bgcolor: asked ? alpha(BRASS[400], 0.16) : "transparent",
                          "& .MuiChip-label": { color: white },
                          "& .MuiChip-icon": { ml: 1 },
                          "&:hover": onAskFollowUp && !asked ? { bgcolor: alpha(white, 0.1) } : undefined,
                        }}
                      />
                    );
                  })}
                </Stack>
              </Box>
            )}

            {thread.length > 0 && (
              <Stack spacing={2} sx={{ pt: 1, borderTop: "1px solid", borderColor: alpha(white, 0.15) }}>
                {thread.map((t, i) => (
                  <Box key={i} sx={{ pt: 2 }}>
                    <Typography variant="body2" fontWeight={700} sx={{ color: BRASS[300], mb: 0.5 }}>
                      {t.question}
                    </Typography>
                    {t.loading && (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CircularProgress size={14} sx={{ color: alpha(white, 0.6) }} />
                        <Typography variant="caption" sx={{ color: alpha(white, 0.6) }}>Thinking…</Typography>
                      </Stack>
                    )}
                    {!t.loading && t.error && (
                      <Typography variant="body2" sx={{ color: "#FFB4A9" }}>{t.error}</Typography>
                    )}
                    {!t.loading && !t.error && t.answer && (
                      <Typography variant="body2" sx={{ lineHeight: 1.5, color: alpha(white, 0.85) }}>
                        {t.answer}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            )}

            {summary.provider && (
              <Typography variant="caption" sx={{ color: alpha(white, 0.55) }}>Powered by {summary.provider}</Typography>
            )}
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}
