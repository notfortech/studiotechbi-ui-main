import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  Collapse,
} from "@mui/material";
import {
  AutoAwesome as BlueprintIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import { useState, useEffect } from "react";
import {
  generateBlueprint,
  getBlueprintCredits,
  getBlueprintHistory,
  BlueprintCreditsError,
  type BlueprintCredits,
  type BlueprintHistoryItem,
} from "../../api/blueprintApi";
import { BlueprintCreditsBar } from "./BlueprintCreditsBar";
import { BlueprintPdfPopup } from "./BlueprintPdfPopup";
import { BlueprintHistoryTable } from "./BlueprintHistoryTable";
import { useAuth } from "../../auth/AuthContext";
import { useClientView } from "../../layouts/client/ClientViewContext";
import { canSelectReportClient } from "../../core/reportClientAccess";

export function BlueprintPage() {
  const { user } = useAuth();
  const { selectedClientCode } = useClientView();

  const isAccountantMode = user?.role === "client" && canSelectReportClient(user);
  const clientCode = isAccountantMode ? selectedClientCode : (user?.clientCode ?? undefined);
  const useSelectedClient = isAccountantMode && !!selectedClientCode;

  const [requirement, setRequirement] = useState("");
  const [industry, setIndustry] = useState("");
  const [schema, setSchema] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState<BlueprintCredits | null>(null);
  const [history, setHistory] = useState<BlueprintHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creditsExhausted, setCreditsExhausted] = useState(false);
  const [popup, setPopup] = useState<{
    requestId: string;
    pdfDownloadUrl: string;
    warnings: string[];
  } | null>(null);

  useEffect(() => {
    loadCreditsAndHistory();
  }, [clientCode, useSelectedClient]);

  async function loadCreditsAndHistory() {
    try {
      const [c, h] = await Promise.all([
        getBlueprintCredits(clientCode, useSelectedClient),
        getBlueprintHistory(clientCode, useSelectedClient),
      ]);
      setCredits(c);
      setHistory(h);
    } catch {
      // non-fatal — credits bar simply won't render
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreditsExhausted(false);

    if (requirement.trim().length < 20) {
      setError("Please describe your requirement in at least 20 characters.");
      return;
    }

    setLoading(true);
    try {
      const result = await generateBlueprint({
        businessRequirement: requirement.trim(),
        industry: industry.trim() || undefined,
        existingSchema: schema.trim() || null,
        clientCode,
        useSelectedClient,
      });

      setPopup({
        requestId: result.requestId,
        pdfDownloadUrl: result.pdfDownloadUrl,
        warnings: result.warnings,
      });

      // Refresh credits and history after generation
      await loadCreditsAndHistory();
    } catch (err) {
      if (err instanceof BlueprintCreditsError) {
        setCreditsExhausted(true);
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const creditsLeft = credits?.creditsRemaining ?? null;
  const canSubmit =
    requirement.trim().length >= 20 &&
    !loading &&
    (creditsLeft === null || creditsLeft > 0);

  const resetDateLabel =
    credits?.resetDate
      ? new Date(credits.resetDate).toLocaleDateString("en-AU", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
          <BlueprintIcon color="primary" />
          <Box>
            <Typography variant="h5" fontWeight={600}>
              Generate Blueprint
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Describe your business requirements and we'll generate a tailored data blueprint.
            </Typography>
          </Box>
        </Stack>

        <BlueprintCreditsBar credits={credits} />

        {creditsExhausted && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            You've used all your blueprint credits.
            {resetDateLabel && (
              <>
                {" "}They reset on <strong>{resetDateLabel}</strong>.
              </>
            )}
            {" "}Contact <a href="mailto:support@studiotechbi.com">support@studiotechbi.com</a> to
            upgrade your plan.
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              id="requirement"
              label="What do you need your dashboards to achieve?"
              required
              fullWidth
              multiline
              rows={10}
              placeholder="e.g. An NDIS Plan Utilization and Budget Burn-Rate Report is a critical financial tool for Australian NDIS providers to track how fast participants spend their funding allocations. It automatically compares a participant's actual year-to-date spending against their ideal target budget across specific support categories, like Core and Capacity Building. By highlighting variances, the report flags under-utilization before plans expire and over-utilization early on, giving support coordinators and finance teams the real-time visibility needed to adjust service hours and protect provider revenue."
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              disabled={loading}
              helperText={`${requirement.length} characters (minimum 20)`}
              error={requirement.length > 0 && requirement.trim().length < 20}
            />

            <TextField
              id="industry"
              label="Industry"
              fullWidth
              placeholder="e.g. Property Management"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              disabled={loading}
            />

            <Box>
              <Button
                type="button"
                variant="text"
                size="small"
                startIcon={showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => setShowAdvanced((v) => !v)}
                sx={{ color: "text.secondary", px: 0 }}
              >
                Advanced — paste existing data schema (optional)
              </Button>

              <Collapse in={showAdvanced}>
                <TextField
                  id="schema"
                  label="Existing Schema (JSON)"
                  fullWidth
                  multiline
                  rows={6}
                  placeholder='{ "tables": [...], "columns": [...] }'
                  value={schema}
                  onChange={(e) => setSchema(e.target.value)}
                  disabled={loading}
                  helperText="Describe column names and types only — do not include actual data values."
                  sx={{ mt: 2 }}
                />
              </Collapse>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            <Box>
              <Button
                type="submit"
                variant="contained"
                size="large"
                startIcon={<BlueprintIcon />}
                disabled={!canSubmit}
                sx={{ minWidth: 200 }}
              >
                {loading ? "Generating…" : "Generate Blueprint"}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>

      {history.length > 0 && <BlueprintHistoryTable history={history} />}

      {popup && (
        <BlueprintPdfPopup
          requestId={popup.requestId}
          pdfDownloadUrl={popup.pdfDownloadUrl}
          warnings={popup.warnings}
          onClose={() => setPopup(null)}
        />
      )}
    </Box>
  );
}
