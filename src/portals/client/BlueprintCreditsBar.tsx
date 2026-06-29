import { Box, LinearProgress, Typography, Stack, Chip } from "@mui/material";
import type { BlueprintCredits } from "../../api/blueprintApi";

interface Props {
  credits: BlueprintCredits | null;
}

export function BlueprintCreditsBar({ credits }: Props) {
  if (!credits || credits.creditsRemaining === null) return null;

  const total = (credits.creditsRemaining ?? 0) + (credits.creditsConsumed ?? 0);
  const pct = total > 0 ? Math.round((credits.creditsRemaining / total) * 100) : 0;
  const resetLabel = credits.resetDate
    ? new Date(credits.resetDate).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;
  const isLow = credits.creditsRemaining !== null && credits.creditsRemaining <= 1;
  const isExhausted = credits.creditsRemaining === 0;

  return (
    <Box
      sx={{
        p: 2,
        border: "1px solid",
        borderColor: isLow ? "warning.main" : "divider",
        borderRadius: 1,
        backgroundColor: isLow ? "warning.50" : "background.paper",
        mb: 3,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2" fontWeight={600}>
            {isExhausted ? (
              <span style={{ color: "var(--mui-palette-error-main, #d32f2f)" }}>
                Credits exhausted
              </span>
            ) : (
              <>
                <strong>{credits.creditsRemaining}</strong> blueprint credit
                {credits.creditsRemaining === 1 ? "" : "s"} remaining
              </>
            )}
          </Typography>
          {credits.subscriptionPlan && (
            <Chip label={credits.subscriptionPlan} size="small" variant="outlined" />
          )}
        </Stack>
        {resetLabel && (
          <Typography variant="caption" color="text.secondary">
            Resets {resetLabel}
          </Typography>
        )}
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={isExhausted ? "error" : isLow ? "warning" : "primary"}
        sx={{ borderRadius: 1, height: 6 }}
      />
    </Box>
  );
}
