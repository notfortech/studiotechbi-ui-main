import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  LinearProgress,
  Tooltip,
  Box,
  Typography,
} from "@mui/material";
import {
  AutoAwesome as BlueprintIcon,
  PictureAsPdf as PdfIcon,
  DataObject as JsonIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import {
  generateBlueprint,
  downloadBlueprintJson,
  downloadBlueprintPdf,
  type GenerateBlueprintRequest,
} from "../../services/blueprintService";
import { useBlueprintGeneration } from "../../hooks/useBlueprintGeneration";

// ── Generate form dialog ────────────────────────────────────────────────────

interface GenerateDialogProps {
  open: boolean;
  clientCode: string;
  onClose: () => void;
  onStarted: (generationId: string) => void;
  onError: (msg: string) => void;
}

const emptyForm = {
  industry: "",
  businessCapability: "",
  businessGoal: "",
  businessRequirements: "",
  knowledgePack: "",
};

function GenerateDialog({ open, clientCode, onClose, onStarted, onError }: GenerateDialogProps) {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setForm(emptyForm);
    onClose();
  };

  const handleSubmit = async () => {
    if (!form.industry.trim() || !form.businessCapability.trim() || !form.businessGoal.trim()) return;
    try {
      setLoading(true);
      const req: GenerateBlueprintRequest = {
        tenantId: user?.id ?? "",
        clientId: clientCode,
        industry: form.industry.trim(),
        businessCapability: form.businessCapability.trim(),
        businessGoal: form.businessGoal.trim(),
        businessRequirements: form.businessRequirements.trim() || undefined,
        knowledgePack: form.knowledgePack.trim() || undefined,
      };
      const job = await generateBlueprint(req);
      handleClose();
      onStarted(job.generationId);
    } catch {
      onError("Failed to start blueprint generation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const set =
    (field: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const valid =
    form.industry.trim() && form.businessCapability.trim() && form.businessGoal.trim();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Generate Blueprint</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Industry"
            required
            fullWidth
            size="small"
            value={form.industry}
            onChange={set("industry")}
          />
          <TextField
            label="Business Capability"
            required
            fullWidth
            size="small"
            value={form.businessCapability}
            onChange={set("businessCapability")}
          />
          <TextField
            label="Business Goal"
            required
            fullWidth
            size="small"
            multiline
            minRows={2}
            value={form.businessGoal}
            onChange={set("businessGoal")}
          />
          <TextField
            label="Business Requirements"
            fullWidth
            size="small"
            multiline
            minRows={3}
            value={form.businessRequirements}
            onChange={set("businessRequirements")}
          />
          <TextField
            label="Knowledge Pack"
            fullWidth
            size="small"
            value={form.knowledgePack}
            onChange={set("knowledgePack")}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!valid || loading}>
          {loading ? "Starting…" : "Generate"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── JSON viewer dialog ──────────────────────────────────────────────────────

interface JsonViewerDialogProps {
  open: boolean;
  blueprintId: string;
  onClose: () => void;
}

function JsonViewerDialog({ open, blueprintId, onClose }: JsonViewerDialogProps) {
  const [json, setJson] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setJson(null);
        const raw = await downloadBlueprintJson(blueprintId);
        if (!cancelled) {
          try {
            setJson(JSON.stringify(JSON.parse(raw), null, 2));
          } catch {
            setJson(raw);
          }
        }
      } catch {
        if (!cancelled) setJson("// Failed to load JSON");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, blueprintId]);

  const handleCopy = () => {
    if (!json) return;
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    if (!json) return;
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `blueprint-${blueprintId}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Blueprint JSON</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Box
            component="pre"
            sx={{
              fontFamily: "monospace",
              fontSize: 13,
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              backgroundColor: "grey.50",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              p: 2,
              maxHeight: 500,
              overflowY: "auto",
            }}
          >
            {json ?? ""}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button startIcon={<CopyIcon />} onClick={handleCopy} disabled={!json}>
          {copied ? "Copied!" : "Copy"}
        </Button>
        <Button startIcon={<DownloadIcon />} onClick={handleDownload} disabled={!json}>
          Download JSON
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Generation status inline panel ─────────────────────────────────────────

interface StatusPanelProps {
  generationId: string;
  onDismiss: () => void;
}

function statusColor(
  status: string
): "default" | "warning" | "success" | "error" | "info" {
  if (status === "Completed") return "success";
  if (status === "Failed") return "error";
  if (status === "Processing") return "info";
  if (status === "Pending") return "warning";
  return "default";
}

function StatusPanel({ generationId, onDismiss }: StatusPanelProps) {
  const { job, isPolling, timedOut } = useBlueprintGeneration(generationId);
  const [jsonViewOpen, setJsonViewOpen] = useState(false);

  if (timedOut) {
    return (
      <Alert severity="warning" onClose={onDismiss} sx={{ mt: 2 }}>
        Blueprint generation is taking longer than expected. Check back later.
      </Alert>
    );
  }

  const label = job?.status ?? "Pending";
  const completed = job?.status === "Completed";
  const failed = job?.status === "Failed";

  return (
    <Box
      sx={{
        mt: 2,
        p: 2,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        backgroundColor: "background.paper",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
        <BlueprintIcon fontSize="small" color="primary" />
        <Typography variant="body2" fontWeight={600}>
          Blueprint Generation
        </Typography>
        <Chip label={label} color={statusColor(label)} size="small" />
        {isPolling && <CircularProgress size={14} />}
        {job?.confidenceScore != null && (
          <Typography variant="body2" color="text.secondary">
            Confidence: {Math.round(job.confidenceScore * 100)}%
          </Typography>
        )}
        {completed && (
          <>
            <Button
              size="small"
              startIcon={<JsonIcon />}
              onClick={() => setJsonViewOpen(true)}
            >
              View JSON
            </Button>
            <Button
              size="small"
              startIcon={<PdfIcon />}
              onClick={() => downloadBlueprintPdf(job.blueprintId)}
            >
              Download PDF
            </Button>
          </>
        )}
        <Button size="small" color="inherit" onClick={onDismiss} sx={{ ml: "auto" }}>
          Dismiss
        </Button>
      </Stack>

      {isPolling && <LinearProgress sx={{ mt: 1.5, borderRadius: 1 }} />}

      {job?.warnings && job.warnings.length > 0 && (
        <Alert severity="warning" icon={false} sx={{ mt: 1.5 }}>
          <Typography variant="caption" fontWeight={600}>
            Warnings
          </Typography>
          <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
            {job.warnings.map((w, i) => (
              <li key={i}>
                <Typography variant="caption">{w}</Typography>
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {failed && job?.errorMessage && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {job.errorMessage}
        </Alert>
      )}

      {job?.blueprintId && (
        <JsonViewerDialog
          open={jsonViewOpen}
          blueprintId={job.blueprintId}
          onClose={() => setJsonViewOpen(false)}
        />
      )}
    </Box>
  );
}

// ── Public component ────────────────────────────────────────────────────────

interface GenerateBlueprintButtonProps {
  /** The client code (e.g. AU-004) used as the clientId in the blueprint API request. */
  clientCode: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

/**
 * Self-contained "Generate Blueprint" button + form dialog + status panel.
 * Only renders when the logged-in user has `hasBlueprints === true` (plan gate).
 * When the flag is false the button renders as disabled with a tooltip.
 */
export const GenerateBlueprintButton = ({
  clientCode,
  onSuccess,
  onError,
}: GenerateBlueprintButtonProps) => {
  const { hasBlueprints } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeGenerationId, setActiveGenerationId] = useState<string | undefined>(undefined);

  return (
    <>
      <Tooltip
        title={
          hasBlueprints
            ? ""
            : "Blueprint generation is not available on your current plan. Contact support to upgrade."
        }
        disableHoverListener={hasBlueprints}
      >
        <span>
          <Button
            variant="outlined"
            startIcon={<BlueprintIcon />}
            onClick={() => setDialogOpen(true)}
            disabled={!hasBlueprints}
            size="small"
          >
            Generate Blueprint
          </Button>
        </span>
      </Tooltip>

      <GenerateDialog
        open={dialogOpen}
        clientCode={clientCode}
        onClose={() => setDialogOpen(false)}
        onStarted={(genId) => {
          setActiveGenerationId(genId);
          onSuccess?.("Blueprint generation started — we'll let you know when it's ready.");
        }}
        onError={(msg) => onError?.(msg)}
      />

      {activeGenerationId && (
        <StatusPanel
          generationId={activeGenerationId}
          onDismiss={() => setActiveGenerationId(undefined)}
        />
      )}
    </>
  );
};
