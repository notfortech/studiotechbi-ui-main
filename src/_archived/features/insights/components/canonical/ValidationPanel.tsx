import { Alert, Box, Collapse, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import type { CanonicalValidationResult } from '../../types';

export function ValidationPanel({ validation }: { validation: CanonicalValidationResult | undefined }) {
  const [showWarnings, setShowWarnings] = useState(false);
  if (!validation) return null;

  return (
    <Box sx={{ mb: 2 }}>
      {!validation.isValid && validation.errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={800}>
            Validation failed
          </Typography>
          <Stack component="ul" sx={{ m: 0, pl: 2 }}>
            {validation.errors.map((e) => (
              <Typography key={e} component="li" variant="body2">
                {e}
              </Typography>
            ))}
          </Stack>
        </Alert>
      )}

      {validation.warnings.length > 0 && (
        <Alert
          severity="warning"
          onClick={() => setShowWarnings((v) => !v)}
          sx={{ cursor: 'pointer' }}
        >
          <Typography variant="subtitle2" fontWeight={800}>
            Warnings ({validation.warnings.length}) — {showWarnings ? 'hide' : 'show'}
          </Typography>
          <Collapse in={showWarnings}>
            <Stack component="ul" sx={{ m: 0, pl: 2, mt: 1 }}>
              {validation.warnings.map((w) => (
                <Typography key={w} component="li" variant="body2">
                  {w}
                </Typography>
              ))}
            </Stack>
          </Collapse>
        </Alert>
      )}
    </Box>
  );
}

