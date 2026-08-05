import { Alert, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../core/constants";
import type { CreditBalance } from "../../api/creditsApi";

// Kept in sync with LocalCreditLedgerService.LowBalanceThreshold (koru-main) -- purely a display
// threshold here, the actual gate/admin-notification decision is made server-side.
export const LOW_CREDIT_BALANCE_THRESHOLD = 100;

/** Shown wherever a client is about to (or just did) consume AI credits -- Report Generator's
 * AI-assisted flow and Blueprint's "Ask AI Assistant" both draw from the same balance, so a low
 * balance should be equally hard to miss in either place. */
export function LowCreditsAlert({ balance }: { balance: CreditBalance | null }) {
  const navigate = useNavigate();
  if (!balance || balance.isUnlimited || balance.creditsRemaining === null) return null;
  if (balance.creditsRemaining >= LOW_CREDIT_BALANCE_THRESHOLD) return null;

  return (
    <Alert
      severity="warning"
      sx={{ mb: 3 }}
      action={
        <Button color="inherit" size="small" onClick={() => navigate(ROUTES.CLIENT.PURCHASE_CREDITS)}>
          Buy more credits
        </Button>
      }
    >
      Your AI credits are running low ({balance.creditsRemaining} left) — consider topping up
      before your next AI-assisted action.
    </Alert>
  );
}
