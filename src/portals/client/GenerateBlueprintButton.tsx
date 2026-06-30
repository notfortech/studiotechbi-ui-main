import { Button, Stack, Chip, Typography, Link } from "@mui/material";
import { AutoAwesome as BlueprintIcon } from "@mui/icons-material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import {
  getBlueprintUsageThisMonth,
  getNextResetDate,
} from "../../services/blueprintService";
import { BLUEPRINT_MONTHLY_LIMIT, BLUEPRINT_MONTHLY_CREDITS, ROUTES } from "../../core/constants";

interface GenerateBlueprintButtonProps {
  clientCode: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export const GenerateBlueprintButton = ({ clientCode }: GenerateBlueprintButtonProps) => {
  const { hasBlueprints } = useAuth();
  const navigate = useNavigate();
  const [usedThisMonth] = useState(() =>
    clientCode ? getBlueprintUsageThisMonth(clientCode) : 0
  );

  if (!hasBlueprints) return null;

  const remaining = Math.max(0, BLUEPRINT_MONTHLY_LIMIT - usedThisMonth);
  const chipColor = remaining === 0 ? "error" : remaining === 1 ? "warning" : "success";
  const creditsLabel =
    BLUEPRINT_MONTHLY_CREDITS >= 1_000_000
      ? `${BLUEPRINT_MONTHLY_CREDITS / 1_000_000}M credits/mo`
      : `${BLUEPRINT_MONTHLY_CREDITS.toLocaleString()} credits/mo`;

  return (
    <Stack alignItems="flex-end" spacing={0.5}>
      <Button
        variant="outlined"
        startIcon={<BlueprintIcon />}
        onClick={() => navigate(ROUTES.CLIENT.BLUEPRINT)}
        size="small"
      >
        Generate Blueprint
      </Button>

      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="caption" color="text.secondary">
          {creditsLabel}
        </Typography>
        <Chip
          label={`${remaining} of ${BLUEPRINT_MONTHLY_LIMIT} remaining`}
          color={chipColor}
          size="small"
          variant="outlined"
        />
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="caption" color="text.secondary">
          Resets {getNextResetDate()}
        </Typography>
        {remaining === 0 && (
          <Link
            href="mailto:support@studiotechbi.com"
            variant="caption"
            sx={{ cursor: "pointer" }}
          >
            Upgrade for unlimited →
          </Link>
        )}
      </Stack>
    </Stack>
  );
};
