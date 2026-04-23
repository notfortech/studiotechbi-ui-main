import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { AiPanel } from '../components/AiPanel';
import { DataPreview } from '../components/DataPreview';
import { StepsPane } from '../components/StepsPane';
import { useModelingStudio } from '../hooks/useModelingStudio';

export function ModelingStudioPage() {
  const studio = useModelingStudio();
  const [showAfter, setShowAfter] = useState(false);

  const isRel = studio.selection?.kind === 'relationship';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)', minHeight: 0 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 2, flexShrink: 0 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Data modeling
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Guided steps — preview first, then approve. Nothing changes in your model until you confirm.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button variant="outlined" size="small" disabled={studio.persisting} onClick={() => void studio.updatePreview()}>
            Refresh preview
          </Button>
          <Button variant="outlined" size="small" disabled={studio.persisting} onClick={() => void studio.persistToBackend()}>
            {studio.persisting ? <CircularProgress size={18} /> : 'Save progress'}
          </Button>
          <Button variant="contained" size="small" disabled={studio.persisting} onClick={() => void studio.generateReport()}>
            Generate report
          </Button>
        </Stack>
      </Stack>

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="col-span-12 min-h-0 md:col-span-3">
          <StepsPane
            steps={studio.steps}
            relationships={studio.relationships}
            selection={studio.selection}
            onSelectStep={(id) => {
              setShowAfter(false);
              studio.selectStep(id);
            }}
            onSelectRelationship={(id) => {
              setShowAfter(false);
              studio.selectRelationship(id);
            }}
            onApproveStep={studio.approveStep}
            onRejectStep={studio.rejectStep}
            onApproveRelationship={studio.approveRelationship}
            onRejectRelationship={studio.rejectRelationship}
            disabled={studio.persisting}
          />
        </div>
        <div className="col-span-12 min-h-0 border-y border-slate-200 md:col-span-6 md:border-x md:border-y-0">
          <DataPreview
            previewBefore={studio.previewBefore}
            previewAfter={studio.previewAfter}
            highlightColumns={studio.highlightColumns}
            showAfter={showAfter}
            onShowAfterChange={setShowAfter}
            isRelationshipContext={isRel}
          />
        </div>
        <div className="col-span-12 min-h-0 md:col-span-3">
          <AiPanel step={studio.selectedStep} relationship={studio.selectedRelationship} />
        </div>
      </div>
    </Box>
  );
}

export default ModelingStudioPage;
