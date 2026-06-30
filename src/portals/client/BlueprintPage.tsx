import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  Collapse,
  Chip,
  LinearProgress,
} from "@mui/material";
import {
  AutoAwesome as BlueprintIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import { useState, useEffect, useCallback } from "react";
import {
  generateBlueprint,
  listBlueprints,
  type BlueprintDto,
} from "../../api/blueprintApi";
import { useBlueprintGeneration } from "../../hooks/useBlueprintGeneration";
import { BlueprintHistoryTable } from "./BlueprintHistoryTable";
import { useAuth } from "../../auth/AuthContext";
import { useClientView } from "../../layouts/client/ClientViewContext";
import { canSelectReportClient } from "../../core/reportClientAccess";

// ── Generation status chip ──────────────────────────────────────────────────

type JobStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed';

const JOB_STATUS_COLOR: Record<JobStatus, 'warning' | 'info' | 'success' | 'error'> = {
  Pending: 'warning',
  Processing: 'info',
  Completed: 'success',
  Failed: 'error',
};

// ── Page ────────────────────────────────────────────────────────────────────

export function BlueprintPage() {
  const { user } = useAuth();
  const { selectedClientCode } = useClientView();

  const isAccountantMode = user?.role === "client" && canSelectReportClient(user);
  const clientId = isAccountantMode ? (selectedClientCode ?? "") : (user?.clientCode ?? "");
  const tenantId = user?.id ?? "";
  // clientId and tenantId are resolved from the JWT on the backend;
  // only used here for the listBlueprints query, not sent in the generate payload.

  const [businessCapability, setBusinessCapability] = useState("");
  const [businessGoal, setBusinessGoal] = useState("");
  const [businessRequirements, setBusinessRequirements] = useState("");
  const [industry, setIndustry] = useState("");
  const [knowledgePack, setKnowledgePack] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blueprints, setBlueprints] = useState<BlueprintDto[]>([]);
  const [activeGenerationId, setActiveGenerationId] = useState<string | undefined>();

  const { job, isPolling, timedOut } = useBlueprintGeneration(activeGenerationId);

  const loadBlueprints = useCallback(async () => {
    if (!tenantId) return;
    try {
      const list = await listBlueprints(tenantId, clientId || undefined);
      setBlueprints(list);
    } catch {
      // non-fatal
    }
  }, [tenantId, clientId]);

  useEffect(() => {
    loadBlueprints();
  }, [loadBlueprints]);

  // When generation completes or fails, reload the list and clear the job
  useEffect(() => {
    if (!job) return;
    if (job.status === 'Completed' || job.status === 'Failed') {
      setActiveGenerationId(undefined);
      if (job.status === 'Completed') {
        loadBlueprints();
      }
    }
  }, [job?.status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    setLoading(true);
    try {
      const result = await generateBlueprint({
        industry: industry.trim(),
        businessCapability: businessCapability.trim(),
        businessGoal: businessGoal.trim(),
        businessRequirements: businessRequirements.trim() || undefined,
        knowledgePack: knowledgePack.trim() || undefined,
      });

      // Start polling the generation job
      setActiveGenerationId(result.generationId);

      // Clear form
      setBusinessCapability("");
      setBusinessGoal("");
      setBusinessRequirements("");
      setIndustry("");
      setKnowledgePack("");
      setShowAdvanced(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    !loading &&
    !isPolling &&
    businessCapability.trim().length > 0 &&
    businessGoal.trim().length >= 20 &&
    industry.trim().length > 0;

  const jobStatus = job?.status as JobStatus | undefined;

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
              Describe your business requirements and we'll generate a tailored data blueprint PDF.
            </Typography>
          </Box>
        </Stack>

        {/* Generation status panel */}
        {(activeGenerationId || timedOut) && (
          <Box
            sx={{
              mb: 3,
              p: 2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            {timedOut ? (
              <Alert severity="warning">
                Generation is taking longer than expected. Refresh the page to check for updates.
              </Alert>
            ) : (
              <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <BlueprintIcon fontSize="small" color="primary" />
                  <Typography variant="body2" fontWeight={600}>
                    Blueprint Generation
                  </Typography>
                  {jobStatus && (
                    <Chip
                      label={jobStatus}
                      size="small"
                      color={JOB_STATUS_COLOR[jobStatus]}
                    />
                  )}
                  {job?.confidenceScore != null && (
                    <Typography variant="body2" color="text.secondary">
                      Confidence: {Math.round(job.confidenceScore * 100)}%
                    </Typography>
                  )}
                </Stack>

                {isPolling && (
                  <LinearProgress sx={{ borderRadius: 1 }} />
                )}

                {job?.status === 'Completed' && (
                  <Alert severity="success" sx={{ mt: 0.5 }}>
                    Blueprint generated successfully. The PDF is now available in the table below.
                  </Alert>
                )}

                {job?.status === 'Failed' && (
                  <Alert severity="error" sx={{ mt: 0.5 }}>
                    {job.errorMessage ?? "Blueprint generation failed. Please try again."}
                  </Alert>
                )}

                {(job?.warnings?.length ?? 0) > 0 && (
                  <Alert severity="warning" icon={false} sx={{ mt: 0.5 }}>
                    <Typography variant="caption" fontWeight={600} display="block">
                      Warnings
                    </Typography>
                    <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                      {job!.warnings!.map((w, i) => (
                        <li key={i}>
                          <Typography variant="caption">{w}</Typography>
                        </li>
                      ))}
                    </ul>
                  </Alert>
                )}
              </Stack>
            )}
          </Box>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              label="Industry"
              required
              fullWidth
              placeholder="e.g. NDIS / Disability Services"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              disabled={loading}
            />

            <TextField
              label="Business Capability"
              required
              fullWidth
              placeholder="e.g. NDIS Plan Utilization and Budget Burn-Rate Reporting"
              value={businessCapability}
              onChange={(e) => setBusinessCapability(e.target.value)}
              disabled={loading}
              helperText="The specific reporting or analytics capability this blueprint should address."
            />

            <TextField
              label="Business Goal"
              required
              fullWidth
              multiline
              rows={10}
              placeholder="e.g. An NDIS Plan Utilization and Budget Burn-Rate Report is a critical financial tool for Australian NDIS providers to track how fast participants spend their funding allocations. It automatically compares a participant's actual year-to-date spending against their ideal target budget across specific support categories, like Core and Capacity Building. By highlighting variances, the report flags under-utilization before plans expire and over-utilization early on, giving support coordinators and finance teams the real-time visibility needed to adjust service hours and protect provider revenue."
              value={businessGoal}
              onChange={(e) => setBusinessGoal(e.target.value)}
              disabled={loading}
              helperText={`${businessGoal.length} characters (minimum 20) — describe in detail what insights this blueprint must deliver.`}
              error={businessGoal.length > 0 && businessGoal.trim().length < 20}
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
                Advanced options (optional)
              </Button>

              <Collapse in={showAdvanced}>
                <Stack spacing={2} sx={{ mt: 2 }}>
                  <TextField
                    label="Business Requirements"
                    fullWidth
                    multiline
                    rows={4}
                    placeholder="List any specific data, filters, KPIs, or constraints the report must include..."
                    value={businessRequirements}
                    onChange={(e) => setBusinessRequirements(e.target.value)}
                    disabled={loading}
                  />
                  <TextField
                    label="Knowledge Pack"
                    fullWidth
                    placeholder="e.g. NDIS pricing arrangements, SCHADS award, SIL/SDA definitions"
                    value={knowledgePack}
                    onChange={(e) => setKnowledgePack(e.target.value)}
                    disabled={loading}
                    helperText="Domain-specific terminology or context that should inform the blueprint."
                  />
                </Stack>
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
                sx={{ minWidth: 220 }}
              >
                {loading ? "Submitting…" : isPolling ? "Generating…" : "Generate Blueprint"}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>

      {blueprints.length > 0 && <BlueprintHistoryTable blueprints={blueprints} />}
    </Box>
  );
}
