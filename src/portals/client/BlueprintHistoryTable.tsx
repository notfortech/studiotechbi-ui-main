import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Typography,
  Box,
  Stack,
} from "@mui/material";
import {
  Download as DownloadIcon,
  DataObject as JsonIcon,
  AutoAwesome as AiAssistantIcon,
} from "@mui/icons-material";
import { useState } from "react";
import {
  downloadBlueprintPdf,
  downloadBlueprintJson,
  getBlueprintAiSummary,
  type BlueprintDto,
} from "../../api/blueprintApi";
import { AiSummaryPanel, type AiSummary } from "../../components/common/AiSummaryPanel";

interface Props {
  blueprints: BlueprintDto[];
}

type ChipColor = "info" | "default";

const BLUEPRINT_STATUS_COLOR: Record<string, ChipColor> = {
  Active: "info",
  Archived: "default",
};

export function BlueprintHistoryTable({ blueprints }: Props) {
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [downloadingJson, setDownloadingJson] = useState<string | null>(null);

  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [aiSummaries, setAiSummaries] = useState<Record<string, AiSummary>>({});
  const [aiError, setAiError] = useState<string | null>(null);
  const [activeAiBlueprintId, setActiveAiBlueprintId] = useState<string | null>(null);

  const handleAskAi = async (blueprint: BlueprintDto) => {
    setActiveAiBlueprintId(blueprint.id);
    setAiPanelOpen(true);
    setAiError(null);
    if (aiSummaries[blueprint.id]) return; // already fetched — don't re-call
    setAiLoadingId(blueprint.id);
    try {
      const result = await getBlueprintAiSummary(blueprint.id);
      setAiSummaries((prev) => ({ ...prev, [blueprint.id]: result }));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to generate AI summary.");
    } finally {
      setAiLoadingId(null);
    }
  };

  const handlePdfDownload = async (blueprint: BlueprintDto) => {
    setDownloadingPdf(blueprint.id);
    try {
      await downloadBlueprintPdf(blueprint.id);
    } catch {
      // user will see browser error; no crash
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleJsonDownload = async (blueprint: BlueprintDto) => {
    setDownloadingJson(blueprint.id);
    try {
      const json = await downloadBlueprintJson(blueprint.id);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `blueprint-${blueprint.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // non-fatal
    } finally {
      setDownloadingJson(null);
    }
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Previous Blueprints
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Industry</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Versions</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {blueprints.map((bp) => (
              <TableRow key={bp.id} hover>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  {new Date(bp.createdAt).toLocaleDateString("en-AU")}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{bp.industry || "—"}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={bp.status}
                    size="small"
                    color={BLUEPRINT_STATUS_COLOR[bp.status] ?? "default"}
                  />
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">{bp.versionCount}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    {bp.activeVersion?.hasJson && (
                      <Button
                        size="small"
                        startIcon={<AiAssistantIcon />}
                        disabled={aiLoadingId === bp.id}
                        onClick={() => handleAskAi(bp)}
                      >
                        {aiLoadingId === bp.id ? "…" : "Ask AI Assistant"}
                      </Button>
                    )}
                    {bp.activeVersion?.hasJson && (
                      <Button
                        size="small"
                        startIcon={<JsonIcon />}
                        disabled={downloadingJson === bp.id}
                        onClick={() => handleJsonDownload(bp)}
                      >
                        {downloadingJson === bp.id ? "…" : "JSON"}
                      </Button>
                    )}
                    {bp.activeVersion?.hasPdf && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        disabled={downloadingPdf === bp.id}
                        onClick={() => handlePdfDownload(bp)}
                      >
                        {downloadingPdf === bp.id ? "Downloading…" : "PDF"}
                      </Button>
                    )}
                    {!bp.activeVersion?.hasPdf && !bp.activeVersion?.hasJson && (
                      <Typography variant="caption" color="text.disabled">
                        {bp.versionCount === 0 ? "Processing…" : "No output"}
                      </Typography>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <AiSummaryPanel
        open={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        loading={aiLoadingId === activeAiBlueprintId && aiLoadingId !== null}
        summary={activeAiBlueprintId ? aiSummaries[activeAiBlueprintId] ?? null : null}
        error={aiError}
        title="AI Assistant"
      />
    </Box>
  );
}
