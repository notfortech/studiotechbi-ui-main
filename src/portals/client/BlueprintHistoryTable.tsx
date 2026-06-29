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
} from "@mui/material";
import { Download as DownloadIcon } from "@mui/icons-material";
import { useState } from "react";
import { downloadBlueprintPdf, type BlueprintHistoryItem } from "../../api/blueprintApi";

interface Props {
  history: BlueprintHistoryItem[];
}

type ChipColor = "success" | "warning" | "error" | "default";

const STATUS_COLOR: Record<string, ChipColor> = {
  Completed: "success",
  PartiallyValid: "warning",
  Failed: "error",
};

export function BlueprintHistoryTable({ history }: Props) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (item: BlueprintHistoryItem) => {
    if (!item.pdfDownloadUrl) return;
    setDownloading(item.requestId);
    try {
      const url = await downloadBlueprintPdf(item.requestId);
      const a = document.createElement("a");
      a.href = url;
      a.download = `blueprint-${item.requestId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
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
              <TableCell>Requirement</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Credits used</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map((item) => (
              <TableRow key={item.requestId} hover>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  {new Date(item.createdAtUtc).toLocaleDateString("en-AU")}
                </TableCell>
                <TableCell
                  sx={{ maxWidth: 360 }}
                  title={item.businessRequirement}
                >
                  <Typography variant="body2" noWrap>
                    {item.businessRequirement.length > 80
                      ? item.businessRequirement.slice(0, 80) + "…"
                      : item.businessRequirement}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={item.status}
                    size="small"
                    color={STATUS_COLOR[item.status] ?? "default"}
                  />
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">
                    {item.creditsConsumed ?? "—"}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {item.pdfDownloadUrl && (
                    <Button
                      size="small"
                      startIcon={<DownloadIcon />}
                      disabled={downloading === item.requestId}
                      onClick={() => handleDownload(item)}
                    >
                      {downloading === item.requestId ? "Downloading…" : "Download PDF"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
