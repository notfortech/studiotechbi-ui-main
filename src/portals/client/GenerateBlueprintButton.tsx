import { Button } from "@mui/material";
import { AutoAwesome as BlueprintIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { ROUTES } from "../../core/constants";

interface GenerateBlueprintButtonProps {
  clientCode: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

/**
 * Shortcut button in the Reports list header that navigates to the Blueprint page.
 * Only renders when hasBlueprints is true (controlled by TEMP_FORCE_BLUEPRINTS_FOR_ALL).
 */
export const GenerateBlueprintButton = (_: GenerateBlueprintButtonProps) => {
  const { hasBlueprints } = useAuth();
  const navigate = useNavigate();

  if (!hasBlueprints) return null;

  return (
    <Button
      variant="outlined"
      startIcon={<BlueprintIcon />}
      onClick={() => navigate(ROUTES.CLIENT.BLUEPRINT)}
      size="small"
    >
      Generate Blueprint
    </Button>
  );
};
