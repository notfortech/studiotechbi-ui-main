import { Box, LinearProgress, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";

type Props = {
  /** When true, value creeps slowly toward ~92%; when false, completes to 100% then hides. */
  active: boolean;
};

/**
 * Small determinate-style progress inside the report panel (unknown duration → slow crawl + % label).
 */
export function ReportAreaProgressBar({ active }: Props) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (active) {
      setValue(0);
      const id = window.setInterval(() => {
        setValue((v) => {
          if (v >= 88) return Math.min(92, v + 0.35);
          if (v >= 55) return v + 0.65;
          if (v >= 25) return v + 1.1;
          return v + 2;
        });
      }, 300);
      return () => window.clearInterval(id);
    }

    setValue((v) => (v > 0 && v < 100 ? 100 : v));
    const t = window.setTimeout(() => setValue(0), 480);
    return () => window.clearTimeout(t);
  }, [active]);

  const visible = active || value > 0;
  const barValue = active ? Math.min(value, 92) : value;
  const label = Math.round(barValue);

  if (!visible) return null;

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 320,
        mb: 1.5,
        alignSelf: "flex-start",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <LinearProgress
          variant="determinate"
          value={barValue}
          aria-valuenow={label}
          aria-valuemin={0}
          aria-valuemax={100}
          sx={{
            flex: 1,
            height: 6,
            borderRadius: 1,
            bgcolor: "action.hover",
            "& .MuiLinearProgress-bar": {
              borderRadius: 1,
              transition: "transform 0.35s ease-out",
            },
          }}
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ minWidth: 38, textAlign: "right", fontVariantNumeric: "tabular-nums" }}
        >
          {label}%
        </Typography>
      </Stack>
    </Box>
  );
}
