import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Stack,
} from "@mui/material";
import {
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  PictureAsPdf as PdfIcon,
} from "@mui/icons-material";
import { useEffect, useState } from "react";
import { downloadBlueprintPdf } from "../../api/blueprintApi";

interface Props {
  requestId: string;
  pdfDownloadUrl: string;
  warnings: string[];
  onClose: () => void;
}

type DownloadState = "downloading" | "ready" | "error";

export function BlueprintPdfPopup({ requestId, warnings, onClose }: Props) {
  const [state, setState] = useState<DownloadState>("downloading");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    downloadBlueprintPdf(requestId)
      .then((objectUrl) => {
        url = objectUrl;
        setBlobUrl(objectUrl);
        setState("ready");
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `blueprint-${requestId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      })
      .catch(() => setState("error"));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [requestId]);

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Blueprint Ready</DialogTitle>
      <DialogContent>
        <Stack alignItems="center" spacing={2} sx={{ py: 2 }}>
          {state === "downloading" && (
            <>
              <CircularProgress size={48} />
              <Typography variant="h6">Your blueprint is ready!</Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Your PDF is downloading automatically…
              </Typography>
            </>
          )}

          {state === "ready" && (
            <>
              <Box sx={{ color: "success.main" }}>
                <CheckIcon sx={{ fontSize: 48 }} />
              </Box>
              <Typography variant="h6">Blueprint downloaded</Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Your PDF has been saved to your downloads folder.
              </Typography>
              {blobUrl && (
                <Button
                  variant="outlined"
                  startIcon={<PdfIcon />}
                  href={blobUrl}
                  download={`blueprint-${requestId}.pdf`}
                  component="a"
                >
                  Download again
                </Button>
              )}
            </>
          )}

          {state === "error" && (
            <>
              <Box sx={{ color: "warning.main" }}>
                <WarningIcon sx={{ fontSize: 48 }} />
              </Box>
              <Typography variant="h6">Blueprint generated</Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Your blueprint was created but the PDF could not be downloaded automatically.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<PdfIcon />}
                href={`/api/blueprint/${requestId}/pdf`}
                target="_blank"
                rel="noreferrer"
                component="a"
              >
                Download PDF
              </Button>
            </>
          )}
        </Stack>

        {warnings.length > 0 && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
              Notes
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {warnings.map((w, i) => (
                <li key={i}>
                  <Typography variant="caption">{w}</Typography>
                </li>
              ))}
            </ul>
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
