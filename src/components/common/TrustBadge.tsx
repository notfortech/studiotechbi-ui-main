import { Chip, Tooltip } from "@mui/material";
import {
  AutoAwesome as AiIcon,
  VerifiedUser as DeterministicIcon,
  Person as AnalystIcon,
} from "@mui/icons-material";

// Global component G-6 (Client Portal Feature Map): a single consistent way
// to tell the client whether AI touched what they're looking at. AI is used
// ONLY for schema comparison, template matching, and design-time blueprint
// generation — once real data is connected in Report Generator, processing
// is 100% deterministic Python/.NET. This badge is how that distinction
// stays visible wherever it matters, instead of living only in body text.

export type TrustBadgeKind = "ai" | "deterministic" | "analyst";

interface TrustBadgeConfig {
  label: string;
  color: string;
  bg: string;
  icon: JSX.Element;
  tooltip: string;
}

const CONFIG: Record<TrustBadgeKind, TrustBadgeConfig> = {
  ai: {
    label: "AI-assisted",
    color: "#6B5CE7",
    bg: "#EFEDFC",
    icon: <AiIcon sx={{ fontSize: 14 }} />,
    tooltip:
      "AI is used here only for schema comparison, template matching, and design-time suggestions — it never touches your actual data values.",
  },
  deterministic: {
    label: "Deterministic — no AI",
    color: "#1668A0",
    bg: "#E4F0F9",
    icon: <DeterministicIcon sx={{ fontSize: 14 }} />,
    tooltip:
      "Every value here is computed by a deterministic engine directly from your data. No AI model ever sees or processes your actual figures.",
  },
  analyst: {
    label: "Analyst-built",
    color: "#B15C33",
    bg: "#FBEBE2",
    icon: <AnalystIcon sx={{ fontSize: 14 }} />,
    tooltip: "Built by a human analyst on your accounting team, not generated automatically.",
  },
};

export function TrustBadge({
  kind,
  size = "small",
}: {
  kind: TrustBadgeKind;
  size?: "small" | "medium";
}) {
  const cfg = CONFIG[kind];
  return (
    <Tooltip title={cfg.tooltip} arrow>
      <Chip
        icon={cfg.icon}
        label={cfg.label}
        size={size}
        sx={{
          bgcolor: cfg.bg,
          color: cfg.color,
          fontWeight: 700,
          fontSize: 11.5,
          "& .MuiChip-icon": { color: cfg.color },
        }}
      />
    </Tooltip>
  );
}
